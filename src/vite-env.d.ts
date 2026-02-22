/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VOLC_ARK_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
