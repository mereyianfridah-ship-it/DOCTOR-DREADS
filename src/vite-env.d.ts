/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API (no trailing slash). Leave empty in development to use the Vite proxy. */
  readonly VITE_API_URL?: string;
  /** Set to "false" to show only the bundled SVG placeholders instead of real-photo previews. */
  readonly VITE_PREVIEW_IMAGES?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
