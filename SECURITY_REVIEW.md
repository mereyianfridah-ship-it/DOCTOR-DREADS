# Security review

## In place
- Sessions use an HttpOnly cookie (no token in localStorage). Cookie SameSite is configurable via `COOKIE_SAMESITE`.
- State-changing API requests with a browser `Origin` outside `CORS_ORIGINS` are rejected (403), which blocks cross-site CSRF.
- CORS violations no longer produce 500s.
- Uploads: memory storage, MIME + magic-byte sniffing, 10 MB / 5 file limits, admin-only routes scoped to `/uploads`.
- Private consultation photos are stored as Cloudinary `authenticated` assets and served through short-lived signed URLs.
- Production boot checks required env vars and the `CLOUDINARY_URL` format.

## Open risks
- With `COOKIE_SAMESITE=none` (cross-site hosting) Safari/Firefox strict modes drop the cookie. Move to a same-site API.
- `db.ts` uses `ssl: { rejectUnauthorized: false }` in production; switch to verified TLS once confirmed with Neon.
- No dependency audit has been run (`npm audit` needs network). No CSP verified on the deployed hosts.
- Only role `admin` can use admin routes; other roles in the schema are not enforced consistently.
