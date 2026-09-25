import React, { useEffect, useState } from 'react';
import { Building2, Loader2, Trash2, UserPlus, Users, X } from 'lucide-react';
import { createOrg, inviteMember, listMembers, removeMember, setMemberRole, updateOrg, type Member, type Org, type Role } from './api';

const field = 'w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm';
const primary = 'px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer';

function Sheet({ title, icon, onClose, children }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">{icon}{title}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/** Usuarios de una empresa: invitar, cambiar rol, quitar. Y nombre/logo de la empresa. */
export function MembersPanel({ org, currentUserId, onClose, onOrgChanged }: { org: Org; currentUserId: string; onClose: () => void; onOrgChanged: () => void }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('user');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [orgName, setOrgName] = useState(org.name);
  const [logoUrl, setLogoUrl] = useState(org.logo_url || '');

  const reload = () => listMembers(org.id).then(setMembers).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, [org.id]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      if (ok) setNotice(ok);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={`Usuarios · ${org.name}`} icon={<Users className="w-5 h-5 text-emerald-700" />} onClose={onClose}>
      <form
        className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mb-2"
        onSubmit={(e) => { e.preventDefault(); run(() => inviteMember(org.id, email.trim(), role), `Invitación enviada a ${email.trim()}.`).then(() => setEmail('')); }}
      >
        <input type="email" required placeholder="correo@empresa.com" className={field} value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Correo de la persona" id="invite-email" />
        <select className={field} value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Rol" id="invite-role">
          <option value="user">Usuario (usa)</option>
          <option value="admin">Admin (configura)</option>
        </select>
        <button type="submit" disabled={busy} className={primary} id="btn-invite"><UserPlus className="w-4 h-4" /> Invitar</button>
      </form>
      <p className="text-xs text-slate-500 mb-4">Recibirá un correo para crear su contraseña. Si ya tenía cuenta, se le añade directamente.</p>
      {error && <p className="text-sm text-rose-600 mb-3" role="alert">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 mb-3">{notice}</p>}

      {!members ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-100 rounded-2xl">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-[180px]">
                <div className="text-sm font-semibold text-slate-800 break-all">{m.email}{m.user_id === currentUserId && <span className="text-xs text-slate-400 font-normal"> (tú)</span>}</div>
                <div className="text-[11px] text-slate-400">{m.last_sign_in_at ? `Último acceso: ${new Date(m.last_sign_in_at).toLocaleDateString('es-ES')}` : 'Invitación pendiente'}</div>
              </div>
              <select className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs" value={m.role} disabled={busy}
                onChange={(e) => run(() => setMemberRole(org.id, m.user_id, e.target.value as Role))} aria-label={`Rol de ${m.email}`}>
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
              <button type="button" disabled={busy} title="Quitar de la empresa" aria-label={`Quitar a ${m.email}`}
                onClick={() => window.confirm(`¿Quitar a ${m.email} de ${org.name}?`) && run(() => removeMember(org.id, m.user_id))}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}

      <form className="mt-6 pt-5 border-t border-slate-100 space-y-3"
        onSubmit={(e) => { e.preventDefault(); run(() => updateOrg(org.id, { name: orgName.trim(), logo_url: logoUrl.trim() || null }), 'Datos de la empresa guardados.').then(onOrgChanged); }}>
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Empresa</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={field} value={orgName} onChange={(e) => setOrgName(e.target.value)} aria-label="Nombre de la empresa" required />
          <input className={field} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} aria-label="URL del logo" placeholder="URL del logo (https://…)" />
        </div>
        <button type="submit" disabled={busy} className={primary}>Guardar empresa</button>
      </form>
    </Sheet>
  );
}

/** Solo superadmin: crear empresas y entrar en cualquiera. */
export function OrgsPanel({ orgs, onClose, onCreated, onOpen }: { orgs: Org[]; onClose: () => void; onCreated: (orgId: string) => void; onOpen: (orgId: string) => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const autoSlug = (v: string) => v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await createOrg(name.trim(), slug || autoSlug(name), adminEmail.trim());
      onCreated((res.org as Org).id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title="Empresas" icon={<Building2 className="w-5 h-5 text-emerald-700" />} onClose={onClose}>
      <ul className="divide-y divide-slate-100 border border-slate-100 rounded-2xl mb-6">
        {orgs.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Aún no hay empresas.</li>}
        {orgs.map((o) => (
          <li key={o.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">{o.name}</div>
              <div className="text-[11px] text-slate-400 font-mono">{o.slug}</div>
            </div>
            <button type="button" onClick={() => onOpen(o.id)} className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer">Entrar</button>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="space-y-3">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Nueva empresa</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={field} required placeholder="Nombre de la empresa" value={name} onChange={(e) => { setName(e.target.value); setSlug(autoSlug(e.target.value)); }} aria-label="Nombre de la empresa" id="org-name" />
          <input className={`${field} font-mono`} required placeholder="identificador" value={slug} onChange={(e) => setSlug(autoSlug(e.target.value))} aria-label="Identificador" id="org-slug" />
        </div>
        <input type="email" className={field} required placeholder="Correo de su admin (IT)" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} aria-label="Correo del admin" id="org-admin" />
        {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className={primary} id="btn-create-org">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />} Crear e invitar al admin</button>
      </form>
    </Sheet>
  );
}
