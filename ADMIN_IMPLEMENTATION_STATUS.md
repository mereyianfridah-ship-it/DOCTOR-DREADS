# Dr Dread Kenya - Admin Implementation Status
## AUDIT FINDINGS
### ⚠️ Incomplete Features
## PART 2 — PRODUCT MANAGEMENT IMPLEMENTATION
##### Migration: Add status and low_stock_threshold to products, create categories and stock_movements tables

```sql
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
  change_type TEXT NOT NULL CHECK (change_type IN ('increase', 'decrease', 'adjustment', 'sale', 'refund', 'adjustment')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for efficient stock movement lookups
CREATE INDEX idx_stock_movements_product ON stock_movements(product_slug);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);
```

### Implementation Start: Product Management Module

Following the audit, I will now implement the Product Management module as the highest priority.

#### Step 1: Database Migration

First, I'll create the necessary database migration to:
1. Add `status` and `low_stock_threshold` columns to the `products` table
2. Create the `categories` table
3. Create the `stock_movements` table

| Feature | Gap | Location |
|---------|-----|----------|
| Product creation form | No UI or API endpoint for creating products | Frontend AdminProducts.tsx, backend routes |
| Full product editing | Only price/stock editable; no details, categories, images, status | AdminProducts.tsx, adminUpdateProduct API |
| Product image upload | No upload form; no preview/primary/remove in product form | Frontend, backend upload route exists |
| Product categories management | No category table; no create/edit/delete UI | No dedicated UI or routes |
| Product archival | No "publish/unpublish" or "archive" functionality | Nowhere |
| Stock movement history | No table or recording of stock changes | Nowhere |
| Low-stock threshold management | No threshold field on product; no low-stock dashboard | products table lacks low_stock_threshold |
| Product status (draft/active/archived) | No status field on products | products table lacks status column |
| Featured product toggle | featured exists but no UI toggle | Partial |
| Product size/variants | size field exists but no variant management | Basic support only |
| Delivery eligibility | No field on product | Nowhere |
| Product weight | No field on product | Nowhere |
| Pagination on product list | Basic limit/offset in catalog but no UI pagination | backend/src/routes/catalog.ts |
| Search/filter/sort UI | Backend supports but frontend AdminProducts has no controls | AdminProducts.tsx |
| Stock adjustments with reasons | No stock adjustment API or history | Nowhere |
| Negative stock prevention | Rely on order-level guard only | Backend order-level only |

### ❌ Missing Features

| Feature | Priority |
|---------|----------|
| Full product creation form with all fields | P0 (Phase 2) |
| Category management (create/edit/activate/deactivate) | P0 (Phase 2) |
| Product image upload with preview, primary, remove | P0 (Phase 2) |
| Product status (draft/active/archived) with visibility control | P0 (Phase 2) |
| Stock adjustment with movement history | P0 (Phase 2) |
| Low-stock/out-of-stock indicators management | P0 (Phase 2) |
| Product variants (size, etc.) management | P1 (Phase 3) |
| Delivery eligibility and weight management | P1 (Phase 3) |

### 🔧 Backend Endpoints Required

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| GET /admin/products | List products with pagination, filtering, sort | List |
| POST /admin/products | Create new product | Create |
| PATCH /admin/products/:slug | Update product (full update) | Update |
| PATCH /admin/products/:slug/status | Update product status (draft/active/archived) | Update |
| POST /admin/products/:slug/images | Upload product image | Upload |
| DELETE /admin/products/:slug/images | Remove product image | Delete |
| GET /admin/categories | List categories | List |
| POST /admin/categories | Create category | Create |
| PATCH /admin/categories/:id | Edit category | Update |
| POST /admin/stock-adjustment | Record stock adjustment with reason | Update |

### 🗄️ Database Changes Required

| Table | Changes |
|-------|---------|
| products | Add status column (draft/active/archived), add low_stock_threshold column |
| New: categories table | id, name, slug, description, image, display_order, active |
| New: stock_movements table | id, product_slug, order_id (nullable), previous_stock, new_stock, reason, change_type, created_at |

### 🛡️ Security Issues

| Issue | Risk | Fix |
|-------|------|-----|
| requireAdmin only checks for role "admin" | Too restrictive; no role granularity | Extend role check to include owner, manager, etc. |
| No permissions on server for product actions | Frontend-only validation can be bypassed | Enforce PATCH /admin/products/:slug permissions server-side |
| Image upload without proper validation | Unsecure file types could be uploaded | Validate MIME type and file contents (magic bytes) - already in uploads.ts |
| Image upload stores references but no ownership tracking | Any authenticated user could potentially upload | Track which user uploaded which image |
| No CSRF protection noted | Potential CSRF vector | Ensure forms use proper CSRF tokens if needed |

### 📊 Implementation Order

1. Database migration: Add status, low_stock_threshold to products; create categories and stock_movements tables
2. Category API: Implement category CRUD endpoints
3. Product API: Enhance adminUpdateProduct to full update; add product creation, status, image endpoints
4. Frontend: Rewrite AdminProducts.tsx with full product management
5. Frontend: Add category management page
6. Frontend: Add stock adjustment functionality
7. Testing: Create and run tests for all new functionality

### ✅ Existing Features (Preserved)

| Feature | Location | State |
|---------|----------|-------|
| Product CRUD (price/stock only) | backend/src/routes/admin.ts, AdminProducts.tsx | Partially implemented |
| Product display on shop | catalog.ts, AdminProducts.tsx | Working |
| Basic stock indication | AdminProducts.tsx (low/stock out flags) | Working |
| Image upload (gallery/products) | backend/src/routes/uploads.ts, Cloudinary | Configured but needs product form integration |
| Admin authentication | backend/src/lib/auth.ts, requireAdmin | Working (admin role only) |
| Admin routes summary, bookings, orders, consultations, messages, payments | backend/src/routes/admin.ts | Working |
| Basic product search/filter | backend/src/routes/catalog.ts | Limited (category, q, min/max price, sort) |
| Product details on public shop | catalog.ts + frontend | Working |
| Order item references to products | order_items table | Working |
| JWT authentication with HttpOnly cookies | frontend/src/api/client.ts | Working |

## Development Strategy
ADMIN DASHBOARD is the highest priority. The business owner must be able to manage the business through the admin panel without depending on a developer for everyday operations.

**Strategy**: Inspect and preserve existing frontend, backend, database logic and working features. Do not rebuild from scratch.