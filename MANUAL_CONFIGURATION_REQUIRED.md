# Manual configuration required

| What | Where | Notes |
|---|---|---|
| Real phone, WhatsApp, email, opening hours, social links | **Admin > Settings** (no code change needed) | Empty and hidden on the site until you fill them in |
| Brand logo | `src/components/layout/BrandMark.tsx` | Text mark is temporary |
| Real service prices, durations, descriptions | Admin → Services (price only today) / `backend/seed/*.json` | Seed prices are **samples** |
| Real product catalogue, prices, stock, photos | Admin → Products (price/stock only today) | Seed products are samples |
| Real gallery photos / testimonials | Backend seed / future admin | Seeded items are placeholders, not real clients |
| Deposit %, delivery areas and fees, stylists | `backend/seed/site.json` | Samples; owner must confirm |
| Cancellation / refund policy, consultation fee | Not yet configurable | Keep drafts unpublished until confirmed |
| Frontend API URL | `VITE_API_URL` in the frontend environment (see `.env.example`) | Empty in dev (Vite proxy to :4000) |
| Backend secrets | `backend/.env`: `JWT_SECRET` (32+ chars), `CORS_ORIGINS`, `ADMIN_EMAIL`/`ADMIN_PASSWORD` | Never commit |
| First admin account | `cd backend && npm run create-admin` or `ADMIN_*` env vars | Needed to open `/admin` |
| After pulling this change | Run `npm install` in the repo root | `vitest` was added to `package.json`; `package-lock.json` must be refreshed (it could not be regenerated offline). Use `npm install`, not `npm ci`, the first time |
| Cloudinary | `CLOUDINARY_URL` on Render | Required for any photo upload; `/api/health` shows `cloudinary: configured|missing` |
| Payments (M-Pesa Daraja, card), email/SMS/WhatsApp | — | Blocked: later phases (payments stay disabled) |
| Real stylists | **Admin > Stylists** (no code change needed) | Site shows "Stylist A/B (demo)" until you add your first real stylist |

## Password reset email (owner action)
Password reset only works for real customers once email sending is configured. Without it, links are not sent.
1. Create a free account at https://resend.com and verify the domain you will send from.
2. Create an API key.
3. Set these on the backend host: `RESEND_API_KEY`, `MAIL_FROM` (e.g. `Dr Dread Kenya <no-reply@yourdomain.co.ke>`), and `APP_URL` (your public site URL, used in the emailed link).
4. Apply migration `013_password_reset_tokens.sql` (the backend runs migrations on start).
5. Test with your own account: request a reset, open the link, set a password, sign in.
