/// <reference types="vitest" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_IMPORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
