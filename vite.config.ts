import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Forward /api calls to the backend during development (backend: `cd backend && npm run dev`).
  test: { include: ["src/**/*.test.ts"], environment: "node" },
  server: { proxy: { "/api": "http://localhost:4000" } },
});
