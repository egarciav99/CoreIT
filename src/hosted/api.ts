import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from '../config';
import type { Automation, AutomationCategory, ColorTheme, ExecutionLog, WebhookInputType, WebhookOutputType } from '../types';
import { fetchWithTimeout, type Transport } from '../utils/n8nInteractive';

export type Role = 'admin' | 'user';

export interface Org {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface Membership {
  org_id: string;
  role: Role;
}

export interface Member {
  user_id: string;
  email: string;
  role: Role;
  created_at: string;
  last_sign_in_at: string | null;
}

/** Fila de la tabla automations. */
interface AutomationRow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  status: 'active' | 'paused';
  input_type: WebhookInputType;
  output_type: WebhookOutputType;
  timeout_seconds: number;
  created_at: string;
}

export interface AutomationInput {
  name: string;
  description: string;
  category: Exclude<AutomationCategory, 'Todas'>;
  icon: string;
  color: ColorTheme;
  status: 'active' | 'paused';
  inputType: WebhookInputType;
  outputType: WebhookOutputType;
  timeoutSeconds: number;
}

export interface EndpointInput {
  step1Url: string;
  step2Url: string;
  /** Vacío = no cambiar el secreto guardado. */
  secret: string;
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = getConfig().supabase;
    client = createClient(url, anonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
  }
  return client;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// ── Sesión y permisos ─────────────────────────────────────────
export async function loadAccess(): Promise<{ isSuperadmin: boolean; memberships: Membership[]; orgs: Org[] }> {
  const sb = supabase();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id;
  const [superRes, memRes, orgRes] = await Promise.all([
    sb.rpc('is_superadmin'),
    sb.from('memberships').select('org_id, role').eq('user_id', userId ?? ''),
    sb.from('organizations').select('id, name, slug, logo_url').order('name'),
  ]);
  return {
    isSuperadmin: Boolean(superRes.data),
    memberships: check(memRes) as Membership[],
    orgs: check(orgRes) as Org[],
  };
}

// ── Automatizaciones ──────────────────────────────────────────
function relative(iso: string | null): string | null {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.round(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString('es-ES');
}

/** Convierte una fila de la base de datos al tipo que usan los componentes del hub. */
function toAutomation(row: AutomationRow, stats?: { runs: number; ok: number; avg_ms: number | null; last_run: string | null }): Automation {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category as Automation['category'],
    status: row.status,
    triggerType: 'n8n_webhook',
    color: row.color as ColorTheme,
    icon: row.icon,
    executionCount: stats?.runs ?? 0,
    lastExecutedAt: relative(stats?.last_run ?? null),
    avgDurationMs: stats?.avg_ms ? Math.round(stats.avg_ms) : 0,
    webhookProvider: 'n8n',
    inputType: row.input_type,
    outputType: row.output_type,
    timeoutSeconds: row.timeout_seconds,
    targetService: 'n8n',
    logs: [],
    createdAt: row.created_at.slice(0, 10),
  };
}

export interface OrgTotals {
  runs: number;
  ok: number;
  avgMs: number | null;
}

export async function loadAutomations(orgId: string): Promise<{ automations: Automation[]; totals: OrgTotals }> {
  const sb = supabase();
  const [rows, stats] = await Promise.all([
    sb.from('automations').select('*').eq('org_id', orgId).order('created_at'),
    sb.rpc('automation_stats', { p_org: orgId }),
  ]);
  const byId = new Map<string, { runs: number; ok: number; avg_ms: number | null; last_run: string | null }>();
  for (const s of (stats.data || []) as Array<{ automation_id: string; runs: number; ok: number; avg_ms: number | null; last_run: string | null }>) {
    byId.set(s.automation_id, { runs: Number(s.runs), ok: Number(s.ok), avg_ms: s.avg_ms === null ? null : Number(s.avg_ms), last_run: s.last_run });
  }
  const automations = (check(rows) as AutomationRow[]).map((r) => toAutomation(r, byId.get(r.id)));
  let runs = 0, ok = 0, weighted = 0;
  byId.forEach((v) => {
    runs += v.runs;
    ok += v.ok;
    weighted += (v.avg_ms ?? 0) * v.runs;
  });
  return { automations, totals: { runs, ok, avgMs: runs ? Math.round(weighted / runs) : null } };
}

/** Últimas ejecuciones (un usuario ve las suyas; un admin, las de todos). */
export async function loadExecutions(automationId: string): Promise<ExecutionLog[]> {
  const rows = check(
    await supabase()
      .from('executions')
      .select('id, status, duration_ms, input_name, error, step, created_at')
      .eq('automation_id', automationId)
      .order('created_at', { ascending: false })
      .limit(20)
  ) as Array<{ id: string; status: ExecutionLog['status']; duration_ms: number | null; input_name: string | null; error: string | null; step: number; created_at: string }>;
  return rows.map((r) => ({
    id: r.id,
    timestamp: new Date(r.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
    status: r.status,
    durationMs: r.duration_ms ?? 0,
    inputFileName: r.input_name ?? undefined,
    responseSummary: r.status === 'requires_input' ? 'Documento analizado, pendiente de revisión' : r.status === 'success' ? `Paso ${r.step} completado` : r.error || 'Error',
    error: r.error ?? undefined,
  }));
}

export async function loadEndpoint(automationId: string): Promise<{ step1Url: string; step2Url: string; hasSecret: boolean } | null> {
  const { data } = await supabase().from('automation_endpoints').select('step1_url, step2_url, secret').eq('automation_id', automationId).maybeSingle();
  return data ? { step1Url: data.step1_url, step2Url: data.step2_url || '', hasSecret: Boolean(data.secret) } : null;
}

export async function saveAutomation(orgId: string, input: AutomationInput, endpoint: EndpointInput, id?: string): Promise<string> {
  const sb = supabase();
  const row = {
    org_id: orgId,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category,
    icon: input.icon,
    color: input.color,
    status: input.status,
    input_type: input.inputType,
    output_type: input.outputType,
    timeout_seconds: input.timeoutSeconds,
  };
  const saved = id
    ? check(await sb.from('automations').update(row).eq('id', id).select('id').single())
    : check(await sb.from('automations').insert(row).select('id').single());
  const automationId = (saved as { id: string }).id;

  const ep: Record<string, unknown> = {
    automation_id: automationId,
    step1_url: endpoint.step1Url.trim(),
    step2_url: input.outputType === 'interactive_selection' ? endpoint.step2Url.trim() || null : null,
  };
  if (endpoint.secret.trim()) ep.secret = endpoint.secret.trim();
  check(await sb.from('automation_endpoints').upsert(ep));
  return automationId;
}

export async function setAutomationStatus(id: string, status: 'active' | 'paused'): Promise<void> {
  check(await supabase().from('automations').update({ status }).eq('id', id));
}

export async function deleteAutomation(id: string): Promise<void> {
  check(await supabase().from('automations').delete().eq('id', id));
}

// ── Ejecución a través del servidor ───────────────────────────
/** Transporte que pasa por la Edge Function run-automation (el navegador no ve n8n). */
export function serverTransport(automationId: string, timeoutMs: number): Transport {
  return async (step, body) => {
    const sb = supabase();
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    const { url, anonKey } = getConfig().supabase;
    let init: RequestInit;
    if (body.form) {
      const form = new FormData();
      form.append('automation_id', automationId);
      form.append('step', String(step));
      body.form.forEach((value, key) => form.append(key, value));
      init = { method: 'POST', body: form };
    } else {
      init = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation_id: automationId, step, payload: body.json ?? {} }),
      };
    }
    init.headers = { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}`, apikey: anonKey };
    return fetchWithTimeout(`${url.replace(/\/+$/, '')}/functions/v1/run-automation`, init, timeoutMs + 10000);
  };
}

// ── Usuarios y empresas ───────────────────────────────────────
async function manage(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data, error } = await supabase().functions.invoke('manage-members', { body });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(detail?.error || error.message);
  }
  return data as Record<string, unknown>;
}

export async function listMembers(orgId: string): Promise<Member[]> {
  return check(await supabase().rpc('org_members', { p_org: orgId })) as Member[];
}

export const inviteMember = (orgId: string, email: string, role: Role) => manage({ action: 'invite', org_id: orgId, email, role });
export const setMemberRole = (orgId: string, userId: string, role: Role) => manage({ action: 'set_role', org_id: orgId, user_id: userId, role });
export const removeMember = (orgId: string, userId: string) => manage({ action: 'remove', org_id: orgId, user_id: userId });
export const createOrg = (name: string, slug: string, adminEmail: string) => manage({ action: 'create_org', name, slug, admin_email: adminEmail });

export async function updateOrg(orgId: string, patch: { name?: string; logo_url?: string | null }): Promise<void> {
  check(await supabase().from('organizations').update(patch).eq('id', orgId));
}
