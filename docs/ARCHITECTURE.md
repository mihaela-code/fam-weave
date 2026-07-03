# FamWeave — Architecture

## Overview

Multi-page web application: Vanilla JS (ES modules) + Bootstrap 5, built with Vite, backed by Supabase (Postgres, Auth, Storage). No SPA framework, no TypeScript — by design (see DECISIONS.md ADR-001).

```
Browser (HTML pages + page scripts)
        │  calls
        ▼
Service layer (src/modules/*/**-service.js)
        │  only layer allowed to import
        ▼
Supabase client (src/core/supabase.js)
        │
        ▼
Supabase: Postgres (RLS) · Auth · Storage
```

## Folder Structure

```
/
├── .github/copilot-instructions.md   # AI agent rules
├── docs/                             # this documentation set
├── supabase/
│   ├── migrations/                   # schema source of truth
│   └── seed.sql                      # demo data
├── src/
│   ├── core/
│   │   ├── config.js                 # APP_NAME and app-level constants
│   │   ├── supabase.js               # singleton client
│   │   ├── auth.js                   # session, guards, current user/family/role
│   │   └── ui.js                     # toasts, formatters, confirm dialogs
│   ├── modules/
│   │   ├── family/                   # families, members, invites, roles
│   │   ├── calendar/                 # events
│   │   ├── expenses/                 # expenses, categories, receipts
│   │   └── admin/                    # member & role management
│   └── styles/
├── *.html                            # one file per screen (Vite entries)
└── vite.config.js
```

## Module Boundaries

- A **module** = one domain folder under `src/modules/` containing its service(s), page logic, and components.
- Modules may import from `core/` freely.
- Modules must **not** import from other modules' internals. If two modules need the same logic, it moves to `core/` or the owning module exposes it via its service.
- Adding a future module (e.g. `inventory/` in V2) means: new folder + new HTML pages + new migration. Zero edits to existing modules.

## Service Layer

- Every module exposes `<domain>-service.js` — the only files that import `core/supabase.js`.
- Services return plain data (or throw); they contain all queries, storage calls, and data shaping.
- Page scripts (`<domain>-page.js`) handle DOM, events, and rendering; they call services and `core/ui.js` helpers.
- Rationale: V4 AI features and any future UI migration reuse services untouched (ADR-002).

## Routing (Multi-Page)

- Each screen is a root-level HTML file registered as a Vite rollup input.
- Navigation = plain links (`<a href="/calendar.html">`). Shared navbar/tab bar is injected by a small `core` helper on every page.
- Auth guard: every protected page script calls `requireAuth()` from `core/auth.js` first; it redirects to `/login.html` if there is no session, and to `/onboarding` (create/join family) if the user has no family yet.

## Multi-Tenant Design

- Tenant = **family**. Every domain table carries `family_id`.
- The current family id is resolved once after login (from `family_members`) and cached in memory by `core/auth.js`.
- V1 assumes one family per user; the schema (junction table `family_members`) already supports many-to-many for later.
- Isolation is enforced by RLS, not by client-side filtering — client `.eq('family_id', ...)` filters are a performance courtesy, never the security boundary.

## Authentication Flow

1. **Register** → Supabase Auth creates `auth.users` row → DB trigger creates a `profiles` row.
2. **Onboarding** → user either creates a family (inserted into `families` + `family_members` as `parent`) or enters an invite code (inserted as `child` by default; parent can promote later).
3. **Login** → session persisted by supabase-js; `core/auth.js` loads profile + family + role.
4. **Logout** → sign out + redirect to `login.html`.
5. Role-based UI: page scripts ask `auth.isParent()` to show/hide controls — cosmetic only; RLS is the enforcement.

## RLS Philosophy

- **Deny by default.** RLS enabled on every table; no `allow_all` policies, ever (lesson learned from a previous project).
- Two SQL helper functions, defined once, reused in every policy:
  - `is_family_member(fid uuid)` → true if `auth.uid()` belongs to the family → gates **SELECT**.
  - `is_family_parent(fid uuid)` → true if member with role `parent` → gates **INSERT/UPDATE/DELETE**.
- Special cases: `profiles` (owner can update own row; family members can read), `families` (members read; only parents update), `family_members` (members read; parents manage).
- Storage: bucket paths are prefixed `family/{family_id}/...`; storage policies apply the same helper functions to the path prefix.
- Every new table's policy block is copy-paste of the standard template with the table name changed — extensibility by convention (ADR-003).

## Environment & Deployment

- Client env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only. The anon key is public by design; security lives in RLS. No service-role key ever ships to the client.
- Netlify: auto-deploy on push to `main`; env vars configured in Netlify UI; `vite build` output from `dist/`.