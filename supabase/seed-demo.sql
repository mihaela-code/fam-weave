-- ---------------------------------------------------------------------------
-- seed-demo.sql — demo data for manual/QA use.
--
-- NOT a migration: not numbered, not part of the migration history, and not
-- run automatically. Run manually, once, whenever fresh demo data is wanted.
--
-- Prerequisites (all must already exist — this script creates none of them):
--   1. auth.users row for demo.parent@famweave.app — register via the app
--      (register.html), NOT created here.
--   2. auth.users row for demo.child@famweave.app — register via the app.
--   3. A family created by the parent account via onboarding.html
--      ("Създай семейство").
--   4. The child account joined that same family via onboarding.html
--      ("Присъедини се с код") using the invite code shown to the parent.
--
-- What this script does:
--   - Verifies all four prerequisites above; raises a clear exception and
--     stops if any is missing.
--   - Deletes any existing categories/expenses/events belonging ONLY to the
--     demo family (nothing else is touched — no other family, no auth.users
--     row, no families/family_members row), then inserts a fresh, realistic
--     set of Bulgarian demo data. Safe to re-run any time.
--
-- How to run: paste into the Supabase SQL Editor (as the postgres role) and
-- execute. Read the RAISE NOTICE output at the end for a summary.
-- ---------------------------------------------------------------------------

do $$
declare
  parent_id uuid;
  child_id uuid;
  demo_family_id uuid;
  demo_family_name text;

  cat_food_id uuid;
  cat_transport_id uuid;
  cat_fun_id uuid;
  cat_home_id uuid;
  cat_health_id uuid;

  this_month_start date := date_trunc('month', current_date)::date;
  prev_month_start date := (date_trunc('month', current_date) - interval '1 month')::date;
  prev_month_end date := this_month_start - 1;

  expenses_inserted int;
  events_inserted int;
  categories_inserted int;
begin
  -- -------------------------------------------------------------------------
  -- 1-2. Locate the parent account.
  -- -------------------------------------------------------------------------
  select id into parent_id
  from auth.users
  where email = 'demo.parent@famweave.app';

  if parent_id is null then
    raise exception 'Демо акаунтът demo.parent@famweave.app не съществува. Регистрирай го първо през приложението (register.html).';
  end if;

  -- -------------------------------------------------------------------------
  -- 3. Locate the child account.
  -- -------------------------------------------------------------------------
  select id into child_id
  from auth.users
  where email = 'demo.child@famweave.app';

  if child_id is null then
    raise exception 'Демо акаунтът demo.child@famweave.app не съществува. Регистрирай го първо през приложението (register.html).';
  end if;

  -- -------------------------------------------------------------------------
  -- 4. Locate the family created by the parent (families.created_by is the
  -- owner column, per migration 002). If the parent created more than one
  -- family, the most recently created one is used.
  -- -------------------------------------------------------------------------
  select id, name into demo_family_id, demo_family_name
  from public.families
  where created_by = parent_id
  order by created_at desc
  limit 1;

  if demo_family_id is null then
    raise exception 'Родителят demo.parent@famweave.app няма създадено семейство. Създай го първо през onboarding-а (onboarding.html, "Създай семейство").';
  end if;

  -- -------------------------------------------------------------------------
  -- 5. Confirm the child has joined that same family.
  -- -------------------------------------------------------------------------
  if not exists (
    select 1 from public.family_members
    where family_id = demo_family_id and user_id = child_id
  ) then
    raise exception 'Детето demo.child@famweave.app не е член на семейство "%". Присъедини се първо през onboarding-а (onboarding.html, "Присъедини се с код") с кода на това семейство.', demo_family_name;
  end if;

  -- -------------------------------------------------------------------------
  -- 6. Idempotency: wipe only this family's expenses/events/categories.
  -- Order respects FK constraints: expenses (references categories,
  -- ON DELETE RESTRICT) must go before categories. events has no dependency
  -- on categories so its position relative to categories doesn't matter, but
  -- it's cleared here too for a fully clean re-seed.
  -- -------------------------------------------------------------------------
  delete from public.expenses where family_id = demo_family_id;
  delete from public.events where family_id = demo_family_id;
  delete from public.categories where family_id = demo_family_id;

  -- -------------------------------------------------------------------------
  -- 7a. Categories.
  -- -------------------------------------------------------------------------
  insert into public.categories (family_id, name) values (demo_family_id, 'Храна') returning id into cat_food_id;
  insert into public.categories (family_id, name) values (demo_family_id, 'Транспорт') returning id into cat_transport_id;
  insert into public.categories (family_id, name) values (demo_family_id, 'Забавления') returning id into cat_fun_id;
  insert into public.categories (family_id, name) values (demo_family_id, 'Дом') returning id into cat_home_id;
  insert into public.categories (family_id, name) values (demo_family_id, 'Здраве') returning id into cat_health_id;

  -- -------------------------------------------------------------------------
  -- 7b. Expenses — 12 rows, split across the current and previous calendar
  -- month using CURRENT_DATE arithmetic (never hardcoded dates), so the
  -- script produces sensible data no matter when it's run.
  --
  -- created_by is always the parent: migration 003's RLS policy
  -- "expenses_insert_parents" only allows is_family_parent(family_id) to
  -- insert, i.e. the app never lets a child create an expense — the child
  -- role is read-only here, so demo rows are attributed to the parent only.
  -- Dates in the current-month batch are capped with least(..., current_date)
  -- so none land in the future; the previous-month batch is capped at
  -- prev_month_end so short months (e.g. February) can't spill into the
  -- current month.
  -- -------------------------------------------------------------------------

  -- Current month (7 rows)
  insert into public.expenses (family_id, category_id, amount, description, spent_on, created_by) values
    (demo_family_id, cat_food_id, 42.50, 'Седмично пазаруване', least(this_month_start + 1, current_date), parent_id),
    (demo_family_id, cat_transport_id, 60.00, 'Зареждане с гориво', least(this_month_start + 3, current_date), parent_id),
    (demo_family_id, cat_fun_id, 28.00, 'Кино с децата', least(this_month_start + 5, current_date), parent_id),
    (demo_family_id, cat_home_id, 115.30, 'Сметка за електричество', least(this_month_start + 7, current_date), parent_id),
    (demo_family_id, cat_health_id, 22.90, 'Лекарства от аптека', least(this_month_start + 9, current_date), parent_id),
    (demo_family_id, cat_food_id, 16.40, 'Хляб и мляко', least(this_month_start + 12, current_date), parent_id),
    (demo_family_id, cat_transport_id, 15.00, 'Градски транспорт — карта', current_date, parent_id);

  -- Previous month (5 rows)
  insert into public.expenses (family_id, category_id, amount, description, spent_on, created_by) values
    (demo_family_id, cat_food_id, 51.20, 'Месечно пазаруване', least(prev_month_start + 2, prev_month_end), parent_id),
    (demo_family_id, cat_home_id, 95.00, 'Сметка за парно', least(prev_month_start + 6, prev_month_end), parent_id),
    (demo_family_id, cat_fun_id, 33.50, 'Рожден ден — подарък', least(prev_month_start + 11, prev_month_end), parent_id),
    (demo_family_id, cat_health_id, 48.00, 'Преглед при зъболекар', least(prev_month_start + 18, prev_month_end), parent_id),
    (demo_family_id, cat_transport_id, 55.00, 'Ремонт на кола', least(prev_month_start + 24, prev_month_end), parent_id);

  -- -------------------------------------------------------------------------
  -- 7c. Events — 4 upcoming, 2 past. created_by is always the parent:
  -- migration 004's "events_insert_parents" policy requires
  -- is_family_parent(family_id) AND created_by = auth.uid(), so only a
  -- parent can ever create an event in the app.
  -- Times are declared as local Sofia wall-clock time and converted to
  -- timestamptz via AT TIME ZONE, so they display correctly in the app
  -- regardless of the SQL Editor session timezone (UTC).
  -- -------------------------------------------------------------------------
  insert into public.events (family_id, created_by, title, description, starts_at, ends_at, location) values
    (
      demo_family_id, parent_id, 'Рожден ден на баба',
      'Семейно събиране за рождения ден',
      ((current_date + 3) + time '18:00') at time zone 'Europe/Sofia',
      ((current_date + 3) + time '21:00') at time zone 'Europe/Sofia',
      'Вкъщи'
    ),
    (
      demo_family_id, parent_id, 'Родителска среща',
      'Родителска среща в училището',
      ((current_date + 6) + time '17:30') at time zone 'Europe/Sofia',
      null,
      'Училище'
    ),
    (
      demo_family_id, parent_id, 'Зъболекар',
      'Профилактичен преглед',
      ((current_date + 10) + time '10:00') at time zone 'Europe/Sofia',
      ((current_date + 10) + time '11:00') at time zone 'Europe/Sofia',
      'Стоматологичен кабинет'
    ),
    (
      demo_family_id, parent_id, 'Тренировка по футбол',
      'Тренировка на детския отбор',
      ((current_date + 14) + time '16:00') at time zone 'Europe/Sofia',
      ((current_date + 14) + time '17:30') at time zone 'Europe/Sofia',
      'Спортна зала'
    ),
    (
      demo_family_id, parent_id, 'Рожден ден на татко',
      'Празненство в ресторант',
      ((current_date - 5) + time '19:00') at time zone 'Europe/Sofia',
      null,
      'Ресторант'
    ),
    (
      demo_family_id, parent_id, 'Годишен медицински преглед',
      'Годишен профилактичен преглед',
      ((current_date - 12) + time '09:00') at time zone 'Europe/Sofia',
      ((current_date - 12) + time '10:00') at time zone 'Europe/Sofia',
      'Болница'
    );

  -- -------------------------------------------------------------------------
  -- 8. Summary.
  -- -------------------------------------------------------------------------
  select count(*) into categories_inserted from public.categories where family_id = demo_family_id;
  select count(*) into expenses_inserted from public.expenses where family_id = demo_family_id;
  select count(*) into events_inserted from public.events where family_id = demo_family_id;

  raise notice 'Демо данните са заредени за семейство "%" (id %): % категории, % разхода, % събития.',
    demo_family_name, demo_family_id, categories_inserted, expenses_inserted, events_inserted;
end $$;