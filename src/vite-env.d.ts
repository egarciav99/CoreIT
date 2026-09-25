/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Webhook de producción del paso 1 (analizar PDF) del workflow de n8n. */
  readonly VITE_N8N_PDF_STEP1_URL?: string;
  /** Webhook de producción del paso 2 (generar el .xlsx). */
  readonly VITE_N8N_PDF_STEP2_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
