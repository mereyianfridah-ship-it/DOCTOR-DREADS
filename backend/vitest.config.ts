import { defineConfig } from "vitest/config";
// Tests run against fixture data (tests/fixtures/seed); the real seed/ folder ships with no demo content.
export default defineConfig({ test: { env: { NODE_ENV: "test", SEED_DIR: "tests/fixtures/seed" }, include: ["tests/**/*.test.ts"] } });
