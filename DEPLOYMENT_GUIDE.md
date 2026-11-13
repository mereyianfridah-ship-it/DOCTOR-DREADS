# Deployment guide

Stack: React/Vite frontend on **Vercel**, Express/TypeScript API on **Render**, **Neon** PostgreSQL, **Cloudinary** for images.

## Frontend (Vercel)
- Build command `npm run build`, output `dist/`. `vercel.json` already provides the SPA fallback.
- Env: `VITE_API_URL=https://<your-api-host>` (no trailing slash; `/api` is added automatically).

## Backend (Render)
- Build `cd backend && npm install && npm run build`, start `node dist/server.js`. Node >= 22.13.
- Required env in production (the server refuses to start without the first three):
  `DATABASE_URL`, `CORS_ORIGINS` (exact frontend origin, no trailing slash), `CLOUDINARY_URL`
  (`cloudinary://API_KEY:API_SECRET@CLOUD_NAME`, no quotes), `JWT_SECRET` (32+ chars),
  `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
- `PAYMENTS_MODE=disabled` (payments are intentionally not integrated yet; never use `mock` in production).
- `COOKIE_SAMESITE`: use `lax` once the API is same-site as the frontend (see below).
- Migrations in `backend/migrations` run automatically on start, forward-only. Never edit an applied migration.
- `GET /api/health` reports `payments` mode and `cloudinary: configured|missing`.

## Cookies and Safari/iOS
Cross-site cookies (`SameSite=None`) are blocked by Safari and some Firefox/Brave setups, so admin login can fail there.
Put the API on the same site as the frontend (e.g. `www.example.co.ke` + `api.example.co.ke`, or a Vercel rewrite of `/api/*`
to Render), then set `COOKIE_SAMESITE=lax`.

## Before going live
- Replace placeholder business content (see MANUAL_CONFIGURATION_REQUIRED.md).
- Run migrations 008/009 on a Neon branch/copy first and check the shop shows products.
- Serve over HTTPS; set CSP/HSTS at the host and verify.
