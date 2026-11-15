/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API (no trailing slash). Leave empty in development to use the Vite proxy. */
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
