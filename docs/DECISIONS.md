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