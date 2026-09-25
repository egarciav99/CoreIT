-- ============================================================
-- CoreIT — empresas, usuarios con rol, automatizaciones e historial
--
-- Roles:
--   · superadmin (tabla platform_admins): ve y gestiona todas las empresas.
--   · admin de empresa (memberships.role = 'admin'): crea y configura las
--     automatizaciones de su empresa y gestiona sus usuarios.
--   · usuario (memberships.role = 'user'): ve y ejecuta las automatizaciones.
--
-- Las URLs y secretos de n8n viven en automation_endpoints, que solo leen
-- los admins. Las ejecuciones pasan por la Edge Function run-automation.
-- ============================================================

-- ── Tablas ────────────────────────────────────────────────────
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  logo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  org_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists memberships_user_idx on public.memberships (user_id);

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations on delete cascade,
  name text not null check (length(name) between 1 and 120),
  description text not null default '',
  category text not null default 'Documentos & PDF',
  icon text not null default 'Zap',
  color text not null default 'emerald',
  status text not null default 'active' check (status in ('active', 'paused')),
  input_type text not null default 'pdf_file'
    check (input_type in ('pdf_file', 'excel_file', 'csv_file', 'generic_file', 'json_payload', 'text_input', 'none')),
  output_type text not null default 'json_response'
    check (output_type in ('interactive_selection', 'excel_download', 'csv_download', 'json_response', 'notification')),
  timeout_seconds int not null default 120 check (timeout_seconds between 5 and 600),
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists automations_org_idx on public.automations (org_id);

-- Secretos: nunca los ve un usuario normal ni el navegador al ejecutar.
create table if not exists public.automation_endpoints (
  automation_id uuid primary key references public.automations on delete cascade,
  step1_url text not null check (step1_url ~ '^https?://'),
  step2_url text check (step2_url is null or step2_url ~ '^https?://'),
  secret text
);

create table if not exists public.executions (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations on delete cascade,
  org_id uuid not null references public.organizations on delete cascade,
  user_id uuid references auth.users on delete set null,
  step int not null default 1,
  status text not null check (status in ('success', 'failed', 'requires_input')),
  duration_ms int,
  input_name text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists executions_org_created_idx on public.executions (org_id, created_at desc);
create index if not exists executions_automation_idx on public.executions (automation_id, created_at desc);

-- ── Funciones de permisos ─────────────────────────────────────
-- security definer: consultan memberships sin depender de sus propias políticas.
create or replace function public.is_superadmin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create or replace function public.org_role(p_org uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from memberships where org_id = p_org and user_id = auth.uid();
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_superadmin() or public.org_role(p_org) is not null;
$$;

create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_superadmin() or public.org_role(p_org) = 'admin';
$$;

-- Lista de miembros con su correo (solo para admins de esa empresa).
create or replace function public.org_members(p_org uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_org_admin(p_org) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at, u.last_sign_in_at
    from memberships m join auth.users u on u.id = m.user_id
    where m.org_id = p_org
    order by m.created_at;
end;
$$;

-- Estadísticas por automatización para las tarjetas (respeta lo que cada uno puede ver).
create or replace function public.automation_stats(p_org uuid)
returns table (automation_id uuid, runs bigint, ok bigint, avg_ms numeric, last_run timestamptz)
language sql stable security invoker set search_path = public as $$
  select e.automation_id,
         count(*) filter (where e.status <> 'requires_input'),
         count(*) filter (where e.status = 'success'),
         avg(e.duration_ms) filter (where e.status <> 'requires_input'),
         max(e.created_at)
  from executions e
  where e.org_id = p_org
  group by e.automation_id;
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists automations_touch on public.automations;
create trigger automations_touch before update on public.automations
  for each row execute function public.touch_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.platform_admins enable row level security;
alter table public.memberships enable row level security;
alter table public.automations enable row level security;
alter table public.automation_endpoints enable row level security;
alter table public.executions enable row level security;

drop policy if exists org_select on public.organizations;
create policy org_select on public.organizations for select using (public.is_org_member(id));
drop policy if exists org_insert on public.organizations;
create policy org_insert on public.organizations for insert with check (public.is_superadmin());
drop policy if exists org_update on public.organizations;
create policy org_update on public.organizations for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));
drop policy if exists org_delete on public.organizations;
create policy org_delete on public.organizations for delete using (public.is_superadmin());

drop policy if exists pa_select on public.platform_admins;
create policy pa_select on public.platform_admins for select using (user_id = auth.uid());
-- Alta de superadmins solo por SQL (ver docs/ENTREGA.md).

drop policy if exists mem_select on public.memberships;
create policy mem_select on public.memberships for select
  using (user_id = auth.uid() or public.is_org_admin(org_id));
-- Altas, cambios de rol y bajas: Edge Function manage-members (valida permisos y evita dejar una empresa sin admin).

drop policy if exists aut_select on public.automations;
create policy aut_select on public.automations for select using (public.is_org_member(org_id));
drop policy if exists aut_insert on public.automations;
create policy aut_insert on public.automations for insert with check (public.is_org_admin(org_id));
drop policy if exists aut_update on public.automations;
create policy aut_update on public.automations for update using (public.is_org_admin(org_id)) with check (public.is_org_admin(org_id));
drop policy if exists aut_delete on public.automations;
create policy aut_delete on public.automations for delete using (public.is_org_admin(org_id));

drop policy if exists ep_all on public.automation_endpoints;
create policy ep_all on public.automation_endpoints for all
  using (public.is_org_admin((select a.org_id from public.automations a where a.id = automation_id)))
  with check (public.is_org_admin((select a.org_id from public.automations a where a.id = automation_id)));

drop policy if exists ex_select on public.executions;
create policy ex_select on public.executions for select
  using (user_id = auth.uid() or public.is_org_admin(org_id));
-- Las ejecuciones las registra la Edge Function run-automation con service role.

-- ── Permisos de ejecución de funciones ────────────────────────
revoke execute on function public.org_members(uuid) from public, anon;
grant execute on function public.org_members(uuid) to authenticated;
revoke execute on function public.automation_stats(uuid) from public, anon;
grant execute on function public.automation_stats(uuid) to authenticated;
