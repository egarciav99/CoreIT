/**
 * Configuración en tiempo de ejecución. Se lee de `config.json`, junto al index.html,
 * para que cada empresa pueda cambiarla sin recompilar la web.
 *
 * - mode "demo": automatizaciones de ejemplo y métricas simuladas (para enseñar el producto).
 * - mode "client": solo automatizaciones reales, contadores desde cero y métricas calculadas.
 */
export interface CoreConfig {
  mode: 'demo' | 'client';
  companyName: string;
  logoUrl: string;
  webhooks: { pdfStep1: string; pdfStep2: string };
  /** Con Supabase configurado, CoreIT funciona con login, empresas y roles. Sin él, en modo local/demo. */
  supabase: { url: string; anonKey: string };
}

const fromEnv: CoreConfig = {
  mode: import.meta.env.VITE_COREIT_MODE === 'client' ? 'client' : 'demo',
  companyName: import.meta.env.VITE_COREIT_COMPANY || '',
  logoUrl: '',
  webhooks: {
    pdfStep1: import.meta.env.VITE_N8N_PDF_STEP1_URL || '',
    pdfStep2: import.meta.env.VITE_N8N_PDF_STEP2_URL || '',
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
};

let current: CoreConfig = fromEnv;

export function getConfig(): CoreConfig {
  return current;
}

/** Lee config.json. Lo que falte o venga vacío se completa con las variables de entorno del build. */
export async function loadConfig(): Promise<CoreConfig> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' });
    if (res.ok) {
      const file = (await res.json()) as Partial<CoreConfig>;
      current = {
        mode: file.mode === 'client' || file.mode === 'demo' ? file.mode : fromEnv.mode,
        companyName: file.companyName || fromEnv.companyName,
        logoUrl: file.logoUrl || fromEnv.logoUrl,
        webhooks: {
          pdfStep1: file.webhooks?.pdfStep1 || fromEnv.webhooks.pdfStep1,
          pdfStep2: file.webhooks?.pdfStep2 || fromEnv.webhooks.pdfStep2,
        },
        supabase: {
          url: file.supabase?.url || fromEnv.supabase.url,
          anonKey: file.supabase?.anonKey || fromEnv.supabase.anonKey,
        },
      };
    }
  } catch {
    // Sin config.json (p. ej. en desarrollo): se usan las variables de entorno.
  }
  return current;
}

/** true si hay backend: login, empresas y roles. */
export function isHosted(): boolean {
  const { url, anonKey } = getConfig().supabase;
  return Boolean(url && anonKey);
}
