-- ---------------------------------------------------------------------------
-- Migration 006: last-parent protection.
-- Business rule: every family must always have at least one parent, so
-- there is always someone who can manage members, roles, and invites.
-- Blocks the two ways a family could end up with zero parents: demoting
-- its last remaining parent to child, or deleting its last remaining
-- parent's membership row. Enforced in the database (not just the UI)
-- so it holds regardless of caller — RPC, dashboard, or future code path.
--
-- Cascade guard: the DELETE branch skips the check when the parent
-- families row is already gone (i.e. this delete arrived via ON DELETE
-- CASCADE from families) — otherwise a family could never be deleted.
--
-- Advisory lock: each branch that counts remaining parents first takes a
-- transaction-scoped advisory lock keyed on family_id. This serializes
-- concurrent role changes within the same family, closing the race where
-- two parents demote themselves at the same time and each transaction
-- counts the other as the remaining parent.
-- ---------------------------------------------------------------------------

create or replace function public.assert_not_last_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_parents integer;
begin
  if tg_op = 'DELETE' then
    -- Cascade guard: if the parent family row is already gone, the whole
    -- family is being deleted — do not block the cascade.
    if not exists (select 1 from public.families where id = old.family_id) then
      return old;
    end if;

    if old.role = 'parent' then
      perform pg_advisory_xact_lock(hashtext(old.family_id::text));

      select count(*) into remaining_parents
      from public.family_members
      where family_id = old.family_id
        and role = 'parent'
        and id <> old.id;

      if remaining_parents = 0 then
        raise exception 'LAST_PARENT: cannot remove or demote the last parent of a family';
      end if;
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.role = 'parent' and new.role = 'child' then
      perform pg_advisory_xact_lock(hashtext(old.family_id::text));

      select count(*) into remaining_parents
      from public.family_members
      where family_id = old.family_id
        and role = 'parent'
        and id <> old.id;

      if remaining_parents = 0 then
        raise exception 'LAST_PARENT: cannot remove or demote the last parent of a family';
      end if;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_last_parent_protection on public.family_members;
create trigger trg_last_parent_protection
  before update of role or delete on public.family_members
  for each row
  execute function public.assert_not_last_parent();
