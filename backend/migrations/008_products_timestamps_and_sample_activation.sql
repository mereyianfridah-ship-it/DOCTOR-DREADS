-- 008: products get created_at/updated_at, and the seeded SAMPLE products that migration 007
-- silently turned into 'draft' are made visible again.
-- Only rows still 'draft' whose images are the bundled /images/product-*.svg samples are touched;
-- real products an admin created (or deliberately drafted) are left alone.
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

UPDATE products
   SET status = 'active'
 WHERE status = 'draft'
   AND images LIKE '%/images/product-%';
