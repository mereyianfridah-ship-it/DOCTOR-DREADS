-- 007: Add status and low_stock_threshold to products; create categories and stock_movements tables
--
-- Add status and low_stock_threshold columns to products table
ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'active', 'archived'));
ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 5;

-- Create categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create stock_movements table
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id),
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('increase', 'decrease', 'adjustment', 'sale', 'refund')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient stock movement lookups
CREATE INDEX idx_stock_movements_product ON stock_movements(product_slug);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);