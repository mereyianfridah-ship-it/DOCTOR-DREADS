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
