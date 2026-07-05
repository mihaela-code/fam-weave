-- ---------------------------------------------------------------------------
-- Invite code generator
-- 8 chars, uppercase letters + digits, ambiguous characters excluded
-- (0/O, 1/I/L) so codes are easy to read and type back in.
-- ---------------------------------------------------------------------------
create function generate_invite_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text := '';
begin
  for i in 1..8 loop
    code := code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- families: the tenant. invite_code is regenerate-able by a parent later
-- (not in this migration's scope); created_by is the founding user.
-- ---------------------------------------------------------------------------
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 50),
  invite_code text not null unique default generate_invite_code(),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- family_members: junction table user<->family with a family-scoped role.
-- ---------------------------------------------------------------------------
create table family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('parent', 'child')),
  joined_at timestamptz not null default now(),
  unique (family_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies.
-- security definer: policies on family_members call these, and if they ran
-- as the calling user they would themselves be filtered by family_members'
-- own RLS, causing recursion. Running as definer bypasses that.
-- ---------------------------------------------------------------------------
create function is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from family_members
    where family_id = fid and user_id = auth.uid()
  );
$$;

create function is_family_parent(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from family_members
    where family_id = fid and user_id = auth.uid() and role = 'parent'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS: deny by default. No INSERT/DELETE policy on families and no INSERT
-- policy on family_members — those writes only happen inside the
-- security-definer RPCs below.
-- ---------------------------------------------------------------------------
alter table families enable row level security;

create policy "families_select_members"
  on families for select
  to authenticated
  using (is_family_member(id));

create policy "families_update_parents"
  on families for update
  to authenticated
  using (is_family_parent(id));

alter table family_members enable row level security;

create policy "family_members_select_members"
  on family_members for select
  to authenticated
  using (is_family_member(family_id));

create policy "family_members_update_parents"
  on family_members for update
  to authenticated
  using (is_family_parent(family_id));

create policy "family_members_delete_parents"
  on family_members for delete
  to authenticated
  using (is_family_parent(family_id));

-- ---------------------------------------------------------------------------
-- RPC: create_family — founding user creates a family and becomes its parent.
-- ---------------------------------------------------------------------------
create function create_family(family_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family families;
begin
  if family_name is null or char_length(trim(family_name)) < 2 or char_length(trim(family_name)) > 50 then
    raise exception 'INVALID_NAME';
  end if;

  insert into families (name, created_by)
  values (trim(family_name), auth.uid())
  returning * into new_family;

  insert into family_members (family_id, user_id, role)
  values (new_family.id, auth.uid(), 'parent');

  return json_build_object(
    'id', new_family.id,
    'name', new_family.name,
    'invite_code', new_family.invite_code
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: join_family_by_code — user joins an existing family as a child.
-- ---------------------------------------------------------------------------
create function join_family_by_code(code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family families;
begin
  select * into target_family
  from families
  where invite_code = upper(trim(code));

  if not found then
    raise exception 'INVALID_CODE';
  end if;

  if exists (
    select 1 from family_members
    where family_id = target_family.id and user_id = auth.uid()
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  insert into family_members (family_id, user_id, role)
  values (target_family.id, auth.uid(), 'child');

  return json_build_object(
    'id', target_family.id,
    'name', target_family.name
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC execute privileges: authenticated users only, never anon.
-- ---------------------------------------------------------------------------
revoke execute on function create_family(text) from anon;
revoke execute on function join_family_by_code(text) from anon;

grant execute on function create_family(text) to authenticated;
grant execute on function join_family_by_code(text) to authenticated;
