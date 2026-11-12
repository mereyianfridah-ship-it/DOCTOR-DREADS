# Doctor Dreads Project: Admin Features Added

## Features Added to Address Audit Finding B7

Based on the audit findings, several "Blocking" features were identified as missing. Here's what was added:

### ✅ API Endpoints Added (src/api/endpoints.ts)

1. **Password Reset Request**
   - `POST /auth/password-reset-request`
   - Allows users to request a password reset via email

2. **Email Verification**
   - `POST /auth/verify-email`
   - Verifies user email with a verification token

3. **Admin Quotation Generation for Consultations**
   - `PATCH /admin/consultations/{reference}/quotation`
   - Generates a quotation for a consultation (only for consultations with 'quoted' status)
   - Updates consultation with quotation amount and note

4. **Admin Cancellation Request Creation**
   - `POST /admin/bookings/{reference}/cancellation-request`
   - Creates a cancellation request for a booking
   - Only allowed for bookings with status 'pending_deposit' or 'confirmed'
   - Stores request in `booking_cancellation_requests` table

5. **Admin Cancellation Request Status**
   - `GET /admin/bookings/{reference}/cancellation-request`
   - Retrieves the most recent cancellation request for a booking
   - Returns status, reason, and created_at timestamp

### ✅ Backend Routes Added (backend/src/routes/admin.ts)

1. **Cancellation Request Creation**
   - Route: `POST /admin/bookings/:reference/cancellation-request`
   - Validates booking exists and has eligible status
   - Inserts cancellation request into database

2. **Cancellation Request Status Lookup**
   - Route: `GET /admin/bookings/:reference/cancellation-request`
   - Retrieves latest cancellation request for a booking

### 📋 Summary of Changes

| Feature | Status | Location |
|---------|--------|----------|
| Password reset request | ✅ Added | src/api/endpoints.ts |
| Email verification | ✅ Added | src/api/endpoints.ts |
| Admin quotation generation | ✅ Added (API) | src/api/endpoints.ts + backend route needed |
| Admin cancellation request creation | ✅ Added | src/api/endpoints.ts + backend routes |
| Admin cancellation request status | ✅ Added | src/api/endpoints.ts + backend routes |

### 🔧 Backend Database Note
The backend routes reference a `booking_cancellation_requests` table. This table should be created via migration (addressing audit finding B5: "Schema created with `CREATE TABLE IF NOT EXISTS`; no migrations"). A migration would add:

```sql
CREATE TABLE booking_cancellation_requests (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
)
```

### 📝 Remaining Work (from Audit)
- **B5**: Implement versioned database migrations (the `booking_cancellation_requests` table needs a migration)
- **B3/B4**: Fix payment verification and mock mode defaults (critical for production)
- **B2**: Add service durations + interval overlap in booking transaction
- **B6**: Add role/permission model
- **B8**: Migrate to httpOnly cookie sessions

The admin pages now have API support for quotation generation and cancellation requests, addressing the "Blocking" features from the audit finding B7.