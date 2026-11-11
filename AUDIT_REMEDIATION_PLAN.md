# Audit findings and remediation plan

## Findings (frontend)
1. **Duplicate frontend**: `frontend/` was identical to `src/`. Root `package.json` builds `src/`. → Removed `frontend/`.
2. **Everything was demo data**: forms never reached the API; availability was a hash function; accounts were fake. → Wired to the API.
3. Static data duplicated business rules held by the backend (deposit %, delivery areas, stylists). → Now read from `GET /api/config`.
4. Fake sign-in navigated to a sample account. → Real auth.

## Findings (backend, not yet fixed)
| # | Finding | Severity | Plan |
|---|---|---|---|
| B1 | Hold default was 30 min (agreed 10) | Medium | **Fixed** (config + `.env.example`) |
| B2 | Overlap check compares identical start time only; ignores duration and working hours | High | Add service durations + interval overlap in the booking transaction; migrate schema |
| B3 | `PATCH /admin/bookings/:ref` can set `confirmed` without verified payment | High | Reject `confirmed` unless a succeeded payment exists |
| B4 | `PAYMENTS_MODE=mock` is the default and completes payments instantly | High | Default to disabled; refuse mock in production; (payment phase) |
| B5 | Schema created with `CREATE TABLE IF NOT EXISTS`; no migrations | High | Versioned migrations + upgrade procedure |
| B6 | Only `customer`/`admin` roles; no owner/stylist/order-manager permissions | Medium | Role/permission model enforced server-side |
| B7 | No endpoints for consultation status, quotations, password reset, email verification, cancellation requests | Blocking for several features | New routes |
| B8 | JWT in `localStorage` on the frontend (XSS exposure) | Medium | Consider httpOnly cookie sessions; strict CSP |

## Order of work recommended next
B3/B4 → B5 → B2 + concurrency tests → B6 → B7 (consultations/quotations first) → remaining admin screens → payments last.
