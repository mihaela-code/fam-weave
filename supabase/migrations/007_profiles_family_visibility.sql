-- ---------------------------------------------------------------------------
-- Migration 007: profiles visibility across family members.
-- profiles previously only allowed SELECT where id = auth.uid() — a user
-- could read their own profile only. The admin panel (and future dashboard
-- views) embed profiles via joins on family_members (display_name,
-- avatar_url) to list other members of the same family; under the old
-- policy those embedded joins silently returned null for every row except
-- the caller's own, since PostgREST's embed respects the target table's RLS.
-- This adds a second, additive SELECT policy: any two users who share a
-- family_id in family_members may read each other's profile. Permissive
-- policies combine with OR, so the existing self-select policy is left in
-- place untouched — both are needed.
-- security definer on the helper: without it, the helper's own query
-- against family_members would be filtered by family_members' RLS for the
-- calling user, re-evaluated per profiles row being checked. Running as
-- definer bypasses that, the same reasoning as is_family_member/
-- is_family_parent in migration 002.
-- ---------------------------------------------------------------------------

create function public.shares_family_with(other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm1
    join public.family_members fm2 on fm1.family_id = fm2.family_id
    where fm1.user_id = auth.uid()
      and fm2.user_id = other_user
  );
$$;

create policy "profiles_select_family_members"
  on public.profiles for select
  to authenticated
  using (public.shares_family_with(id));
