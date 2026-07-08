# FamWeave — Architecture Decision Records

Short ADRs. Format: Context → Decision → Consequences. Newest entries appended at the bottom. Future agents: read this before proposing structural changes.

---

## ADR-001 — Vanilla JS + Vite multi-page (no React/Vue/TS)

**Context.** The capstone exam mandates HTML/CSS/JS + Bootstrap with Vite and multi-page navigation, and explicitly forbids TypeScript and UI frameworks. A previous iteration of this product (private project "Family OS") was Next.js + TS + Tailwind.

**Decision.** Build V1 as a Vite multi-page app in vanilla ES modules with Bootstrap 5. Do not introduce frameworks later without a new ADR.

**Consequences.** Simpler toolchain and grading compliance; discipline must come from conventions (folder structure, service layer) instead of a framework. Domain knowledge from the previous project is ported; its code is not.

---

## ADR-002 — Service layer between UI and Supabase

**Context.** Pages could call supabase-js directly (less code short-term), but that couples DOM code to the backend and blocks reuse.

**Decision.** Only `*-service.js` files import the Supabase client. Pages/components call services and receive plain data.

**Consequences.** Slightly more files in V1. In return: V4 AI features and any future UI change reuse the same services; testing and debugging isolate cleanly; the rule is trivially checkable in code review ("does any page import supabase.js?").

---

## ADR-003 — Multi-tenancy via `family_id` + shared RLS helper functions

**Context.** The product must serve many families with strict isolation; the exam separately grades server-side permission handling.

**Decision.** Every domain table carries `family_id`. Two SQL functions — `is_family_member(fid)` and `is_family_parent(fid)` — are defined once and reused by every table's policies. Deny by default; no `allow_all` policies.

**Consequences.** Adding a table = copy the policy template, change the table name. Client-side filters are a courtesy, never the boundary. Lesson incorporated from the previous project, where `allow_all` RLS was a known debt.

---

## ADR-004 — Roles stored in `family_members`, not `profiles`

**Context.** Access is role-based (parent/child). A role could live on the user profile or on the membership.

**Decision.** `role` is a column of `family_members`. Birth date on the profile only *suggests* a default role (<18 → child) at invite time; it never enforces access.

**Consequences.** Role is family-scoped: the same user can be a parent in one family and a child in another (future-proof for multi-family). Age is informational; permissions remain an explicit parent decision (e.g. an 19-year-old can remain "child" in the family context).

---

## ADR-005 — Migrations-only schema management

**Context.** Schema built by hand in the Supabase dashboard drifts from the repo and cannot be replayed; the exam requires committed migration history.

**Decision.** Every schema change is a SQL file in `supabase/migrations/`, committed. `seed.sql` provides the demo family and demo accounts. Dashboard is read-only for schema.

**Consequences.** Reproducible environments (local, demo, future prod); migration history doubles as documentation; small overhead per change, paid deliberately.

---

## ADR-006 — Brand-independent naming ("FamWeave" is a working title)

**Context.** The product name is undecided; rebranding after launch is likely. A previous name candidate (NestFlow) was already replaced once.

**Decision.** The product name appears only in user-facing strings, sourced from a single `APP_NAME` constant in `src/core/config.js`. Repo, folders, files, functions, tables, CSS classes and storage buckets use neutral names (`app`, `family`, domain terms).

**Consequences.** Rebranding = change one constant (plus marketing assets). No grep-and-rename risk in code or, worse, in the database.

---

## ADR-007 — Invite by join code (no email invites in V1)

**Context.** Email invites require an email provider, templates, and token flows — meaningful scope for marginal exam value.

**Decision.** V1 joins a family via a short unique `invite_code` shown to parents in the admin panel. Email invites deferred to V1.5.

**Consequences.** Onboarding is demo-friendly (jury can join with a code in seconds). Codes are regenerate-able by parents to revoke access to joining.

---

## ADR-008 — Receipts as `documents` table + family-scoped Storage paths

**Context.** The exam requires file upload/download. Files need the same tenant isolation as rows.

**Decision.** One generic `documents` metadata table (nullable `expense_id` in V1) + a single private Storage bucket with paths `family/{family_id}/...`; storage policies reuse the family-membership check on the path prefix.

**Consequences.** V3 (warranties/vault) extends `documents` with new nullable FKs instead of new tables. Signed URLs serve downloads; nothing is public.

---

## ADR-009 — Invite code collision risk accepted

**Context.** `generate_invite_code()` has no retry on unique violation — a collision would surface as a raw constraint error to the caller.

**Decision.** Accept the risk. With 31^8 (~852 billion) combinations, collision probability is negligible at any realistic family count.

**Consequences.** Retry logic is added only if the product outgrows this assumption. No code change needed in V1.

---

## ADR-010 — Single currency (EUR) in V1

**Context.** Bulgaria adopted the euro on 2026-01-01, and FamWeave targets a single-household, single-country use case in V1.

**Decision.** Amounts are stored as plain `numeric(10,2)` with no currency column. The UI formats amounts via `Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR' })`.

**Consequences.** Multi-currency support would require a schema migration (a `currency` column plus conversion handling) and is explicitly out of V1 scope.

---

## ADR-011 — Default expense categories seeded per family

**Context.** A newly created family would otherwise start with an empty category list, forcing every family to create categories from scratch before logging a single expense.

**Decision.** The `create_family` RPC seeds five default categories (`Храна`, `Сметки`, `Транспорт`, `Здраве`, `Друго`) for every new family, in addition to creating the family and its parent membership.

**Consequences.** Better first-run UX — expenses can be logged immediately. Category list management (rename/delete) is deferred to the admin panel. Category deletion is blocked by `ON DELETE RESTRICT` on `expenses.category_id` while expenses still reference it, so a category in use cannot be silently removed.

---

## ADR-012 — Calendar shows upcoming events only

**Context.** The calendar list needs a simple, unambiguous scope for V1 — a full monthly grid with past/future browsing is significantly more UI work than the exam timeline allows.

**Decision.** The calendar page lists only events where `starts_at >= now()`. Events already in progress disappear from the list once they start — an accepted V1 simplification.

**Consequences.** A monthly grid view and a past-events archive are V2 candidates. No schema change needed to support either later; both would read the same `events` table with a different query.

---

## ADR-013 — No recurrence, reminders, invitations, or all-day flag in V1

**Context.** These are common calendar features, but each adds meaningful scope (recurrence rules, notification delivery, per-invitee RSVP state, date-only vs. datetime handling) beyond V1's timeline (per the Out of Scope list in `copilot-instructions.md`).

**Decision.** None of these are built in V1. The `events` schema does not reserve columns for them.

**Consequences.** They will arrive via new migrations when needed, following the same pattern as other deferred features (ADR-007, ADR-010) — no placeholder columns or dead code carried in the meantime.

---

## ADR-014 — Avatar storage via Supabase Storage

**Context.** The exam requires a file upload/download feature. Receipts (`documents`, ADR-008) are the obvious V1 candidate by product scope, but avatars are simpler to implement end-to-end (single file per user, no parent/child gating) and exercise the same Storage + RLS mechanics the grading criteria care about.

**Decision.** Avatars are the V1 file upload/download feature; receipts/documents are deferred to V3. Files live in a public bucket `avatars`, path convention `{user_id}/avatar.{ext}`. Write access is restricted per-user via RLS on `storage.objects` using `(storage.foldername(name))[1] = auth.uid()::text`. The broad `SELECT` (list) policy is kept deliberately despite the Supabase dashboard's warning about it: exposure is limited to user-id folder names (no other row data), avatars are public by design, and removing the policy via the dashboard would desync the live schema from migration 005. `profiles.avatar_url` stores the full public URL with a `?v=<timestamp>` cache-busting parameter, so every page shows the fresh image immediately after re-upload. On upload, stale avatar files with other extensions are removed first, to avoid orphaned files from format changes. Client-side validation: `image/*` MIME type, max 2MB, extension whitelist (`jpg`, `jpeg`, `png`, `webp`, `gif`) — SVG is deliberately excluded (XSS risk via inline scripts in SVG markup).

**Consequences.** Receipt upload (ADR-008's private, family-scoped bucket) is built later in V3 as a separate bucket with different RLS (family membership, not per-user ownership) — the two features don't share policies or path conventions. The cache-busting query param means `avatar_url` values are not stable identifiers; anything that needs to compare "same avatar" must strip the query string first.

---

## ADR-015 — Last-parent protection at database level

**Context.** A parent could demote themselves (or another parent) to child, or delete the last remaining parent's `family_members` row, leaving a family with no one able to manage members, roles, and invites.

**Decision.** Enforce the invariant "every family has at least one parent" with a `BEFORE UPDATE OF role OR DELETE` trigger on `family_members` (function `public.assert_not_last_parent`, `security definer`, pinned `search_path`). UI restrictions are convenience; the database is the security boundary.

**Details.**
- **Cascade guard:** the check is skipped when the corresponding `families` row is already gone, so `ON DELETE CASCADE` family deletion still works.
- **Advisory lock:** a transaction-scoped advisory lock keyed on `family_id` (`pg_advisory_xact_lock(hashtext(family_id::text))`) serializes concurrent role changes, closing the race where two parents demote themselves simultaneously and each transaction counts the other as the remaining parent.
- **Error convention:** the exception message is prefixed `LAST_PARENT:` for substring-based error mapping in the UI, consistent with `INVALID_NAME`/`INVALID_CODE`/`ALREADY_MEMBER` elsewhere.

**Consequences.** Verified with a live test in the Supabase SQL Editor as the `postgres` role — demoting the only parent of a family raised the exception. Any future code path that updates or deletes `family_members` (RPC, admin panel, dashboard) is covered automatically; no application-level check can be bypassed.

---

## ADR-016 — Profiles readable within a family

**Context.** `profiles` had a single self-only `SELECT` policy (`id = auth.uid()`). The admin panel embeds `profiles` via `family_members` joins to show member names and avatars; PostgREST embeds respect the target table's RLS, so other members' profiles silently came back null. RLS correctly surfaced a visibility requirement no page had needed before.

**Decision.** Add an additive `SELECT` policy `profiles_select_family_members` using a new helper `shares_family_with(uuid)` (`security definer`, pinned `search_path`, same pattern as `is_family_member`/`is_family_parent`). The self-select policy remains; permissive policies OR together.

**Consequences.** Any current or future page (dashboard in Day 9) can embed family members' profiles without further policy work. Profiles remain invisible across family boundaries.