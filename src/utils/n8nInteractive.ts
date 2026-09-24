import { IntermediateData } from '../types';

/**
 * Cliente del flujo interactivo real en n8n (PDF → secciones → e-Worksheet .xlsx).
 *
 * Paso 1: POST multipart (campo "data") con el PDF → JSON
 *   { status: "requires_input", titulo_ficha, secciones_detectadas, todos_los_bloques }
 *   o { status: "error", message } si el modelo no devolvió un JSON válido.
 * Paso 2: POST JSON { seccion_seleccionada, titulo_ficha, todos_los_bloques } → binario .xlsx
 */

export interface CaptureField {
  etiqueta_campo: string;
  placeholder?: string;
  tiene_limite?: boolean;
  limite_min?: number | string | null;
  limite_max?: number | string | null;
}

export interface WorksheetBlock {
  seccion: string;
  paso: number | string;
  texto_instruccion: string;
  requiere_captura?: boolean;
  campos?: CaptureField[];
}

const PLACEHOLDER_HOSTS = ['tu-servidor', 'tu-instancia', 'example.com'];

/** true si la URL es un webhook configurado de verdad (no el ejemplo de la plantilla). */
export function isRealWebhookUrl(url?: string): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) && !PLACEHOLDER_HOSTS.some((h) => parsed.hostname.includes(h));
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`n8n no respondió en ${Math.round(timeoutMs / 1000)} s`);
    }
    throw new Error(
      `No se pudo conectar con n8n (${err instanceof Error ? err.message : String(err)}). ` +
        'Revisa la URL del webhook y que el workflow esté activo y permita CORS.'
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Normaliza para comparar secciones igual que el workflow (mayúsculas, sin acentos). */
export function normalizeSection(text: string): string {
  return (text || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** Bloques que corresponden a una sección (misma regla de coincidencia que n8n). */
export function blocksForSection(blocks: WorksheetBlock[], section: string): number[] {
  const wanted = normalizeSection(section);
  const indexes = blocks
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => {
      if (wanted.startsWith('TODAS LAS SECCIONES')) return true;
      const own = normalizeSection(b.seccion);
      return own.includes(wanted) || wanted.includes(own);
    })
    .map(({ i }) => i);
  return indexes.length > 0 ? indexes : blocks.map((_, i) => i);
}

/**
 * Paso 1. Reintenta una vez si n8n responde con error de formato o sin secciones
 * (el modelo a veces devuelve un JSON inválido).
 */
export async function analyzePdf(
  webhookUrl: string,
  file: File,
  timeoutMs: number,
  log: (msg: string) => void
): Promise<IntermediateData> {
  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) log(`Reintentando el análisis (intento ${attempt} de 2)...`);
    const form = new FormData();
    form.append('data', file, file.name);
    const res = await fetchWithTimeout(webhookUrl, { method: 'POST', body: form }, timeoutMs);
    if (!res.ok) {
      lastError = `n8n respondió ${res.status} ${res.statusText}`;
      log(lastError);
      continue;
    }
    const data = await res.json().catch(() => null);
    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload || payload.status === 'error') {
      lastError = payload?.message || 'La respuesta de n8n no es un JSON válido';
      log(`Respuesta inválida: ${lastError}`);
      continue;
    }
    const secciones: string[] = Array.isArray(payload.secciones_detectadas) ? payload.secciones_detectadas : [];
    const bloques: WorksheetBlock[] = Array.isArray(payload.todos_los_bloques) ? payload.todos_los_bloques : [];
    if (secciones.length === 0 || bloques.length === 0) {
      lastError = 'El modelo no detectó secciones en el documento';
      log(lastError);
      continue;
    }
    const conTodas = secciones.some((s) => normalizeSection(s).startsWith('TODAS LAS SECCIONES'))
      ? secciones
      : [...secciones, 'TODAS LAS SECCIONES'];
    return {
      titulo_ficha: payload.titulo_ficha || file.name.replace(/\.[^/.]+$/, ''),
      secciones_detectadas: conTodas,
      todos_los_bloques: bloques as unknown as Array<Record<string, unknown>>,
    };
  }
  throw new Error(`No se pudo analizar el PDF: ${lastError}`);
}

function fileNameFromResponse(res: Response, fallback: string): string {
  const header = res.headers.get('content-disposition') || '';
  const match = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/** Paso 2. Devuelve el .xlsx generado por n8n. */
export async function generateWorksheet(
  webhookUrl: string,
  params: { section: string; title: string; blocks: WorksheetBlock[] },
  timeoutMs: number
): Promise<{ blob: Blob; fileName: string }> {
  const res = await fetchWithTimeout(
    webhookUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seccion_seleccionada: params.section,
        titulo_ficha: params.title,
        todos_los_bloques: params.blocks,
      }),
    },
    timeoutMs
  );
  if (!res.ok) throw new Error(`n8n respondió ${res.status} ${res.statusText} al generar el Excel`);
  const blob = await res.blob();
  if (blob.size === 0) throw new Error('n8n devolvió un archivo vacío');
  const safeTitle = (params.title || 'e-Worksheet').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
  return { blob, fileName: fileNameFromResponse(res, `${safeTitle}.xlsx`) };
}
