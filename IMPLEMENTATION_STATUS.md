# Implementation status

Legend: **Implemented** = code written. **Tested** = automated test actually executed (see TESTING_REPORT.md for how).
**Manual** = needs owner/external action. **Blocked** = needs backend work or the payment phase. **Not started**.

This pass covered the **frontend** (Phase 1 consolidation, Phase 2 customer accounts, the frontend parts of Phases 3, 4, 5, 7).
Payment integration is deliberately last: nothing in the frontend calls a payment endpoint or simulates payment.

## Phase 1: audit and stabilise
| Item | State |
|---|---|
| Duplicate `frontend/` directory removed (it was byte-identical to `src/`; the root build uses `src/`) | Implemented |
| Single authoritative frontend at repo root (`src/`, `public/`, `vite.config.ts`) | Implemented |
| Hardcoded demo data layer (`src/data/*`, demo availability) removed; pages read the API | Implemented |
| Typecheck of all source and tests | Checked with a stubbed compiler harness only (not the real `npm run typecheck`) |
| Booking hold default 30 → 10 minutes (`backend/src/config.ts`, `.env.example`) | Implemented, not run (backend deps not installable here) |
| Versioned DB migrations, FK/transaction/index review | Not started (backend) |
| Overlap detection using service duration + working hours | Not started (backend; current rule is one booking per stylist per slot) |
| Concurrent-booking tests on real DB transactions | Not started (backend) |

## Phase 2: authentication and accounts
| Item | State |
|---|---|
| Register, login, logout, session persistence, auth context | Implemented |
| Protected routes, admin route guard (backend still enforces) | Implemented |
| Profile edit, password change | Implemented |
| Customer booking history + detail, order history + detail, guest lookup `/track` | Implemented |
| Booking cancel (immediate, as the API supports) / unpaid order cancel | Implemented |
| Password reset: "Forgot password?" link, emailed single-use expiring link, reset page, all older sessions signed out, per-account email throttle, no account enumeration. Migration `013_password_reset_tokens.sql`. Email via Resend when `RESEND_API_KEY` + `MAIL_FROM` are set; otherwise printed to the console in development only | Implemented. Backend integration tests written but **not run** (no Postgres here); no real email sent or tested |
| Email verification | Blocked (needs a verified sending domain; the mailer is now in place) |
| Cancellation *request* workflow | Blocked (backend) |

## Phase 3: consultation and quotations
| Item | State |
|---|---|
| Consultation form submits to the API with multiple photos, shows reference | Implemented |
| Customer status view `/consultations/:reference` (progress, request summary, quotation); guest lookup via `/track` by email **or phone**; signed-in owners recognised automatically | Implemented. Frontend unit tests run; backend integration tests written but **not run** (no Postgres here) |
| Admin: quotation builder (amount + note, revisable; saving marks the request "Quoted"; blocked on closed requests). Migration `010_consultation_quotations.sql` | Implemented (same test caveat) |
| Customer accepts or declines a quotation (recorded once; a revised quotation resets it; records intent only, nothing is booked or charged). Migration `011_quotation_response.sql` | Implemented (same test caveat) |
| Customer additional-info replies | Blocked (backend) |
| Admin: list, filter by status, secure photo viewing, status update | Implemented |
| Admin: internal staff notes per request (add, list, delete; never customer-visible). Migration `012_consultation_notes.sql` | Implemented (same test caveat) |
| Admin: stylist assignment, info requests | Blocked (backend) |

## Phase 4: booking
| Item | State |
|---|---|
| Live availability from `/api/availability`, stylist chosen before time | Implemented |
| Slot hold with live countdown; clear "not confirmed until deposit verified" | Implemented |
| Conflict (409) sends the customer back to pick another slot | Implemented |
| Customer self-service rescheduling on the booking page: pick a new date/time (same stylist or any), server-checked (upcoming active bookings only, max 2 moves, 24h notice, all configurable via `RESCHEDULE_MAX` / `RESCHEDULE_MIN_HOURS`), race-safe (same advisory lock as booking + unique index), customer emailed, pending-deposit hold NOT extended. Migration `014_booking_reschedule.sql` | Implemented. Pure logic unit-tested and passing; DB integration tests written but **not run** (no Postgres here) |
| **Bug fixed:** overlap checks computed `Number("HH:MM")` arithmetic (NaN), which throws "Invalid time value" as soon as any active booking exists on a date, breaking `/api/availability` and new bookings for that date. Windows now carry a numeric duration; regression test added | Fixed, unit-tested |
| Durations per stylist, qualifications, breaks, holidays, admin reassignment, calendar, mobile areas | Blocked (backend) |

## Phase 5: admin dashboard (`/admin`)
Implemented on existing endpoints: Overview, Bookings, Orders, Consultations, Messages, Payments (read-only), Products (price/stock), Services (price).
Deliberately **no manual "confirm booking"** button: confirmation must follow verified payment.
Not started / blocked: calendar, quotations, stylists, schedules, categories, inventory history, customers, delivery zones, mobile areas, refunds, gallery, social, testimonials, notifications, reports, settings, staff and permissions (backend has only `customer`/`admin` roles).

## Phases 6, 8, 9, 10: settings, refunds, gallery/social, notifications
Not started (need backend models first). Public gallery/testimonials are read from the API; the seeded content is still **sample** and labelled as such.

## Phase 7: shop
| Item | State |
|---|---|
| Catalogue, product pages, cart (reconciled with live stock), guest + account checkout | Implemented |
| Order creation reserves stock; confirmation/tracking page with hold countdown | Implemented |
| Orders never shown as paid without server state; no payment call made | Implemented |
| Admin product create/archive/photos/categories/SKUs/sale prices/inventory history | Blocked (backend) |

## Phase 11: security and testing
See SECURITY_REVIEW.md and TESTING_REPORT.md. Backend and integration suites were **not run**.

## 2026-11-14 remediation (product images, placeholders, hardening)
Done (code only; NOT built or tested here, no network): see FIX_REPORT.md for the full list.
- Upload guard scoped to `/uploads`; public `/api/tiktok/public` and the `/api` 404 no longer return 401.
- Migrations 008 (timestamps; sample products back to `active`) and 009 (categories seed).
- Admin products now load from `/api/admin/products`; full edit, photo add/primary/delete, safe create+upload retry.
- `ProductImage` fallback component; alt-text cleanup; placeholder contact/social details hidden until real data exists.
- Cookie SameSite configurable; Origin (CSRF) check; unified auth module; prod env validation.
Still blocked on the owner: real contact details, stylists, service prices/durations, real products/gallery photos, legal text.

## Feature round: reviews + appointment reminders (2026-11-15)
**Verification: NOT built, NOT run against a database.** The sandbox had no network or PostgreSQL. What was checked: a filtered `tsc` pass over the edited files (no errors besides ones caused by missing packages), and the pure reminder rules and email text, run with Node. The new database tests in `backend/tests/api.test.ts` (customer reviews, appointment reminders) and `backend/tests/reminders.test.ts` have not been run.

1. **Customer reviews with admin approval.** Migration `015_testimonial_moderation.sql` adds `status`, `rating`, `email`, `created_at`, `reviewed_at` to `testimonials` (existing rows stay `approved`). `POST /api/testimonials` (rate-limited, honeypot, max 3 pending per email) stores a `pending` review; `GET /api/testimonials` returns approved ones only, without the email. Admin: `GET/PATCH/DELETE /api/admin/testimonials`, a Reviews page in the admin, and a "Reviews awaiting approval" count on the overview. Home page: "Share your experience" form with star rating (the section now shows even when there are no reviews yet, so the first ones can be collected).
2. **Appointment reminder emails.** Migration `016_booking_reminders.sql` adds `bookings.reminder_sent_at`. `backend/src/lib/reminders.ts` emails each *confirmed* booking once, when it is within `REMINDER_HOURS_BEFORE` (default 24) of its start (East Africa Time). Runs every `REMINDER_INTERVAL_MINUTES` (default 10) from `server.ts`. The booking is claimed with a conditional UPDATE before sending (no double sends); the claim is released if the send fails. Nothing is claimed or sent unless `RESEND_API_KEY` and `MAIL_FROM` are set. `REMINDERS_ENABLED=false` turns it off.

Known limits: a permanently bad email address is retried every interval until the appointment starts; reminders go to confirmed bookings only (confirmation currently needs a verified deposit payment, and payments are postponed); the reminder text says to contact the salon but carries no phone number until real contact details are in `src/config/site.ts` / `backend/seed/site.json`.

## Feature: image uploads and hero photo (2026-11-15)
**Verification: NOT built, NOT run against a database or Cloudinary.** Checked: a filtered `tsc` pass (only an error caused by missing React types) and the new frontend helper (`src/utils/cloudinary.ts`) run with Node. The new backend tests (`site images (hero etc.) and service photos` in `backend/tests/api.test.ts`) and `src/tests/cloudinary.test.ts` have not been run.

- **Admin > Images** (new page) lets the owner change website photos without a developer: hero, two welcome photos, About photo and the booking banner (slots in `src/config/siteImages.ts` / `backend/src/lib/siteImages.ts`), every service's photo, and the gallery (add with title + category, delete). Product photos stay on the Products page.
- Backend: migration `017_site_images.sql` (table `site_images`; `media_assets.kind` now also allows `site` and `service`). `GET /api/site-images` (public), `PUT/DELETE /api/uploads/site-images/:slot`, `PUT /api/uploads/services/:slug`. Same safety as product uploads: admin only, JPG/PNG/WebP, magic-byte check, 10 MB, new file removed from Cloudinary if the database write fails, old file removed only after the commit.
- Public pages read the slots through one shared request (`useSiteImages`) and show a plain block until it answers, so the default image never flashes before the real one. Uploaded photos are served through Cloudinary `f_auto,q_auto,w_N` (`optimizedUrl`) so a 5-10 MB phone photo doesn't slow the hero.
- Needs `CLOUDINARY_URL` set on the server (uploads return 503 without it). Alt text is saved with each upload and is only offered for non-decorative slots (hero and booking banner are decorative backgrounds).
- Not included: before/after pairs for gallery items, cropping, drag-to-reorder gallery, videos.


## Feature round: owner-managed stylists + business settings (2026-11-15)
**Verification: NOT built, NOT run against a database.** The sandbox had no network or PostgreSQL. Checked: a filtered `tsc` pass over the edited files (the only errors left are older `key`-prop errors in `Booking.tsx` caused by missing React types), and the validation in `backend/src/lib/business.ts` compiled and run with Node (valid input normalised; bad phone/email/`javascript:`/`http:`/look-alike-domain links rejected). The new database tests (`business details (admin settings)`, `stylists (admin)` in `backend/tests/api.test.ts`) have **not been run**.

1. **Admin > Stylists.** Migration `018_stylists_and_business_settings.sql` adds `stylists` and `app_settings`. Until the owner adds a first stylist the site keeps using the bundled demo stylists in `seed/site.json`; adding the first real one switches to the database list and the demo ones disappear. Add, rename, turn on/off, delete (delete is refused when the stylist has any booking history: turn off instead). Turning off keeps existing bookings and shows how many are upcoming. If nobody is on, availability shows no slots and `POST /api/bookings` returns 409 "Online booking is paused" (the admin page shows a red warning). `GET /api/config` now returns `auto` + active stylists, so the booking form and rescheduling pick the change up with no frontend change. Ids come from the name (`jane-wanjiru`, `-2` on duplicates; `auto`/`same` are reserved).
2. **Admin > Settings.** Location, opening hours, phone, WhatsApp, email, Instagram/Facebook/TikTok, stored in `app_settings`. Public `GET /api/business` (cached 60 s) returns ready-made `tel:`, `https://wa.me/...` and `mailto:` links; the Footer, Contact page and booking form read it (`src/hooks/useBusiness.ts`) instead of the empty values in `src/config/site.ts`. Kenyan numbers are normalised to `+254 7xx xxx xxx`; social links must be `https://` on the right site; empty fields stay hidden. Saving shows the change on open pages at once.

Not included: per-stylist working hours, days off or service qualifications; the reminder emails still do not print the salon phone number (easy follow-up now that it is stored); bookings lists still show the stylist id (e.g. `jane-wanjiru`) rather than the display name.
