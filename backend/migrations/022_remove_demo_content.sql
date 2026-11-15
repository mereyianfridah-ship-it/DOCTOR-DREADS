-- 022: remove the demonstration content that older seeds created, so production only holds real data.
-- Idempotent and safe on a database that never had the demo rows. Real uploads (Cloudinary URLs) are never touched.

-- Demo gallery items point at bundled /images/*.svg files.
DELETE FROM gallery WHERE image LIKE '/images/%';

-- Demo products: remove the ones nobody ordered; keep (but archive) any that already appear on an order.
UPDATE products p
   SET status = 'archived'
 WHERE p.images LIKE '%/images/product-%'
   AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_slug = p.slug);
DELETE FROM products p
 WHERE p.images LIKE '%/images/product-%'
   AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_slug = p.slug);

-- Services keep their name, text and price, but lose the bundled stand-in picture and the "(placeholder)" tag.
UPDATE services SET image = '' WHERE image LIKE '/images/%';
UPDATE services SET duration = REPLACE(duration, ' (placeholder)', '') WHERE duration LIKE '% (placeholder)';
