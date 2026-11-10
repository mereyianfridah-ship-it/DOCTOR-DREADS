# Dr Dread Kenya: Frontend (Phase 1)

Customer-facing frontend for **Dr Dread Kenya**, a dreadlocks and natural hair-care business in Rongai, Kenya.
This phase is **frontend only**: no backend, database, authentication or payment gateway is connected.

## Technology stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (`@tailwindcss/vite`), brand tokens in `src/index.css`
- React Router DOM, Lucide React icons
- React Hook Form + Zod (validation), Sonner (toasts)
- Fonts: Playfair Display (headings), DM Sans (body), loaded from Google Fonts

## Getting started

```bash
npm install
npm run dev        # development server (http://localhost:5173)
npm run build      # production build into dist/
npm run preview    # preview the production build
npm run typecheck  # tsc --noEmit
```

## Pages & routes

| Route | Page |
|---|---|
| `/` | Home (hero, intro, services, products, why choose us, gallery, testimonials, CTA) |
| `/about` | About |
| `/services`, `/services/:slug` | Service catalogue (category filter) and detail pages |
| `/booking` | 8-step demo booking flow |
| `/consultation` | 4-step consultation form with photo uploads |
| `/shop`, `/shop/:slug` | Shop (search, category, price filter, sorting) and product details |
| `/cart`, `/checkout` | Cart (persisted in localStorage) and checkout |
| `/gallery` | Gallery with category filters and lightbox |
| `/contact` | Contact form and details |
| `/login`, `/register`, `/account`, `/account/bookings`, `/account/orders` | Demo account screens |
| `/privacy`, `/terms` | Draft placeholder legal pages |

## Where to edit things

| What | File |
|---|---|
| Contact details, social links, hours, deposit %, consultation fee, delivery fees | `src/config/site.ts` |
| Services and (sample) prices | `src/data/services.ts` |
| Products, (sample) prices, stock | `src/data/products.ts` |
| Gallery items | `src/data/gallery.ts` |
| Testimonials | `src/data/testimonials.ts` |
| Brand colours and fonts | `src/index.css` (`@theme`) |
| Images | `public/images/` and the paths in `src/data/*` |

## Project structure

```
src/
  components/ common, layout, home, services, shop, booking, consultation, gallery, contact
  pages/      one file per route (+ pages/account/)
  context/    CartContext.tsx (cart state + localStorage persistence)
  config/     site.ts (editable business config)
  data/       demo services, products, gallery, testimonials, account
  types/      shared TypeScript types
  utils/      formatting, validation, storage, demo availability
public/images/  placeholder artwork (SVG), to be replaced with real photography
```

## Current frontend limitations (please read)

- **All data is demonstration data.** Service prices, product prices, stock, delivery fees, durations, stylist names,
  booking availability and account data are **samples** and are labelled as such in the UI.
- **Images are generated placeholders** in the brand palette (labelled "SAMPLE IMAGE"). They are not real client work or product photos.
- **Testimonials are placeholders**, not real reviews.
- **Contact details and social links are placeholders.** Nothing was invented; set real values in `src/config/site.ts`.
- **No real bookings, orders, payments or emails.** Booking, checkout, consultation and contact forms validate input and then show a clear "demo" confirmation; nothing leaves the browser.
- **No authentication.** Login/register are UI-only; no passwords are stored anywhere.
- The brand mark is a temporary text mark, not an official logo.
- Legal pages are draft placeholders and not legal advice.

## Future backend integration

| Area | Planned integration |
|---|---|
| API | Node.js + Express |
| Database & auth | Supabase PostgreSQL + Supabase Auth (see `TODO(supabase)` in `Login.tsx`, `Register.tsx`, `Account.tsx`) |
| Images / uploads | Cloudinary (consultation photos, product & gallery images) |
| Payments | M-Pesa Daraja API and a card gateway (see `TODO(backend)` in `Checkout.tsx`, `Booking.tsx`) |
| Availability & bookings | Replace `src/utils/availability.ts` with an API call; add inventory management |
| Forms | `TODO(backend)` markers in `ContactForm.tsx` and `ConsultationForm.tsx` |

Cart lines are stored as `{ productId, quantity }` with integer KSh prices, ready to map to database records.
Online product purchases will require full payment before an order is confirmed (no cash on delivery/collection).
