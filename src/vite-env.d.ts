/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VOLC_ARK_API_KEY?: string;
  readonly VITE_TENCENT_SECRET_ID?: string;
  readonly VITE_TENCENT_SECRET_KEY?: string;
  readonly VITE_TENCENT_IMS_BIZTYPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
