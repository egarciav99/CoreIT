/**
 * Gestión de usuarios y empresas de CoreIT (necesita service role para Auth).
 *
 * Acciones (JSON con la sesión del usuario en Authorization):
 *   · invite     { org_id, email, role }       admin de la empresa o superadmin
 *   · set_role   { org_id, user_id, role }     admin de la empresa o superadmin
 *   · remove     { org_id, user_id }           admin de la empresa o superadmin
 *   · create_org { name, slug, admin_email }   solo superadmin
 * Nunca deja una empresa sin al menos un admin.
 */
import { authenticate, corsHeaders, json, serviceClient } from '../_shared/common.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = new Set(['admin', 'user']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  const auth = await authenticate(req);
  if (!auth) return json(req, { error: 'No has iniciado sesión' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: 'Petición no válida' }, 400);
  }
  const action = String(body.action || '');
  const admin = serviceClient();
  const redirectTo = Deno.env.get('COREIT_APP_URL') || req.headers.get('origin') || undefined;

  const { data: isSuper } = await auth.userClient.rpc('is_superadmin');

  /** Invita por correo o, si la cuenta ya existe, la reutiliza. Devuelve el id del usuario. */
  async function ensureUser(email: string): Promise<string> {
    const normalized = email.trim().toLowerCase();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(normalized, { redirectTo });
    if (!error && data?.user) return data.user.id;
    for (let page = 1; page <= 50; page++) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const found = list?.users.find((u) => u.email?.toLowerCase() === normalized);
      if (found) return found.id;
      if (!list || list.users.length < 200) break;
    }
    throw error ?? new Error('No se pudo invitar al usuario');
  }

  async function adminCount(orgId: string): Promise<number> {
    const { count } = await admin.from('memberships').select('user_id', { count: 'exact', head: true })
      .eq('org_id', orgId).eq('role', 'admin');
    return count ?? 0;
  }

  try {
    if (action === 'create_org') {
      if (!isSuper) return json(req, { error: 'Solo el superadmin puede crear empresas' }, 403);
      const name = String(body.name || '').trim();
      const slug = String(body.slug || '').trim().toLowerCase();
      const adminEmail = String(body.admin_email || '').trim();
      if (!name || !/^[a-z0-9-]{2,60}$/.test(slug) || !EMAIL_RE.test(adminEmail)) {
        return json(req, { error: 'Nombre, identificador o correo no válidos' }, 400);
      }
      const { data: org, error } = await admin.from('organizations').insert({ name, slug }).select().single();
      if (error) return json(req, { error: error.code === '23505' ? 'Ese identificador ya existe' : error.message }, 400);
      const userId = await ensureUser(adminEmail);
      await admin.from('memberships').upsert({ org_id: org.id, user_id: userId, role: 'admin' });
      return json(req, { org });
    }

    const orgId = String(body.org_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(orgId)) return json(req, { error: 'Empresa no válida' }, 400);
    const { data: canManage } = await auth.userClient.rpc('is_org_admin', { p_org: orgId });
    if (!canManage) return json(req, { error: 'No tienes permisos en esta empresa' }, 403);

    if (action === 'invite') {
      const email = String(body.email || '');
      const role = String(body.role || 'user');
      if (!EMAIL_RE.test(email) || !ROLES.has(role)) return json(req, { error: 'Correo o rol no válidos' }, 400);
      const userId = await ensureUser(email);
      const { error } = await admin.from('memberships').upsert({ org_id: orgId, user_id: userId, role });
      if (error) throw error;
      return json(req, { user_id: userId });
    }

    const userId = String(body.user_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json(req, { error: 'Usuario no válido' }, 400);
    const { data: current } = await admin.from('memberships').select('role').eq('org_id', orgId).eq('user_id', userId).maybeSingle();
    if (!current) return json(req, { error: 'Ese usuario no pertenece a la empresa' }, 404);

    if (action === 'set_role') {
      const role = String(body.role || '');
      if (!ROLES.has(role)) return json(req, { error: 'Rol no válido' }, 400);
      if (current.role === 'admin' && role !== 'admin' && (await adminCount(orgId)) <= 1) {
        return json(req, { error: 'La empresa necesita al menos un admin' }, 409);
      }
      await admin.from('memberships').update({ role }).eq('org_id', orgId).eq('user_id', userId);
      return json(req, { ok: true });
    }

    if (action === 'remove') {
      if (current.role === 'admin' && (await adminCount(orgId)) <= 1) {
        return json(req, { error: 'La empresa necesita al menos un admin' }, 409);
      }
      await admin.from('memberships').delete().eq('org_id', orgId).eq('user_id', userId);
      return json(req, { ok: true });
    }

    return json(req, { error: 'Acción no válida' }, 400);
  } catch (err) {
    console.error('manage-members', err);
    return json(req, { error: 'No se pudo completar la acción' }, 500);
  }
});
