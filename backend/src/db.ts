import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { config, seedJson } from "./config.js";
import { nowIso } from "./lib/util.js";

if (config.dbPath !== ":memory:") mkdirSync(path.dirname(config.dbPath), { recursive: true });
export const db = new DatabaseSync(config.dbPath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS services (
  slug TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
  short_description TEXT NOT NULL, description TEXT NOT NULL, benefits TEXT NOT NULL,
  image TEXT NOT NULL, duration TEXT NOT NULL, price_from INTEGER,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('instant','consultation')),
  featured INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  slug TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
  short_description TEXT NOT NULL, description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0), stock INTEGER NOT NULL CHECK (stock >= 0),
  images TEXT NOT NULL, size TEXT NOT NULL, featured INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS gallery (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, image TEXT NOT NULL,
  after_image TEXT, is_video INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, detail TEXT NOT NULL, quote TEXT NOT NULL, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  service_slug TEXT NOT NULL REFERENCES services(slug),
  location TEXT NOT NULL CHECK (location IN ('salon','mobile')),
  date TEXT NOT NULL, time TEXT NOT NULL, stylist_id TEXT NOT NULL,
  full_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE, notes TEXT NOT NULL DEFAULT '',
  deposit_amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_deposit','confirmed','completed','cancelled','expired')),
  expires_at TEXT, created_at TEXT NOT NULL
);
-- A stylist can hold only one active booking per slot (enforced by the database, not just app code).
CREATE UNIQUE INDEX IF NOT EXISTS ux_booking_slot ON bookings(date, time, stylist_id)
  WHERE status IN ('pending_deposit','confirmed');
CREATE INDEX IF NOT EXISTS ix_bookings_user ON bookings(user_id);
CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  full_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
  hair_condition TEXT NOT NULL, hair_length TEXT NOT NULL, loc_size TEXT NOT NULL, install_type TEXT NOT NULL,
  info TEXT NOT NULL DEFAULT '', marketing_consent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','closed')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS consultation_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  filename TEXT NOT NULL, original_name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, reference TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE,
  method TEXT NOT NULL CHECK (method IN ('delivery','collection')),
  area TEXT, address TEXT,
  subtotal INTEGER NOT NULL, delivery_fee INTEGER NOT NULL, total INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa','card')),
  status TEXT NOT NULL CHECK (status IN ('pending_payment','paid','processing','shipped','delivered','cancelled','expired')),
  expires_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_orders_user ON orders(user_id);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL REFERENCES products(slug),
  name TEXT NOT NULL, unit_price INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('order','booking')),
  target_id INTEGER NOT NULL,
  method TEXT NOT NULL, amount INTEGER NOT NULL, phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed')),
  checkout_request_id TEXT UNIQUE, merchant_request_id TEXT, receipt TEXT,
  needs_review INTEGER NOT NULL DEFAULT 0, failure_reason TEXT, raw TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL, message TEXT NOT NULL, handled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
`);

type SqlVal = string | number | null;
export const run = (sql: string, ...p: SqlVal[]) => db.prepare(sql).run(...p);
export const get = <T = Record<string, any>>(sql: string, ...p: SqlVal[]) => db.prepare(sql).get(...p) as T | undefined;
export const all = <T = Record<string, any>>(sql: string, ...p: SqlVal[]) => db.prepare(sql).all(...p) as T[];

/** Runs fn inside a write transaction (BEGIN IMMEDIATE serialises concurrent writers). */
export function tx<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

/** Expire unpaid holds and put reserved stock back. Cheap; called before any availability/stock read. */
export function sweepExpired(): void {
  const now = nowIso();
  tx(() => {
    const orders = all<{ id: number }>("SELECT id FROM orders WHERE status='pending_payment' AND expires_at < ?", now);
    for (const o of orders) {
      run("UPDATE orders SET status='expired' WHERE id=?", o.id);
      restoreStock(o.id);
    }
    run("UPDATE bookings SET status='expired' WHERE status='pending_deposit' AND expires_at < ?", now);
  });
}
export function restoreStock(orderId: number): void {
  for (const i of all<{ product_slug: string; quantity: number }>("SELECT product_slug, quantity FROM order_items WHERE order_id=?", orderId))
    run("UPDATE products SET stock = stock + ? WHERE slug=?", i.quantity, i.product_slug);
}

export function seedIfEmpty(): void {
  if (get<{ n: number }>("SELECT COUNT(*) n FROM services")!.n > 0) return;
  tx(() => {
    seedJson<any[]>("services").forEach((s, i) =>
      run("INSERT INTO services VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", s.slug, s.name, s.category, s.shortDescription, s.description,
        JSON.stringify(s.benefits), s.image, s.duration, s.priceFrom, s.bookingType, s.featured ? 1 : 0, i));
    seedJson<any[]>("products").forEach((p, i) =>
      run("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?,?)", p.slug, p.name, p.category, p.shortDescription, p.description,
        p.price, p.stock, JSON.stringify(p.images), p.size, p.featured ? 1 : 0, i));
    seedJson<any[]>("gallery").forEach((g, i) =>
      run("INSERT INTO gallery VALUES (?,?,?,?,?,?,?)", g.id, g.title, g.category, g.image, g.afterImage ?? null, g.isVideo ? 1 : 0, i));
    seedJson<any[]>("testimonials").forEach((t, i) => run("INSERT INTO testimonials VALUES (?,?,?,?,?)", t.id, t.name, t.detail, t.quote, i));
  });
}
seedIfEmpty();
