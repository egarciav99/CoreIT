/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "client" para una entrega a empresa; por defecto "demo". */
  readonly VITE_COREIT_MODE?: string;
  /** Nombre de la empresa que se muestra en la cabecera. */
  readonly VITE_COREIT_COMPANY?: string;
  /** Webhook de producción del paso 1 (analizar PDF) del workflow de n8n. */
  readonly VITE_N8N_PDF_STEP1_URL?: string;
  /** Webhook de producción del paso 2 (generar el .xlsx). */
  readonly VITE_N8N_PDF_STEP2_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
