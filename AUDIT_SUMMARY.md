# Doctor Dreads Project Audit Summary

## Project Overview
- **Frontend**: Vite + React + TypeScript (package: `dr-dread-kenya-frontend`)
- **Backend**: Node.js + Express + PostgreSQL
- **Purpose**: Salon/barbershop booking system with M-Pesa payments

## Audit Findings Status (from AUDIT_REMEDIATION_PLAN.md)

### ✅ Fixed - Frontend Issues
1. Duplicate frontend `frontend/` removed (identical to `src/`)
2. Demo data wired to real API
3. Static business rules now read from `GET /api/config`
4. Real authentication implemented

### ⚠️ Backend Issues Outstanding

**B1: Hold default was 30 min (agreed 10) - Medium - FIXED**
- Default changed from 30 to 10 minutes in config.ts
- Documented in `.env.example`

**B2: Overlap check ignores duration and working hours - High** (Not fixed)
- `lib/util.ts` `overlaps()` function uses half-open interval logic
- `bookings.ts` `stylistWindows()` doesn't properly account for varying service durations
- **Fix**: Add service durations + interval overlap in booking transaction

**B3: `PATCH /admin/bookings/:ref` can set `confirmed` without verified payment - High** (Not fully fixed)
- `admin.ts` lines 35-38 has a payment check but verify completeness
- **Fix**: Reject `confirmed` unless a succeeded payment exists

**B4: `PAYMENTS_MODE=mock` is default and completes payments instantly - High** (Not fixed)
- `config.ts` line 36: default mode is "mock"
- Production guard only logs a warning (lines 61-63)
- **Fix**: Default to disabled; refuse mock in production

**B5: Schema created with `CREATE TABLE IF NOT EXISTS`; no migrations - High** (Not fixed)
- `db.ts` and `migrator.ts` - no versioned migrations
- **Fix**: Versioned migrations + upgrade procedure

**B6: Only `customer`/`admin` roles; no owner/stylist/order-manager permissions - Medium** (Not fixed)
- `auth.ts` line 7: role type is `"customer" | "admin"`
- **Fix**: Role/permission model enforced server-side

**B7: No endpoints for consultation status, quotations, password reset, email verification, cancellation requests - Blocking** (Not fixed)
- Missing routes for several features
- **Fix**: New routes needed

**B8: JWT in `localStorage` on frontend (XSS exposure) - Medium** (Not fixed)
- Frontend stores token in localStorage
- **Fix**: Consider httpOnly cookie sessions; strict CSP

## Recommended Work Order
1. B3/B4 → Fix payment confirmation and mock mode defaults
2. B5 → Versioned migrations + upgrade procedure
3. B2 + concurrency tests → Add service durations + interval overlap
4. B6 → Role/permission model
5. B7 (consultations/quotations first) → New routes
6. Remaining admin screens
7. Payments last
8. B8 → httpOnly cookie sessions; strict CSP