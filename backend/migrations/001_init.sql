-- Initial schema. Matches the schema previously created inline by db.ts initDb(),
-- plus the consultations/consultation_photos tables that were missing from it.
-- Safe to run on existing databases: everything is IF NOT EXISTS and additive.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
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

CREATE TABLE IF NOT EXISTS consultations (
  id SERIAL PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  full_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
  hair_condition TEXT NOT NULL, hair_length TEXT NOT NULL, loc_size TEXT NOT NULL,
  install_type TEXT NOT NULL, info TEXT NOT NULL DEFAULT '',
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consultation_photos (
  id SERIAL PRIMARY KEY,
  consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  cloudinary_public_id TEXT
);
