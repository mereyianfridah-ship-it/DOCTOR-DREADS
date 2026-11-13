import { Pool, type QueryResult, type Client as PgClient } from "pg";
import { config } from "./config.js";
import { nowIso } from "./lib/util.js";
import { runMigrations } from "./lib/migrator.js";

const pgPoolConfig: any = {
  connectionString: config.databaseUrl,
  ...(config.isProd ? { ssl: { rejectUnauthorized: false } } : {}),
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30_000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 5_000),
};
export const pool = new Pool(pgPoolConfig);

function toPostgresSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function query(client: PgClient | Pool, sql: string, p: any[]): Promise<QueryResult> {
  return client.query(toPostgresSql(sql), p);
}

export const run = async (sql: string, ...p: any[]): Promise<QueryResult> => {
  return query(pool, sql, p);
};

export const get = async <T = Record<string, any>>(sql: string, ...p: any[]): Promise<T | undefined> => {
  const result = await query(pool, sql, p);
  return result.rows[0] as T | undefined;
};

export const all = async <T = Record<string, any>>(sql: string, ...p: any[]): Promise<T[]> => {
  const result = await query(pool, sql, p);
  return result.rows as T[];
};

/** A transaction-scoped query API. Every method executes on the same checked-out client. */
export interface Tx {
  run: (sql: string, ...p: any[]) => Promise<QueryResult>;
  get: <T = Record<string, any>>(sql: string, ...p: any[]) => Promise<T | undefined>;
  all: <T = Record<string, any>>(sql: string, ...p: any[]) => Promise<T[]>;
}

function makeTx(client: PgClient): Tx {
  const run = (sql: string, ...p: any[]): Promise<QueryResult> => query(client, sql, p);
  const get = async <T = Record<string, any>>(sql: string, ...p: any[]): Promise<T | undefined> => {
    const result = await query(client, sql, p);
    return result.rows[0] as T | undefined;
  };
  const all = async <T = Record<string, any>>(sql: string, ...p: any[]): Promise<T[]> => {
    const result = await query(client, sql, p);
    return result.rows as T[];
  };
  return { run, get, all };
}

/**
 * Run `fn` inside a single PostgreSQL transaction. Every query issued through the
 * passed `tx` object (and only those) uses the same checked-out client, so reads
 * see the transaction's uncommitted writes and everything commits or rolls back
 * atomically. The client is always released; on failure the transaction is rolled
 * back before the error is re-thrown.
 */
export async function tx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(makeTx(client));
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* rollback best-effort; the connection is discarded either way */
    }
    throw e;
  } finally {
    client.release();
  }
}

/** Apply pending versioned migrations, then ensure the base schema exists. */
export async function initDb(): Promise<void> {
  await runMigrations();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin','stylist','order-manager','owner')),
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
  id SERIAL PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  service_slug TEXT NOT NULL REFERENCES services(slug),
  location TEXT NOT NULL CHECK (location IN ('salon','mobile')),
  date TEXT NOT NULL, time TEXT NOT NULL, stylist_id TEXT NOT NULL,
  full_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
  deposit_amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_deposit','confirmed','completed','cancelled','expired')),
  expires_at TEXT, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_booking_slot ON bookings(date, time, stylist_id)
  WHERE status IN ('pending_deposit','confirmed');
CREATE INDEX IF NOT EXISTS ix_bookings_user ON bookings(user_id);
CREATE TABLE IF NOT EXISTS consultations (
  id SERIAL PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  full_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
  hair_condition TEXT NOT NULL, hair_length TEXT NOT NULL, loc_size TEXT NOT NULL, install_type TEXT NOT NULL,
  info TEXT NOT NULL DEFAULT '', marketing_consent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','closed')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS consultation_photos (
  id SERIAL PRIMARY KEY,
  consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  filename TEXT NOT NULL, original_name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('delivery','collection')),
  area TEXT, address TEXT,
  subtotal INTEGER NOT NULL, delivery_fee INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa','card')),
  status TEXT NOT NULL CHECK (status IN ('pending_payment','paid','processing','shipped','delivered','cancelled','expired')),
  expires_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_orders_user ON orders(user_id);
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL REFERENCES products(slug),
  name TEXT NOT NULL, unit_price INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('order','booking')),
  target_id INTEGER NOT NULL,
  method TEXT NOT NULL, amount INTEGER NOT NULL, phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','succeeded','failed')),
  checkout_request_id TEXT UNIQUE, merchant_request_id TEXT, receipt TEXT,
  needs_review INTEGER NOT NULL DEFAULT 0, failure_reason TEXT, raw TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL, message TEXT NOT NULL, handled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
`);
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

/** Expire unpaid holds and put reserved stock back, atomically. */
export async function sweepExpired(): Promise<void> {
  const now = nowIso();
  await tx(async (t$) => {
    const expiredOrders = await t$.all<{ id: number }>(
      "SELECT id FROM orders WHERE status='pending_payment' AND expires_at < $1 FOR UPDATE",
      now
    );
    for (const o of expiredOrders) {
      await t$.run("UPDATE orders SET status='expired' WHERE id=$1", o.id);
      await restoreStock(o.id, t$);
    }
    await t$.run(
      "UPDATE bookings SET status='expired' WHERE status='pending_deposit' AND expires_at < $1",
      now
    );
  });
}

/**
 * Put an order's reserved stock back. Must be called inside a transaction using
 * that transaction's query helpers so the stock restore is part of the same atomic unit.
 */
export async function restoreStock(orderId: number, t$: Tx): Promise<void> {
  const items = await t$.all<{ product_slug: string; quantity: number }>(
    "SELECT product_slug, quantity FROM order_items WHERE order_id=$1 FOR UPDATE",
    orderId
  );
  for (const i of items) {
    await t$.run(
      "UPDATE products SET stock = stock + $1 WHERE slug=$2",
      i.quantity, i.product_slug
    );
  }
}

/**
 * Move an order to `cancelled` and put its reserved stock back, exactly once.
 * Must run inside `tx()`, using that transaction's helpers `t$`.
 *
 * The order row is locked (`FOR UPDATE`) and its status re-read inside the
 * transaction, so two concurrent or repeated cancellations are serialised and
 * only the call that actually performs the status transition restores stock.
 * Returns the status the order had before this call (or null if it does not exist);
 * `changed` is false when nothing was done (missing order, or already cancelled).
 */
export async function cancelOrderTx(
  t$: Tx,
  where: { id: number } | { reference: string },
  opts: { allowedFrom?: string[] } = {}
): Promise<{ changed: boolean; previousStatus: string | null }> {
  const row = "id" in where
    ? await t$.get<{ id: number; status: string }>("SELECT id, status FROM orders WHERE id=$1 FOR UPDATE", where.id)
    : await t$.get<{ id: number; status: string }>("SELECT id, status FROM orders WHERE reference=$1 FOR UPDATE", where.reference);
  if (!row) return { changed: false, previousStatus: null };
  if (row.status === "cancelled") return { changed: false, previousStatus: row.status };
  if (opts.allowedFrom && !opts.allowedFrom.includes(row.status)) return { changed: false, previousStatus: row.status };
  await t$.run("UPDATE orders SET status='cancelled' WHERE id=$1", row.id);
  await restoreStock(row.id, t$);
  return { changed: true, previousStatus: row.status };
}

/** Seed demo data if tables are empty. */
export async function seedIfEmpty(): Promise<void> {
  const { seedJson } = await import("./config.js");
  const count = await get<{ n: number }>("SELECT COUNT(*) AS n FROM services");
  if (count!.n > 0) return;
  await tx(async (t$) => {
    for (const [i, s] of seedJson<any[]>("services").entries()) {
      await t$.run(
        `INSERT INTO services (slug,name,category,short_description,description,benefits,image,duration,price_from,booking_type,featured,sort,duration_minutes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        s.slug, s.name, s.category, s.shortDescription, s.description,
        JSON.stringify(s.benefits), s.image, s.duration, s.priceFrom, s.bookingType, s.featured ? 1 : 0, i,
        s.durationMinutes ?? 60
      );
    }
    for (const [i, p] of seedJson<any[]>("products").entries()) {
      await t$.run(
        `INSERT INTO products (slug,name,category,short_description,description,price,stock,images,size,featured,sort,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')`,
        p.slug, p.name, p.category, p.shortDescription, p.description,
        p.price, p.stock, JSON.stringify(p.images), p.size, p.featured ? 1 : 0, i
      );
    }
    for (const [i, g] of seedJson<any[]>("gallery").entries()) {
      await t$.run(
        "INSERT INTO gallery (id,title,category,image,after_image,is_video,sort) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        g.id, g.title, g.category, g.image, g.afterImage ?? null, g.isVideo ? 1 : 0, i
      );
    }
    for (const [i, t] of seedJson<any[]>("testimonials").entries()) {
      await t$.run("INSERT INTO testimonials (id,name,detail,quote,sort) VALUES ($1,$2,$3,$4,$5)", t.id, t.name, t.detail, t.quote, i);
    }
  });
}