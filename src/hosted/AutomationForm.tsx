import React, { useEffect, useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import type { Automation, AutomationCategory, ColorTheme, WebhookInputType, WebhookOutputType } from '../types';
import { COLOR_SCHEMES, renderAutomationIcon } from '../utils/theme';
import { loadEndpoint, saveAutomation, type AutomationInput, type EndpointInput } from './api';

const CATEGORIES: Exclude<AutomationCategory, 'Todas'>[] = [
  'Documentos & PDF', 'n8n Webhooks', 'IA & LLMs', 'Datos', 'Marketing', 'Notificaciones', 'Finanzas', 'Código & Scripts',
];
const ICONS = ['FileText', 'Zap', 'Sparkles', 'Bot', 'Database', 'Mail', 'Bell', 'MessageSquare', 'Workflow', 'Webhook', 'Send', 'ShieldCheck', 'RefreshCw', 'Layers', 'CreditCard', 'Cloud'];
const INPUTS: { id: WebhookInputType; label: string }[] = [
  { id: 'pdf_file', label: 'Documento PDF' },
  { id: 'excel_file', label: 'Excel (.xlsx)' },
  { id: 'csv_file', label: 'CSV' },
  { id: 'generic_file', label: 'Cualquier archivo' },
  { id: 'none', label: 'Sin archivo (solo botón)' },
];
const OUTPUTS: { id: WebhookOutputType; label: string; hint: string }[] = [
  { id: 'interactive_selection', label: 'Interactivo en 2 pasos', hint: 'Analiza, la persona revisa y elige, y después genera el archivo (p. ej. PDF → Excel).' },
  { id: 'excel_download', label: 'Descarga un archivo', hint: 'n8n devuelve un archivo que se descarga.' },
  { id: 'json_response', label: 'Muestra un resultado', hint: 'n8n devuelve JSON y se muestra en pantalla.' },
  { id: 'notification', label: 'Solo ejecuta', hint: 'Lanza el flujo (un correo, un aviso…) y confirma.' },
];

const field = 'w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm';
const label = 'block text-xs font-semibold text-slate-600 mb-1';

interface Props {
  orgId: string;
  automation: Automation | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AutomationForm({ orgId, automation, onClose, onSaved }: Props) {
  const [data, setData] = useState<AutomationInput>({
    name: automation?.name || '',
    description: automation?.description || '',
    category: (automation?.category as AutomationInput['category']) || 'Documentos & PDF',
    icon: automation?.icon || 'FileText',
    color: automation?.color || 'emerald',
    status: automation?.status || 'active',
    inputType: automation?.inputType || 'pdf_file',
    outputType: automation?.outputType || 'interactive_selection',
    timeoutSeconds: automation?.timeoutSeconds || 120,
  });
  const [endpoint, setEndpoint] = useState<EndpointInput>({ step1Url: '', step2Url: '', secret: '' });
  const [hasSecret, setHasSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!automation) return;
    loadEndpoint(automation.id).then((ep) => {
      if (ep) {
        setEndpoint({ step1Url: ep.step1Url, step2Url: ep.step2Url, secret: '' });
        setHasSecret(ep.hasSecret);
      }
    });
  }, [automation]);

  const set = <K extends keyof AutomationInput>(key: K, value: AutomationInput[K]) => setData((d) => ({ ...d, [key]: value }));
  const interactive = data.outputType === 'interactive_selection';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^https?:\/\//.test(endpoint.step1Url.trim())) return setError('Indica la URL de producción del webhook de n8n.');
    if (interactive && !/^https?:\/\//.test(endpoint.step2Url.trim())) return setError('Los flujos en 2 pasos necesitan también la URL del paso 2.');
    setBusy(true);
    try {
      await saveAutomation(orgId, data, endpoint, automation?.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="automation-form-title">
      <form onSubmit={submit} className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 id="automation-form-title" className="text-lg font-bold text-slate-800">{automation ? 'Editar automatización' : 'Nueva automatización'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          <section className="space-y-3">
            <div>
              <label className={label} htmlFor="af-name">Nombre (lo que verán los usuarios)</label>
              <input id="af-name" required maxLength={120} className={field} value={data.name} onChange={(e) => set('name', e.target.value)} placeholder="Ficha técnica PDF a hoja de trabajo" />
            </div>
            <div>
              <label className={label} htmlFor="af-desc">Descripción</label>
              <textarea id="af-desc" rows={2} className={field} value={data.description} onChange={(e) => set('description', e.target.value)} placeholder="Qué hace y cuándo usarla." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="af-cat">Categoría</label>
                <select id="af-cat" className={field} value={data.category} onChange={(e) => set('category', e.target.value as AutomationInput['category'])}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="af-status">Estado</label>
                <select id="af-status" className={field} value={data.status} onChange={(e) => set('status', e.target.value as 'active' | 'paused')}>
                  <option value="active">Activa</option>
                  <option value="paused">Pausada (no se puede ejecutar)</option>
                </select>
              </div>
            </div>
            <div>
              <span className={label}>Icono y color</span>
              <div className="flex flex-wrap gap-2 mb-2">
                {ICONS.map((i) => (
                  <button key={i} type="button" onClick={() => set('icon', i)} aria-label={`Icono ${i}`} aria-pressed={data.icon === i}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center cursor-pointer ${data.icon === i ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
                    {renderAutomationIcon(i, 'w-4 h-4')}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COLOR_SCHEMES) as ColorTheme[]).map((c) => (
                  <button key={c} type="button" onClick={() => set('color', c)} aria-label={COLOR_SCHEMES[c].label} aria-pressed={data.color === c}
                    className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer ${COLOR_SCHEMES[c].badgeBg} ${data.color === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}>
                    {COLOR_SCHEMES[c].label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="af-input">Qué sube la persona</label>
                <select id="af-input" className={field} value={data.inputType} onChange={(e) => set('inputType', e.target.value as WebhookInputType)}>
                  {INPUTS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="af-output">Qué devuelve</label>
                <select id="af-output" className={field} value={data.outputType} onChange={(e) => set('outputType', e.target.value as WebhookOutputType)}>
                  {OUTPUTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-500">{OUTPUTS.find((o) => o.id === data.outputType)?.hint}</p>
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Conexión con n8n (solo la ven los admins)</p>
            <div>
              <label className={label} htmlFor="af-url1">URL de producción del webhook{interactive ? ' · paso 1 (analizar)' : ''}</label>
              <input id="af-url1" className={`${field} font-mono`} value={endpoint.step1Url} onChange={(e) => setEndpoint({ ...endpoint, step1Url: e.target.value })} placeholder="https://tu-n8n.com/webhook/..." />
            </div>
            {interactive && (
              <div>
                <label className={label} htmlFor="af-url2">URL del webhook · paso 2 (generar)</label>
                <input id="af-url2" className={`${field} font-mono`} value={endpoint.step2Url} onChange={(e) => setEndpoint({ ...endpoint, step2Url: e.target.value })} placeholder="https://tu-n8n.com/webhook/..." />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label} htmlFor="af-secret">Secreto (cabecera x-webhook-secret)</label>
                <input id="af-secret" type="password" autoComplete="new-password" className={`${field} font-mono`} value={endpoint.secret}
                  onChange={(e) => setEndpoint({ ...endpoint, secret: e.target.value })} placeholder={hasSecret ? '•••••• guardado (déjalo vacío para no cambiarlo)' : 'Opcional pero recomendado'} />
              </div>
              <div>
                <label className={label} htmlFor="af-timeout">Tiempo máximo de espera (s)</label>
                <input id="af-timeout" type="number" min={5} max={600} className={field} value={data.timeoutSeconds} onChange={(e) => set('timeoutSeconds', Number(e.target.value) || 120)} />
              </div>
            </div>
          </section>

          {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 cursor-pointer">Cancelar</button>
          <button type="submit" disabled={busy} id="btn-save-automation" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
