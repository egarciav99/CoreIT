import React, { useState } from 'react';
import { KeyRound, Loader2, LogIn, Mail } from 'lucide-react';
import { supabase } from './api';
import { getConfig } from '../config';

const card = 'w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8';
const input = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm';
const primary = 'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-60 cursor-pointer';

function Brand() {
  const { companyName, logoUrl } = getConfig();
  return (
    <div className="text-center mb-6">
      {logoUrl && <img src={logoUrl} alt={companyName || 'Logo'} className="h-12 mx-auto mb-3 object-contain" />}
      <h1 className="text-2xl font-extrabold text-slate-800">
        CoreIT <span className="text-emerald-700">Automatización</span>
      </h1>
      {companyName && <p className="text-sm text-slate-500 mt-1">{companyName}</p>}
    </div>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
      <Brand />
      {children}
      <p className="mt-6 text-[11px] text-slate-400">
        Creado por{' '}
        <a href="https://www.egsolutions.tech/?utm_source=coreit&utm_medium=login" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-emerald-700">
          EG Solutions
        </a>
      </p>
    </div>
  );
}

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [forgot, setForgot] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(err.message.includes('Invalid login') ? 'Correo o contraseña incorrectos.' : err.message);
    setBusy(false);
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + window.location.pathname });
    if (err) setError(err.message);
    else setNotice('Si el correo existe, te hemos enviado un enlace para crear una contraseña nueva.');
    setBusy(false);
  };

  return (
    <AuthLayout>
      <form className={card} onSubmit={forgot ? sendReset : signIn}>
        <h2 className="text-lg font-bold text-slate-800 mb-1">{forgot ? 'Recuperar contraseña' : 'Iniciar sesión'}</h2>
        <p className="text-xs text-slate-500 mb-5">
          {forgot ? 'Te enviaremos un enlace a tu correo.' : 'Accede con el usuario que te ha dado tu empresa.'}
        </p>
        <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="login-email">Correo</label>
        <input id="login-email" type="email" required autoComplete="email" className={`${input} mb-4`} value={email} onChange={(e) => setEmail(e.target.value)} />
        {!forgot && (
          <>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="login-password">Contraseña</label>
            <input id="login-password" type="password" required autoComplete="current-password" className={`${input} mb-5`} value={password} onChange={(e) => setPassword(e.target.value)} />
          </>
        )}
        {error && <p className="text-xs text-rose-600 mb-3" role="alert">{error}</p>}
        {notice && <p className="text-xs text-emerald-700 mb-3">{notice}</p>}
        <button type="submit" disabled={busy} className={primary} id="btn-login">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : forgot ? <Mail className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          {forgot ? 'Enviar enlace' : 'Entrar'}
        </button>
        <button type="button" onClick={() => { setForgot(!forgot); setError(''); setNotice(''); }} className="w-full mt-3 text-xs text-slate-500 hover:text-emerald-700 cursor-pointer">
          {forgot ? 'Volver a iniciar sesión' : '¿Has olvidado la contraseña?'}
        </button>
      </form>
    </AuthLayout>
  );
}

/** Tras abrir una invitación o un enlace de recuperación: crear contraseña. */
export function SetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Usa al menos 8 caracteres.');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    const { error: err } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (err) setError(err.message);
    else onDone();
  };

  return (
    <AuthLayout>
      <form className={card} onSubmit={save}>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Crea tu contraseña</h2>
        <p className="text-xs text-slate-500 mb-5">La usarás para entrar a CoreIT a partir de ahora.</p>
        <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="new-password">Contraseña nueva</label>
        <input id="new-password" type="password" autoComplete="new-password" className={`${input} mb-4`} value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="confirm-password">Repite la contraseña</label>
        <input id="confirm-password" type="password" autoComplete="new-password" className={`${input} mb-5`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <p className="text-xs text-rose-600 mb-3" role="alert">{error}</p>}
        <button type="submit" disabled={busy} className={primary} id="btn-set-password">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
          Guardar y entrar
        </button>
      </form>
    </AuthLayout>
  );
}
