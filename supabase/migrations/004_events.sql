-- ---------------------------------------------------------------------------
-- Migration 004: calendar events.
-- Adds per-family calendar events. Reuses is_family_member/is_family_parent
-- from migration 002 for RLS; only parents may write, all members may read.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- events: family calendar entries.
-- ---------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title text not null check (char_length(trim(title)) > 0),
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_at timestamptz not null default now(),
  constraint events_ends_after_starts check (ends_at is null or ends_at > starts_at)
);

create index on public.events (family_id, starts_at);

-- ---------------------------------------------------------------------------
-- RLS: all family members can read; only parents can write.
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;

create policy "events_select_members"
  on events for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "events_insert_parents"
  on events for insert
  to authenticated
  with check (public.is_family_parent(family_id) and created_by = auth.uid());

create policy "events_update_parents"
  on events for update
  to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));

create policy "events_delete_parents"
  on events for delete
  to authenticated
  using (public.is_family_parent(family_id));
