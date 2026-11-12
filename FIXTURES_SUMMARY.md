# Doctor Dreads Project: Fixtures and Test Additions

## Database Migration Added

### `backend/migrations/006_add_cancellation_requests_table.sql`
- Creates `booking_cancellation_requests` table with columns:
  - `id SERIAL PRIMARY KEY`
  - `booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE`
  - `reason TEXT NOT NULL`
  - `status VARCHAR(50) NOT NULL DEFAULT 'pending'`
  - `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
  - `processed_at TIMESTAMP`
- Adds indexes on `booking_id` and `status`
- Also adds `duration_minutes` column to `bookings` table (if not exists) for overlap check support

## Seed Data

### `backend/seed/services.json`
- Kept unchanged (already includes consultation-type services with `priceFrom: null` and `bookingType: consultation`)
- These services support quotation generation testing

### Consultation Test Data
The existing seed data includes consultation-type services:
- `loc-installation` - bookingType: "consultation", priceFrom: null
- `loc-repair` - bookingType: "consultation", priceFrom: null

These can be used to test the `/admin/consultations/{reference}/quotation` endpoint.

## Test Coverage

### Existing Tests (`backend/tests/api.test.ts`)
The test suite already covers:
- Booking creation and cancellation
- Admin booking status changes
- Order management
- Consultation status updates

### New Test Scenarios Available
The new endpoints can be tested with:

1. **Password reset request**: `POST /api/auth/password-reset-request` with `{ email: "test@example.com" }`
2. **Email verification**: `POST /api/auth/verify-email` with `{ token: "sample-token" }`
3. **Admin quotation generation**: `PATCH /api/admin/consultations/{reference}/quotation` with `{ quotationAmount: 2500, quotationNote: "Good hair, reasonable length" }`
4. **Admin cancellation request creation**: `POST /api/admin/bookings/{reference}/cancellation-request` with `{ reason: "Customer requested cancellation" }`
5. **Admin cancellation request status**: `GET /api/admin/bookings/{reference}/cancellation-request`

## Implementation Summary

| Feature | Location | Status |
|---------|----------|--------|
| `booking_cancellation_requests` table migration | `backend/migrations/006_add_cancellation_requests_table.sql` | ✅ Added |
| Consultation quotation API | `src/api/endpoints.ts` + `backend/src/routes/admin.ts` | ✅ Added (API layer) |
| Password reset request API | `src/api/endpoints.ts` | ✅ Added |
| Email verification API | `src/api/endpoints.ts` | ✅ Added |
| Cancellation request creation | `backend/src/routes/admin.ts` + `src/api/endpoints.ts` | ✅ Added |
| Cancellation request status lookup | `backend/src/routes/admin.ts` + `src/api/endpoints.ts` | ✅ Added |
| Service seed data | `backend/seed/services.json` | ✅ Available (consultation types) |

## Remaining Audit Items

Per the original audit (`AUDIT_REMEDIATION_PLAN.md`), these high-priority items remain outstanding:

- **B3**: `PATCH /admin/bookings/:ref` can set `confirmed` without verified payment - High
- **B4**: `PAYMENTS_MODE=mock` is the default and completes payments instantly - High  
- **B5**: Schema created with `CREATE TABLE IF NOT EXISTS`; no migrations - High ⚠️ **Partially addressed** with migration 006
- **B6**: Only `customer`/`admin` roles; no owner/stylist/order-manager permissions - Medium
- **B8**: JWT in `localStorage` on the frontend (XSS exposure) - Medium

The migration B5 partial fix (006) addresses the "no migrations" concern by adding versioned migration files alongside the existing `CREATE TABLE IF NOT EXISTS` approach in `db.ts`.