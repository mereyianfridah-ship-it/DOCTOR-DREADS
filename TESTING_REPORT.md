# Testing report

## What was actually run (this environment had no network, so `npm install` was impossible)
| Check | How | Result |
|---|---|---|
| TypeScript compile of `src/` + tests | Real `tsc` 6.0 with **hand-written type stubs** for react, react-router-dom, react-hook-form, lucide-react, sonner and vitest; real `zod` types | No errors. Also confirmed the harness reports a deliberately injected type error |
| 28 unit tests (`src/tests/*.test.ts`) | Bundled with esbuild and run on Node 22 using a **minimal vitest-compatible shim** (not the real vitest) | 28 passed, 0 failed |

Because libraries were stubbed, component-level typing (hooks, router, form types) is only partially verified.

## Not run (do not treat as passing)
- `npm run typecheck`, `npm run build`, `npm test` with real dependencies: **run these first** after `npm install`.
- Frontend rendering/component tests, end-to-end browser tests: not written.
- All backend tests, backend build, DB migration tests, integration tests, concurrent-booking tests: not run / not written.
- Manual browser walkthrough of the new flows: not done.

## What the unit tests cover
Hold countdown math, status labels (shipped → collection/delivery wording; unpaid never "paid"), cart reconciliation against stock, product helpers, KSh/byte formatting, whole-number parsing, safe redirect, API client (headers, bearer token, JSON vs multipart, error/field mapping, 401 handling, network failure), guest-email memory.
