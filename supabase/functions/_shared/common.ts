import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

/** Orígenes permitidos (coma). Vacío = cualquiera; en producción, pon el dominio de CoreIT. */
const ALLOWED = (Deno.env.get('COREIT_ALLOWED_ORIGINS') || '').split(',').map((s) => s.trim()).filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allow = ALLOWED.length === 0 ? '*' : ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Expose-Headers': 'Content-Disposition, Content-Type',
    Vary: 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Usuario autenticado + cliente que actúa con sus permisos (RLS). */
export async function authenticate(req: Request): Promise<{ user: User; userClient: SupabaseClient } | null> {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser(authHeader.slice(7));
  if (error || !data.user) return null;
  return { user: data.user, userClient };
}
