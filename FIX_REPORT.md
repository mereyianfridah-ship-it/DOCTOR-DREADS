# Fix report (2026-11-14)

**Verification status: NOT built, NOT tested.** The sandbox had no network, so `npm install` was impossible.
Only a filtered `tsc` pass over the edited files was run (it reported no errors in them; errors about missing
packages were ignored because dependencies were absent). Run before deploying:
`npm install && npm run typecheck && npm test && npm run build`, then
`cd backend && npm install && npm run build && npm test`. Use `npm install` (not `npm ci`): both lockfiles are stale.

## Fixed
Image uploads
- Seeded sample products were `draft` (migration 007 default) so the shop and admin were empty -> seed now inserts `active`; migration 008 reactivates only still-draft rows whose images are the bundled `/images/product-*.svg` samples.
- Admin Products read the public active-only list -> now uses `GET /api/admin/products` with a status filter.
- Create Product always 400 (categories table empty) -> migration 009 seeds 4 categories; `GET /api/categories`; admin accepts slug or name and stores the category name.
- Uploaded photo hidden behind placeholder SVG -> first real upload drops bundled sample images; new `PUT /uploads/products/:slug/order` (primary photo), delete UI, 5-photo limit.
- `ProductImage` fallback ("No photo yet" / broken image) used on cards, cart, product page, admin.
- `uploadsRouter.use(requireAdmin)` guarded everything -> scoped to `/uploads` (fixes 401 on `/api/tiktok/public` and on unknown routes).
- MIME `image/jpg` -> `image/jpeg`; Cloudinary 60 s timeout and clear 502; cleanup of Cloudinary asset if the DB write fails; remote delete moved outside the DB transaction; limit raised to 10 MB; client-side type/size check.
- Safe create-then-upload (retry only re-sends the photo), duplicate slug -> 409 instead of a leaked DB error.
- Private consultation photo view was broken by a lowercased SQL alias (`publicId`) -> quoted. Same bug fixed in the TikTok queries.
- Orphan admin route `POST /uploads/consultations/:reference/photos` removed; `DELETE /uploads/gallery/:id` added.
- `PATCH /admin/products/:slug` now edits name, descriptions, category, size, featured, price, stock, status; stock edits write `stock_movements`.
Auth / platform
- One auth module (`lib/auth.ts` re-exports `cookie-auth.ts`); `COOKIE_SAMESITE` env; Origin-based CSRF check; CORS rejection no longer a 500; frontend 401 handling and logout now work with cookies.
- Production boot validates `DATABASE_URL`, `CORS_ORIGINS`, `CLOUDINARY_URL` (and its format); `/api/health` shows Cloudinary status.
- Seed inserts use named columns.
Placeholders
- Fake testimonials removed (section hides when empty); stale Supabase "demo screen" notice removed; "(placeholder)/(sample)" alt text fixed; empty phone/WhatsApp/email/hours and unset social links are hidden instead of showing placeholder text; "map placeholder" box removed.
Housekeeping
- Deleted `db.ts.old`, `parse2.cjs`, `parse_results.cjs`, `vitest_results.txt`, `filelist.txt`; removed backend-only packages from the frontend `package.json`; env example and docs updated.
- Tests: Cloudinary mock, cookie-token helper (login no longer returns a body token), string COUNT assertions, new product/upload/guard tests.

## NOT fixed (needs you or a decision)
- Cross-site cookies: default stays `none` so the current Vercel+Render setup keeps working; Safari/iOS will still fail until the API is same-site, then set `COOKIE_SAMESITE=lax`.
- Real content: phone/WhatsApp/email/hours/social (`src/config/site.ts`), real stylists (`seed/site.json`; bookings need at least one), service prices/durations ("(placeholder)" suffix still in `seed/services.json`), real products and gallery photos, Terms/Privacy text, logo. Seed edits don't change an already-seeded database.
- `DemoNotice` banners on Shop, Services, Gallery, Booking, Checkout, Legal etc. still say sample/demo; remove them once real content is in.
- Inline DDL in `initDb()` still re-creates tables after migrations (needs a tested parity check); migration 007 is still non-idempotent (not edited because it may be applied).
- Gallery/service image upload UI, only role `admin` allowed, `rejectUnauthorized:false` TLS, sweeper on the hot path, CSP/HSTS, monitoring, `npm audit`.
- Payments remain disabled by design.
