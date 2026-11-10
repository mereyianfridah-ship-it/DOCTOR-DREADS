# Dr Dread Kenya: Backend API

Node.js + Express + TypeScript, SQLite (Node's built-in `node:sqlite`, so no native build step), JWT auth, M-Pesa Daraja.
Requires **Node 22.13+**.

```bash
cd backend
cp .env.example .env      # set JWT_SECRET for anything beyond local dev
npm install
npm run dev               # http://localhost:4000  (DB + seed data created automatically)
npm test                  # 23 integration tests
npm run build && npm start
npm run create-admin -- owner@example.com 'a-long-password'
```

In another terminal run the frontend (`npm run dev` in the project root). Vite proxies `/api` to port 4000.

## Design notes
- **Prices are never trusted from the client.** Orders take only `{productId, quantity}`; totals, delivery fee and booking deposit are computed server-side from the database and `seed/site.json`.
- **Stock is reserved at order creation** (atomic guarded decrement) and released if the order is cancelled or unpaid after `HOLD_MINUTES`. Concurrent orders cannot oversell.
- **Double booking is prevented by the database** (partial unique index on date/time/stylist). `stylist: "auto"` assigns a free stylist.
- Guests can book/order without an account. They look things up with **reference + email**; wrong email returns 404 (no enumeration).
- Consultation photos are validated (type, size, magic bytes), stored under random names, and only streamed to admins.
- M-Pesa callback is authenticated by a secret URL segment, amount-checked, and idempotent. Late payments after a hold expired are flagged `needs_review` instead of being lost.
- Seed data comes from the frontend demo data (`npm run seed:generate` regenerates `seed/*.json`). Prices/stock are still **sample values**: change them through the admin API or the DB.

## Payments
`PAYMENTS_MODE=mock` (default) completes payments instantly and moves no money. For real payments set `PAYMENTS_MODE=daraja` plus the `MPESA_*` variables; the callback URL is
`{MPESA_CALLBACK_BASE_URL}/api/payments/mpesa/callback/{MPESA_CALLBACK_SECRET}`. Card payments return `501` (no gateway chosen yet). Test on the Safaricom sandbox before going live.

## Endpoints (all under `/api`, JSON)
| | |
|---|---|
| `GET /health`, `GET /config` | health; deposit %, delivery areas, stylists, slots |
| `GET /services[?category&bookingType]`, `/services/:slug` | catalogue |
| `GET /products[?category&q&minPrice&maxPrice&sort=price_asc\|price_desc\|name]`, `/products/:slug` | shop |
| `GET /gallery[?category]`, `/testimonials` | content |
| `POST /auth/register`, `/auth/login`; `GET/PATCH /auth/me`; `POST /auth/change-password` | accounts (Bearer token) |
| `GET /availability?date=YYYY-MM-DD&stylist=auto` | open slots |
| `POST /bookings`; `GET /bookings/:ref?email=`; `POST /bookings/:ref/cancel` | bookings (status `pending_deposit` → `confirmed`) |
| `POST /orders`; `GET /orders/:ref?email=`; `POST /orders/:ref/cancel` | shop orders (`pending_payment` → `paid` → …) |
| `POST /payments/mpesa/stk` `{kind:"order"\|"booking", reference, email?, phone?}`; `GET /payments/status?kind&reference&email` | pay / poll |
| `POST /consultations` (multipart, up to 5 `photos`); `GET /consultation-info` | consultation requests |
| `POST /contact` | contact form |
| `GET /account/bookings`, `/account/orders` | signed-in customer |
| `GET /admin/summary`, `/admin/{bookings,orders,consultations,messages,payments}`; `PATCH` status endpoints; `PATCH /admin/products/:slug`, `/admin/services/:slug` | admin only |

Errors: `{ "error": "message", "fields": { "email": "…" } }` with 400 (validation), 401/403, 404, 409 (conflict/out of stock).

## Not included yet (honest gaps)
- Email/SMS notifications (messages and bookings are stored; the salon must check the admin API).
- Password reset, email verification.
- Card gateway; Cloudinary (photos are stored on local disk in `UPLOAD_DIR`: use a persistent volume when deploying).
- The frontend forms still run in demo mode: wire them to these endpoints (see `TODO(backend)` comments).
- SQLite suits a single-instance salon site; move to Postgres if you need multiple servers.
