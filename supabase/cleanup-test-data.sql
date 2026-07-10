-- ---------------------------------------------------------------------------
-- cleanup-test-data.sql — manual, human-reviewed deletion of old test
-- families. Not a migration: not numbered, not part of the migration
-- history, not run automatically.
--
-- Use:
--   1. Run SECTION 1 (a plain SELECT — safe to run anytime, changes nothing).
--   2. Review the results and decide which family UUIDs to delete.
--   3. Edit SECTION 2: replace the placeholder UUID in target_family_ids
--      with the real UUID(s) you decided on.
--   4. Remove the /* ... */ block-comment markers wrapping SECTION 2.
--   5. Run SECTION 2.
--
-- What this script NEVER does:
--   - Never deletes by name/pattern matching (no ILIKE) — only by explicit
--     UUIDs a human copied from SECTION 1's output.
--   - Never deletes the family literally named 'Семейство Демо' — hard
--     guard inside the DO block, see SECTION 2.
--   - Never touches auth.users. See the note at the end of SECTION 2 for
--     what that means for member accounts after a family is deleted.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- SECTION 1 — PREVIEW (read-only, safe to run at any time)
-- Lists every family with member/expense/event/category counts and the
-- email of every member (joined through auth.users). Review this output,
-- pick the family UUIDs to delete, and paste them into SECTION 2 below.
-- ===========================================================================

select
  f.id,
  f.name,
  f.created_at,
  (select count(*) from public.family_members fm where fm.family_id = f.id) as member_count,
  (select count(*) from public.expenses e where e.family_id = f.id) as expense_count,
  (select count(*) from public.events ev where ev.family_id = f.id) as event_count,
  (select count(*) from public.categories c where c.family_id = f.id) as category_count,
  (
    select string_agg(u.email, ', ' order by u.email)
    from public.family_members fm2
    join auth.users u on u.id = fm2.user_id
    where fm2.family_id = f.id
  ) as member_emails
from public.families f
order by f.created_at desc;

-- ===========================================================================
-- SECTION 2 — DELETE (commented out by default — see steps 3-5 above)
--
-- FK / trigger analysis this section relies on (read from the migrations,
-- not assumed):
--
-- ON DELETE rules on tables reachable from families.id (migrations 002-004):
--   - family_members.family_id -> families(id)   ON DELETE CASCADE
--   - categories.family_id     -> families(id)   ON DELETE CASCADE
--   - expenses.family_id       -> families(id)   ON DELETE CASCADE
--   - events.family_id         -> families(id)   ON DELETE CASCADE
--   - expenses.category_id     -> categories(id) ON DELETE RESTRICT
--     (migration 003: "category_id is on delete restrict so a category
--     can't be dropped out from under existing expenses")
--
-- Why expenses are deleted explicitly before `delete from families`:
--   A single `delete from families where id = X` fans out into cascade
--   deletes on family_members, categories, and expenses — all reacting
--   independently to the same statement. If PostgreSQL processes the
--   categories cascade before the expenses cascade, deleting a categories
--   row while an expenses row still references it trips the RESTRICT FK
--   on expenses.category_id and aborts the whole statement. Explicitly
--   deleting expenses first removes that ordering hazard entirely — by the
--   time the families row (and its cascades) go, no expenses row exists to
--   restrict anything. family_members, categories, and events have no such
--   RESTRICT hazard and are left to plain CASCADE.
--
-- Does the last-parent-protection trigger (migration 006,
-- trg_last_parent_protection on public.family_members, function
-- public.assert_not_last_parent) block this?
--   No — it is deliberately designed not to. Deleting `families` cascades
--   to delete its family_members rows; that cascade fires
--   trg_last_parent_protection's BEFORE DELETE logic for each row. The
--   function's own cascade guard runs first:
--     "if not exists (select 1 from public.families where id = old.family_id)
--      then return old; end if;"
--   By the time the cascaded family_members delete executes, the families
--   row has already been removed by the outer statement (visible as gone
--   within the same transaction), so this check is true and the function
--   returns immediately — the last-parent count check below it never runs.
--   This is exactly the behavior migration 006 documents as its purpose:
--   "otherwise a family could never be deleted." A parent-only family (or
--   one with several parents) deletes cleanly either way.
--
-- If any exception is raised anywhere in the loop below (missing id, demo
-- family, etc.), the entire DO block's transaction is rolled back by
-- Postgres — no partial deletes from earlier iterations persist.
-- ===========================================================================

/*
do $$
declare
  target_family_ids uuid[] := array[
    '00000000-0000-0000-0000-000000000000'::uuid
    -- , 'replace-with-a-real-uuid-from-section-1'::uuid
  ];
  placeholder_id constant uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  fid uuid;
  family_name text;
  deleted_expenses int;
  total_families_deleted int := 0;
  total_expenses_deleted int := 0;
begin
  if target_family_ids is null or array_length(target_family_ids, 1) is null then
    raise exception 'target_family_ids е празен. Впиши explicit UUID-та (виж СЕКЦИЯ 1) преди да пуснеш това.';
  end if;

  if placeholder_id = any(target_family_ids) then
    raise exception 'target_family_ids съдържа placeholder UUID-а (%). Замени го с реални UUID-та от прегледа в СЕКЦИЯ 1.', placeholder_id;
  end if;

  foreach fid in array target_family_ids loop
    select name into family_name from public.families where id = fid;

    if family_name is null then
      raise exception 'Семейство с id % не съществува.', fid;
    end if;

    if family_name = 'Семейство Демо' then
      raise exception 'Семейство "Семейство Демо" (id %) никога не се трие от този скрипт.', fid;
    end if;

    delete from public.expenses where family_id = fid;
    get diagnostics deleted_expenses = row_count;
    total_expenses_deleted := total_expenses_deleted + deleted_expenses;

    -- family_members, categories, events cascade from this single delete;
    -- see the analysis above for why the last-parent trigger does not
    -- block it.
    delete from public.families where id = fid;

    total_families_deleted := total_families_deleted + 1;
    raise notice 'Изтрито семейство "%" (id %) — % разхода изтрити explicit, останалото cascade.',
      family_name, fid, deleted_expenses;
  end loop;

  raise notice 'Готово. Изтрити семейства: %. Общо explicit изтрити разходи: %.',
    total_families_deleted, total_expenses_deleted;
end $$;
*/

-- ---------------------------------------------------------------------------
-- auth.users is never touched by this script. After a family is deleted,
-- the auth.users (and profiles) rows for its former members still exist —
-- only their family_members rows are gone. On next login they simply have
-- no family and requireFamily() sends them to onboarding.html to create or
-- join one. If those orphaned accounts should be removed entirely, that is
-- a separate, manual step: Supabase Dashboard → Authentication → delete the
-- user(s) there (deleting an auth.users row cascades to profiles per
-- migration 001's `on delete cascade`).
-- ---------------------------------------------------------------------------