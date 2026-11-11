# Database migration guide

**Status: not started.** The backend currently creates tables with `CREATE TABLE IF NOT EXISTS` on startup (SQLite via `node:sqlite`, file `backend/data/drdread.db`) and has no migration history, so schema changes to an existing database are not applied.

Planned approach:
1. Add a `schema_migrations(version, applied_at)` table.
2. Store numbered, forward-only SQL files in `backend/migrations/`; apply pending ones inside a transaction at startup.
3. Back up the DB file (`sqlite3 drdread.db ".backup backup.db"`) before every deploy.
4. Test: migrate an empty DB and a copy of production data, then run the API tests.

Until then: **do not change table definitions on a live database.** The one backend change in this pass (`HOLD_MINUTES` default) needs no migration.
