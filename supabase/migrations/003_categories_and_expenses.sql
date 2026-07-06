-- ---------------------------------------------------------------------------
-- Migration 003: expense categories and expenses.
-- Adds per-family categories (with five defaults seeded on family creation)
-- and expenses logged against them. Reuses is_family_member/is_family_parent
-- from migration 002 for RLS; only parents may write, all members may read.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- categories: per-family expense categories.
-- ---------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (family_id, name)
);

-- ---------------------------------------------------------------------------
-- expenses: individual spend entries, each tied to a family category.
-- category_id is on delete restrict so a category can't be dropped out from
-- under existing expenses.
-- ---------------------------------------------------------------------------
create table expenses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(10, 2) not null check (amount > 0),
  description text,
  spent_on date not null default current_date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index expenses_family_spent_on_idx on expenses (family_id, spent_on desc);

-- ---------------------------------------------------------------------------
-- RLS: all family members can read; only parents can write.
-- ---------------------------------------------------------------------------
alter table categories enable row level security;

create policy "categories_select_members"
  on categories for select
  to authenticated
  using (is_family_member(family_id));

create policy "categories_insert_parents"
  on categories for insert
  to authenticated
  with check (is_family_parent(family_id));

create policy "categories_update_parents"
  on categories for update
  to authenticated
  using (is_family_parent(family_id))
  with check (is_family_parent(family_id));

create policy "categories_delete_parents"
  on categories for delete
  to authenticated
  using (is_family_parent(family_id));

alter table expenses enable row level security;

create policy "expenses_select_members"
  on expenses for select
  to authenticated
  using (is_family_member(family_id));

create policy "expenses_insert_parents"
  on expenses for insert
  to authenticated
  with check (is_family_parent(family_id));

create policy "expenses_update_parents"
  on expenses for update
  to authenticated
  using (is_family_parent(family_id))
  with check (is_family_parent(family_id));

create policy "expenses_delete_parents"
  on expenses for delete
  to authenticated
  using (is_family_parent(family_id));

-- ---------------------------------------------------------------------------
-- Backfill: seed the five default categories for every family that already
-- exists (created before this migration ran).
-- ---------------------------------------------------------------------------
insert into categories (family_id, name)
select f.id, d.name
from families f
cross join (
  values ('Храна'), ('Сметки'), ('Транспорт'), ('Здраве'), ('Друго')
) as d(name)
on conflict (family_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- RPC: create_family — now also seeds the five default categories for the
-- newly created family. Signature, security definer settings, and pinned
-- search_path are unchanged from migration 002.
-- ---------------------------------------------------------------------------
create or replace function create_family(family_name text)
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

  insert into categories (family_id, name)
  select new_family.id, d.name
  from (
    values ('Храна'), ('Сметки'), ('Транспорт'), ('Здраве'), ('Друго')
  ) as d(name)
  on conflict (family_id, name) do nothing;

  return json_build_object(
    'id', new_family.id,
    'name', new_family.name,
    'invite_code', new_family.invite_code
  );
end;
$$;
