# Deployment guide

## Frontend (static site)
```bash
npm install
VITE_API_URL=https://api.example.com npm run build   # outputs dist/
```
Serve `dist/` with SPA fallback (all unknown paths → `index.html`) since routes like `/admin` and `/orders/:ref` are client-side.

## Backend
```bash
cd backend && npm install && npm run build
NODE_ENV=production JWT_SECRET=<32+ random chars> CORS_ORIGINS=https://your-site.example \
  ADMIN_EMAIL=... ADMIN_PASSWORD=... node dist/server.js
```
Requires Node ≥ 22.13. Persist `backend/data/` and `backend/uploads/` (customer photos are private; never serve `uploads/` statically).

## Before going live
- Resolve B3 and B4 in AUDIT_REMEDIATION_PLAN.md. Do not run with `PAYMENTS_MODE=mock` in production.
- Replace placeholder business content (MANUAL_CONFIGURATION_REQUIRED.md).
- Serve over HTTPS and set a strict Content-Security-Policy at the host.
- Payments are not integrated: bookings/orders will stay unpaid and expire after the hold. This is intended until the payment phase.
