-- ---------------------------------------------------------------------------
-- Migration 005: avatar uploads.
-- Adds profiles.avatar_url, a public 'avatars' Storage bucket, and RLS
-- policies on storage.objects so each user can manage only their own
-- avatar file, stored at {user_id}/avatar.{ext}.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- profiles.avatar_url: already added in migration 001; the guard here just
-- makes this migration safe to run standalone.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_url text;

-- ---------------------------------------------------------------------------
-- Storage bucket: public read, so avatar images render without signed
-- URLs. Writes are restricted by the policies below.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS on storage.objects for the 'avatars' bucket.
-- Path convention: {user_id}/avatar.{ext} — ownership is checked via the
-- first path segment. DROP POLICY IF EXISTS precedes each CREATE POLICY
-- since CREATE POLICY has no IF NOT EXISTS, keeping this migration
-- re-runnable.
-- ---------------------------------------------------------------------------
drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
