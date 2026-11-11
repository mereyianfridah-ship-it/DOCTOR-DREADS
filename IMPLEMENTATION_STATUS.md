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
| Password reset, email verification | Blocked (no backend endpoints, no email provider) |
| Cancellation *request* workflow, quotation history | Blocked (backend) |

## Phase 3: consultation and quotations
| Item | State |
|---|---|
| Consultation form submits to the API with multiple photos, shows reference | Implemented |
| Customer status view, additional-info replies, quotations, accept/decline | Blocked (no backend endpoints) |
| Admin: list, filter by status, secure photo viewing, status update | Implemented |
| Admin: notes, stylist assignment, info requests, quotation builder | Blocked (backend) |

## Phase 4: booking
| Item | State |
|---|---|
| Live availability from `/api/availability`, stylist chosen before time | Implemented |
| Slot hold with live countdown; clear "not confirmed until deposit verified" | Implemented |
| Conflict (409) sends the customer back to pick another slot | Implemented |
| Durations, qualifications, breaks, holidays, reassignment, rescheduling, calendar, mobile areas | Blocked (backend) |

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
