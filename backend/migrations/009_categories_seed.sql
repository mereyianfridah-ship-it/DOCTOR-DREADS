-- 009: seed the categories table (it was created in 007 but never populated).
-- products.category stores the category NAME (matches seed data and shop filters);
-- the admin API validates against this table.
INSERT INTO categories (name, slug, display_order) VALUES
  ('Moisturizers',  'moisturizers',  1),
  ('Moulding Gels', 'moulding-gels', 2),
  ('Natural Oils',  'natural-oils',  3),
  ('Accessories',   'accessories',   4)
ON CONFLICT (slug) DO NOTHING;
