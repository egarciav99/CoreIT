/**
 * Ejecuta una automatización de CoreIT llamando a su webhook de n8n desde el servidor.
 * El navegador nunca conoce la URL ni el secreto de n8n.
 *
 * Petición (con la sesión del usuario en Authorization):
 *   · multipart/form-data: automation_id, step (1|2) y el archivo en "data" (+ otros campos).
 *   · application/json: { automation_id, step, payload }  → payload se reenvía tal cual.
 * Respuesta: la de n8n (JSON o archivo), con Content-Disposition si lo trae.
 */
import { authenticate, corsHeaders, json, serviceClient } from '../_shared/common.ts';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/**
 * En el SaaS, un admin de empresa no puede apuntar a redes internas ni usar http.
 * En una instalación en el cliente (n8n en su red), se permite con COREIT_ALLOW_PRIVATE_WEBHOOKS=true.
 */
const ALLOW_PRIVATE = Deno.env.get('COREIT_ALLOW_PRIVATE_WEBHOOKS') === 'true';

function isAllowedTarget(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (ALLOW_PRIVATE) return url.protocol === 'https:' || url.protocol === 'http:';
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false;
  if (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return false;
  if (!host.includes('.')) return false; // nombres de servicio internos (kong, db…)
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  const auth = await authenticate(req);
  if (!auth) return json(req, { error: 'No has iniciado sesión' }, 401);

  const contentType = req.headers.get('content-type') || '';
  let automationId = '';
  let step = 1;
  let forwardBody: BodyInit;
  let forwardType: string | undefined;
  let inputName: string | null = null;

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      automationId = String(form.get('automation_id') || '');
      step = Number(form.get('step') || 1);
      const out = new FormData();
      let total = 0;
      for (const [key, value] of form.entries()) {
        if (key === 'automation_id' || key === 'step') continue;
        if (value instanceof File) {
          total += value.size;
          inputName = inputName || value.name;
        }
        out.append(key, value);
      }
      if (total > MAX_UPLOAD_BYTES) return json(req, { error: 'El archivo supera 20 MB' }, 413);
      forwardBody = out; // fetch pone el boundary
    } else {
      const body = await req.json();
      automationId = String(body?.automation_id || '');
      step = Number(body?.step || 1);
      forwardBody = JSON.stringify(body?.payload ?? {});
      forwardType = 'application/json';
    }
  } catch {
    return json(req, { error: 'Petición no válida' }, 400);
  }

  if (!/^[0-9a-f-]{36}$/i.test(automationId) || (step !== 1 && step !== 2)) {
    return json(req, { error: 'Petición no válida' }, 400);
  }

  const admin = serviceClient();

  // La automatización debe ser visible para este usuario (RLS con su propia sesión).
  const { data: automation } = await auth.userClient
    .from('automations')
    .select('id, org_id, status, output_type, timeout_seconds')
    .eq('id', automationId)
    .maybeSingle();
  if (!automation) return json(req, { error: 'Automatización no encontrada' }, 404);
  if (automation.status !== 'active') return json(req, { error: 'Esta automatización está pausada' }, 409);

  const { data: endpoint } = await admin
    .from('automation_endpoints')
    .select('step1_url, step2_url, secret')
    .eq('automation_id', automationId)
    .maybeSingle();
  const target = step === 2 ? endpoint?.step2_url : endpoint?.step1_url;
  if (!target) return json(req, { error: 'La automatización no tiene configurado el webhook de n8n' }, 409);
  if (!isAllowedTarget(target)) return json(req, { error: 'La URL del webhook no está permitida (usa https y un dominio público)' }, 400);

  const started = Date.now();
  const log = async (status: 'success' | 'failed' | 'requires_input', error?: string) => {
    await admin.from('executions').insert({
      automation_id: automationId,
      org_id: automation.org_id,
      user_id: auth.user.id,
      step,
      status,
      duration_ms: Date.now() - started,
      input_name: inputName,
      error: error?.slice(0, 500) ?? null,
    });
  };

  const headers: Record<string, string> = {};
  if (forwardType) headers['Content-Type'] = forwardType;
  if (endpoint?.secret) headers['x-webhook-secret'] = endpoint.secret;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: 'POST',
      headers,
      body: forwardBody,
      redirect: ALLOW_PRIVATE ? 'follow' : 'error', // una redirección podría apuntar a la red interna
      signal: AbortSignal.timeout((automation.timeout_seconds || 120) * 1000),
    });
  } catch (err) {
    const timeout = err instanceof DOMException && err.name === 'TimeoutError';
    await log('failed', timeout ? 'timeout' : String(err));
    return json(req, { error: timeout ? 'n8n no respondió a tiempo' : 'No se pudo conectar con n8n' }, 504);
  }

  if (!upstream.ok) {
    await log('failed', `n8n ${upstream.status}`);
    return json(req, { error: `n8n respondió ${upstream.status}` }, 502);
  }

  const outType = upstream.headers.get('content-type') || 'application/octet-stream';
  const bodyBytes = new Uint8Array(await upstream.arrayBuffer());

  let status: 'success' | 'failed' | 'requires_input' = 'success';
  if (outType.includes('application/json')) {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(bodyBytes));
      const payload = Array.isArray(parsed) ? parsed[0] : parsed;
      if (payload?.status === 'error') status = 'failed';
      else if (payload?.status === 'requires_input' || (automation.output_type === 'interactive_selection' && step === 1)) status = 'requires_input';
    } catch {
      // JSON inválido: se entrega igual y el cliente decide.
    }
  }
  await log(status, status === 'failed' ? 'n8n devolvió status: error' : undefined);

  const outHeaders: Record<string, string> = { ...corsHeaders(req), 'Content-Type': outType };
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) outHeaders['Content-Disposition'] = disposition;
  return new Response(bodyBytes, { status: 200, headers: outHeaders });
});
