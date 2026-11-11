# Dr Dread Kenya

Customer-facing frontend for **Dr Dread Kenya**, a dreadlocks and natural hair-care business in Rongai, Kenya.
The React frontend (this folder) talks to the API in [`backend/`](backend/README.md). **Online payments are not integrated yet** (deliberately the last phase).

## Technology stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`), brand tokens in `src/index.css`
- React Router DOM, Lucide React icons
- React Hook Form + Zod (validation), Sonner (toasts)
- Fonts: Playfair Display (headings), DM Sans (body), loaded from Google Fonts

## Getting started

```bash
npm install                 # first time after this update (adds vitest)
cd backend && npm install && npm run dev     # API on http://localhost:4000
cd .. && npm run dev        # frontend on http://localhost:5173 (proxies /api)
npm run typecheck && npm test && npm run build
```
Set `VITE_API_URL` (see `.env.example`) when the API is on another origin.

## Routes
Public: `/`, `/about`, `/services[/:slug]`, `/booking`, `/consultation`, `/shop[/:slug]`, `/cart`, `/checkout`, `/gallery`, `/contact`, `/track`, `/bookings/:ref`, `/orders/:ref`.
Account (sign-in required): `/account`, `/account/bookings`, `/account/orders`. Admin (admin role): `/admin/*`.

## Status and documentation
See `IMPLEMENTATION_STATUS.md`, `AUDIT_REMEDIATION_PLAN.md`, `MANUAL_CONFIGURATION_REQUIRED.md`, `SECURITY_REVIEW.md`, `DATABASE_MIGRATION_GUIDE.md`, `DEPLOYMENT_GUIDE.md`, `TESTING_REPORT.md`.

Seeded services, products, gallery images and testimonials are **samples** until the owner replaces them; the UI labels them as such. Bookings and orders are held briefly and are **not confirmed/processed until payment is verified**, which is not yet possible online.
