import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Forward /api calls to the backend during development (backend: `cd backend && npm run dev`).
  server: { proxy: { "/api": "http://localhost:4000" } },
});
