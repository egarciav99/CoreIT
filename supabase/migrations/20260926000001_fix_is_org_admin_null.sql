-- is_org_admin devolvía NULL (no false) para quien no pertenece a la empresa,
-- y `if not is_org_admin(...)` en plpgsql no bloqueaba: org_members mostraba
-- los miembros de cualquier empresa.
create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_superadmin() or coalesce(public.org_role(p_org) = 'admin', false);
$$;

create or replace function public.org_members(p_org uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(public.is_org_admin(p_org), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at, u.last_sign_in_at
    from memberships m join auth.users u on u.id = m.user_id
    where m.org_id = p_org
    order by m.created_at;
end;
$$;
