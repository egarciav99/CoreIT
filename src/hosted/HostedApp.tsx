import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Building2, Loader2, LogOut, Users } from 'lucide-react';
import type { Automation, AutomationCategory, ExecuteAutomationPayload, ExecutionLog, POSStats } from '../types';
import { PosHeader } from '../components/PosHeader';
import { CategoryFilter } from '../components/CategoryFilter';
import { AutomationGrid } from '../components/AutomationGrid';
import { AutomationDetailModal } from '../components/AutomationDetailModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { executeUserCode, type CodeRunnerResult } from '../utils/codeRunner';
import { downloadBinaryFile } from '../utils/fileExporter';
import type { Transport } from '../utils/n8nInteractive';
import { LoginScreen, SetPasswordScreen, AuthLayout } from './AuthScreens';
import { AutomationForm } from './AutomationForm';
import { MembersPanel, OrgsPanel } from './AdminPanels';
import {
  deleteAutomation, loadAccess, loadAutomations, loadExecutions, serverTransport, setAutomationStatus, supabase,
  type Membership, type Org, type OrgTotals,
} from './api';

const CATEGORIES: AutomationCategory[] = ['Todas', 'n8n Webhooks', 'Documentos & PDF', 'Código & Scripts', 'IA & LLMs', 'Datos', 'Marketing', 'Notificaciones', 'Finanzas'];
const ORG_KEY = 'coreit.currentOrg';

// Los enlaces de invitación y recuperación llegan con #type=invite|recovery; se lee antes de que supabase-js limpie la URL.
const LANDED_TO_SET_PASSWORD = /type=(invite|recovery)/.test(window.location.hash);

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento: solo se pierde la preferencia.
  }
}

/** Ejecuciones que no son de 2 pasos: un envío y una respuesta (archivo o JSON). */
async function runSimple(transport: Transport, file: File | null | undefined): Promise<CodeRunnerResult> {
  const started = performance.now();
  const logs: string[] = [];
  const elapsed = () => Math.round(performance.now() - started);
  try {
    let res: Response;
    if (file) {
      const form = new FormData();
      form.append('data', file, file.name);
      logs.push(`Enviando "${file.name}"...`);
      res = await transport(1, { form });
    } else {
      logs.push('Lanzando la automatización...');
      res = await transport(1, { json: {} });
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || `Error ${res.status}`);
    }
    const type = res.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      const data = await res.json();
      const payload = Array.isArray(data) ? data[0] : data;
      if (payload?.status === 'error') throw new Error(payload.message || 'La automatización devolvió un error');
      logs.push('Respuesta recibida.');
      return { success: true, status: 'success', summary: payload?.message || 'Automatización completada.', durationMs: elapsed(), logs, outputData: data };
    }
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const fileName = match ? decodeURIComponent(match[1]) : 'resultado';
    downloadBinaryFile(blob, fileName);
    logs.push(`Archivo descargado: ${fileName}`);
    return { success: true, status: 'success', summary: `Archivo generado y descargado (${fileName}).`, durationMs: elapsed(), logs, downloadFileName: fileName };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logs.push(`⚠️ ${msg}`);
    return { success: false, status: 'failed', summary: msg, durationMs: elapsed(), logs, error: msg };
  }
}

export default function HostedApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [mustSetPassword, setMustSetPassword] = useState(LANDED_TO_SET_PASSWORD);
  const [access, setAccess] = useState<{ isSuperadmin: boolean; memberships: Membership[]; orgs: Org[] } | null>(null);
  const [orgId, setOrgId] = useState<string | null>(readStorage(ORG_KEY));
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [totals, setTotals] = useState<OrgTotals>({ runs: 0, ok: 0, avgMs: null });
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<AutomationCategory>('Todas');
  const [viewMode, setViewMode] = useState<'circles' | 'pads'>(() => (readStorage('hub_pos_view_mode_v3') === 'pads' ? 'pads' : 'circles'));
  const [selected, setSelected] = useState<Automation | null>(null);
  const [editing, setEditing] = useState<Automation | null | 'new'>(null);
  const [deleting, setDeleting] = useState<Automation | null>(null);
  const [panel, setPanel] = useState<'members' | 'orgs' | null>(null);

  // ── Sesión ────────────────────────────────────────────────
  useEffect(() => {
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setMustSetPassword(true);
      if (event === 'SIGNED_OUT') {
        setAccess(null);
        setAutomations([]);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshAccess = useCallback(async () => {
    try {
      const a = await loadAccess();
      setAccess(a);
      const valid = a.orgs.some((o) => o.id === orgId);
      if (!valid) setOrgId(a.orgs[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [orgId]);

  useEffect(() => {
    if (session) refreshAccess();
  }, [session?.user.id]);

  useEffect(() => {
    if (orgId) writeStorage(ORG_KEY, orgId);
  }, [orgId]);

  // ── Datos de la empresa ───────────────────────────────────
  const refreshAutomations = useCallback(async () => {
    if (!orgId) return;
    setLoadingOrg(true);
    try {
      const { automations: list, totals: t } = await loadAutomations(orgId);
      setAutomations(list);
      setTotals(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingOrg(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (session && orgId) refreshAutomations();
  }, [session?.user.id, orgId]);

  const org = access?.orgs.find((o) => o.id === orgId) || null;
  const role = access?.isSuperadmin ? 'admin' : access?.memberships.find((m) => m.org_id === orgId)?.role;
  const canManage = role === 'admin';

  useEffect(() => {
    document.title = org ? `CoreIT · ${org.name}` : 'CoreIT Automatización';
  }, [org?.name]);

  const stats: POSStats = useMemo(() => {
    const finished = totals.runs;
    return {
      total: automations.length,
      active: automations.filter((a) => a.status === 'active').length,
      paused: automations.filter((a) => a.status === 'paused').length,
      totalExecutions: finished,
      successRate: finished ? Math.round((totals.ok / finished) * 1000) / 10 : null,
      avgLatencyMs: totals.avgMs,
    };
  }, [automations, totals]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<AutomationCategory, number>;
    counts['Todas'] = automations.length;
    automations.forEach((a) => { counts[a.category] = (counts[a.category] || 0) + 1; });
    return counts;
  }, [automations]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return automations.filter((a) =>
      (activeCategory === 'Todas' || a.category === activeCategory) &&
      (!q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)));
  }, [automations, activeCategory, searchQuery]);

  // ── Acciones ──────────────────────────────────────────────
  const openAutomation = async (a: Automation) => {
    setSelected({ ...a, logs: [] });
    const logs = await loadExecutions(a.id).catch(() => []);
    setSelected((cur) => (cur && cur.id === a.id ? { ...cur, logs } : cur));
  };

  const execute = async (automation: Automation, payload?: ExecuteAutomationPayload): Promise<ExecutionLog> => {
    const transport = serverTransport(automation.id, (automation.timeoutSeconds || 120) * 1000);
    const result = automation.outputType === 'interactive_selection'
      ? await executeUserCode(automation, {
          file: payload?.file,
          step: payload?.step,
          selectedSection: payload?.selectedSection,
          intermediateData: payload?.intermediateData,
          inputFileName: payload?.inputFileName,
          transport,
        })
      : await runSimple(transport, payload?.file);

    const log: ExecutionLog = {
      id: `run-${Date.now()}`,
      timestamp: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
      status: result.status || (result.success ? 'success' : 'failed'),
      durationMs: result.durationMs,
      inputFileName: payload?.file?.name,
      downloadFileName: result.downloadFileName,
      intermediateData: result.intermediateData,
      responseSummary: result.summary,
      stepDetails: result.logs,
      outputData: result.outputData,
      error: result.error,
    };
    // El modal lee la revisión pendiente del último registro, así que se añade el de esta ejecución
    // (con los datos del análisis) y los contadores se recargan del servidor.
    setSelected((cur) => (cur && cur.id === automation.id ? { ...cur, logs: [log, ...cur.logs].slice(0, 20) } : cur));
    refreshAutomations();
    return log;
  };

  const toggleStatus = async (id: string) => {
    const a = automations.find((x) => x.id === id);
    if (!a) return;
    await setAutomationStatus(id, a.status === 'active' ? 'paused' : 'active');
    setSelected((cur) => (cur && cur.id === id ? { ...cur, status: cur.status === 'active' ? 'paused' : 'active' } : cur));
    refreshAutomations();
  };

  const signOut = async () => {
    await supabase().auth.signOut();
  };

  // ── Pantallas ─────────────────────────────────────────────
  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;
  }
  if (!session) return <LoginScreen />;
  if (mustSetPassword) {
    return <SetPasswordScreen onDone={() => { setMustSetPassword(false); window.history.replaceState(null, '', window.location.pathname); }} />;
  }
  if (!access) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>;
  }
  if (access.orgs.length === 0 && !access.isSuperadmin) {
    return (
      <AuthLayout>
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-slate-700 mb-4">Tu usuario aún no pertenece a ninguna empresa. Pide a tu admin que te invite.</p>
          <button onClick={signOut} className="text-sm font-semibold text-emerald-700 hover:underline cursor-pointer">Cerrar sesión</button>
        </div>
      </AuthLayout>
    );
  }

  const toolbar = (
    <div className="flex items-center gap-2 flex-wrap">
      {access.orgs.length > 1 && (
        <select value={orgId ?? ''} onChange={(e) => setOrgId(e.target.value)} aria-label="Empresa" id="org-switcher"
          className="px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 max-w-[160px]">
          {access.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      )}
      {canManage && org && (
        <button onClick={() => setPanel('members')} id="btn-open-members" className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer">
          <Users className="w-3.5 h-3.5" /> Usuarios
        </button>
      )}
      {access.isSuperadmin && (
        <button onClick={() => setPanel('orgs')} id="btn-open-orgs" className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:text-emerald-700 cursor-pointer">
          <Building2 className="w-3.5 h-3.5" /> Empresas
        </button>
      )}
      <span className="hidden md:inline text-[11px] text-slate-500 max-w-[180px] truncate" title={session.user.email}>
        {session.user.email} · <strong className="text-slate-700">{access.isSuperadmin ? 'Superadmin' : canManage ? 'Admin' : 'Usuario'}</strong>
      </span>
      <button onClick={signOut} id="btn-logout" title="Cerrar sesión" aria-label="Cerrar sesión" className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600 cursor-pointer">
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <PosHeader
        stats={stats}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreateModal={canManage && org ? () => setEditing('new') : undefined}
        viewMode={viewMode}
        onViewModeChange={(m) => { setViewMode(m); writeStorage('hub_pos_view_mode_v3', m); }}
        toolbarExtra={toolbar}
        companyName={org?.name}
        logoUrl={org?.logo_url || undefined}
        executionsLabel="Ejecuciones"
      />
      <CategoryFilter categories={CATEGORIES} activeCategory={activeCategory} onSelectCategory={setActiveCategory} categoryCounts={categoryCounts} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {error && <p className="mb-4 text-sm text-rose-600" role="alert">{error}</p>}
        {!org ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            Aún no hay empresas. {access.isSuperadmin && <button onClick={() => setPanel('orgs')} className="text-emerald-700 font-semibold hover:underline cursor-pointer">Crea la primera</button>}
          </div>
        ) : loadingOrg && automations.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
        ) : (
          <AutomationGrid
            automations={filtered}
            viewMode={viewMode}
            onSelectAutomation={openAutomation}
            onQuickRun={(_e, a) => openAutomation(a)}
            onDeleteClick={canManage ? (_e, a) => setDeleting(a) : undefined}
            onOpenCreateModal={canManage ? () => setEditing('new') : undefined}
            triggeringId={null}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-3 px-4 sm:px-8 text-[11px] text-slate-400 text-center sm:text-right">
        Creado por{' '}
        <a href="https://www.egsolutions.tech/?utm_source=coreit&utm_medium=footer" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-emerald-700">EG Solutions</a>
      </footer>

      <AutomationDetailModal
        automation={selected}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        onExecute={execute}
        hosted
        onToggleStatus={canManage ? toggleStatus : undefined}
        onRequestDelete={canManage ? (a) => setDeleting(a) : undefined}
        onEdit={canManage ? (a) => { setSelected(null); setEditing(a); } : undefined}
      />

      {editing && org && (
        <AutomationForm
          orgId={org.id}
          automation={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refreshAutomations(); }}
        />
      )}

      <DeleteConfirmModal
        automation={deleting}
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async (id) => {
          await deleteAutomation(id);
          setDeleting(null);
          setSelected(null);
          refreshAutomations();
        }}
      />

      {panel === 'members' && org && (
        <MembersPanel org={org} currentUserId={session.user.id} onClose={() => setPanel(null)} onOrgChanged={refreshAccess} />
      )}
      {panel === 'orgs' && (
        <OrgsPanel
          orgs={access.orgs}
          onClose={() => setPanel(null)}
          onOpen={(id) => { setOrgId(id); setPanel(null); }}
          onCreated={async (id) => { await refreshAccess(); setOrgId(id); setPanel(null); }}
        />
      )}
    </div>
  );
}
