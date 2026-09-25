/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del proyecto de Supabase (activa el login y los roles). */
  readonly VITE_SUPABASE_URL?: string;
  /** Clave pública (anon) de Supabase. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
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
