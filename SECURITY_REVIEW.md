# Security review (frontend pass)

## Done
- No secrets in the frontend; API base via `VITE_API_URL`.
- Authorization is enforced by the backend; the frontend route guards only avoid showing unusable screens.
- Customers only fetch their own records (`/account/*`); guest lookups require reference + email; the API answers identically for "missing" and "not yours".
- Post-login redirect accepts same-site relative paths only (tested: blocks `//host`, `https://…`, `javascript:`).
- 401 on an authenticated request clears the session; a wrong password on login does not (tested).
- Private consultation photos are fetched with the admin bearer token and shown from temporary blob URLs (revoked on unmount); never public URLs.
- Guest email for status pages is kept in `sessionStorage` (this tab only), not `localStorage`. Note it can also arrive via `?email=` in the address bar (e.g. from the lookup form flow it does not; only if a link is built that way).
- Contact form includes a honeypot field the backend already checks.
- Admin "Confirm booking" action intentionally not exposed.

## Open risks
- **Token in `localStorage`** is readable by any injected script. Mitigate with strict CSP and, preferably, httpOnly cookie sessions (backend change).
- Backend findings B2–B6 in AUDIT_REMEDIATION_PLAN.md (notably B3 and B4) are security-relevant and unfixed.
- No dependency audit was run (`npm audit` needs network).
- Not verified in a browser: CSP/headers when deployed behind the real host.
