# FamWeave — AI Agent Instructions

## Project Vision

FamWeave is a multi-tenant family organizer SaaS. Version 1 (current scope): **Family Calendar & Expenses** — families manage shared calendars, expenses with receipts, and member roles. Future versions will add Home Inventory, Documents & Warranties, and an AI Family Assistant. Build V1 so new modules can be added without touching existing ones.

**Brand independence:** "FamWeave" is a working title, not the final brand. The product name must appear only in user-facing display strings (page titles, navbar brand) — referenced from a single `APP_NAME` constant in `src/core/config.js`. Never use the product name in folder names, file names, function names, table names, CSS classes, or storage bucket names. Rebranding must be a one-constant change.

## Tech Stack (strict)

- **Frontend:** Vanilla JavaScript (ES modules), HTML, CSS, Bootstrap 5, Bootstrap Icons
- **Build:** Node.js, npm, Vite (multi-page build)
- **Backend:** Supabase (Postgres, Auth, Storage), accessed via `@supabase/supabase-js`
- **Deployment:** Netlify

**Forbidden:** React, Vue, any UI framework, TypeScript, Tailwind, jQuery. Do not suggest them.

## Architecture

**Multi-page app.** Each screen is a separate HTML file, registered as a Vite entry point. No SPA router, no popup-based navigation for main screens.

### Folder structure

```
/
├── .github/copilot-instructions.md
├── supabase/
│   ├── migrations/          # SQL migrations — single source of truth for schema
│   └── seed.sql             # demo family + demo accounts
├── src/
│   ├── core/                # shared infrastructure
│   │   ├── supabase.js      # Supabase client (env vars, singleton)
│   │   ├── auth.js          # session helpers, route guard, current user/family
│   │   └── ui.js            # shared UI helpers (toasts, formatters, confirm dialogs)
│   ├── modules/             # one folder per domain module
│   │   ├── family/          # families, members, invites, roles
│   │   ├── calendar/        # events CRUD
│   │   ├── expenses/        # expenses, categories, receipts
│   │   └── admin/           # member & role management (parent only)
│   └── styles/              # global css
├── pages (root HTML files): index.html, login.html, register.html,
│   dashboard.html, calendar.html, expenses.html, admin.html, profile.html
└── vite.config.js
```

Each module contains: `<name>-service.js` (data access), `<name>-page.js` (page logic), optional component files. HTML pages are thin: they load their page script, nothing else.

### Layering rule (non-negotiable)

**UI code never calls Supabase directly.** Pages and components call services only (e.g. `expensesService.list()`, `eventsService.create(event)`). Services are the only files that import the Supabase client. If a page needs data, add or extend a service function.

## Database Rules

- **Migrations only.** Every schema change is a SQL file in `supabase/migrations/`, committed to the repo. Never modify schema via the Supabase dashboard.
- **Multi-tenant by design.** Every domain table carries a `family_id` column referencing `families(id)`.
- **RLS on every table.** Reuse the shared helper functions in policies:
  - `is_family_member(family_id)` — read access
  - `is_family_parent(family_id)` — write access / admin actions
- Core tables (V1): `profiles`, `families`, `family_members`, `events`, `expenses`, `categories`, `documents`.
- All DDL in migrations must be schema-qualified (create table public.events, alter table public.events ...). Applies from migration 004 onward; migrations 001-003 remain as executed.

## Roles & Permissions

Two roles, stored in `family_members.role`:

- **parent** — full CRUD within own family; manages members, roles, invites; sees admin panel.
- **child** — read-only on family data; sees own profile; no admin panel; create/edit/delete buttons hidden in UI **and** blocked by RLS.

Permissions are enforced server-side (RLS). UI hiding is a convenience, never the security boundary.

## Coding Conventions

- ES modules everywhere; `import`/`export`, no globals.
- Plain functions over classes unless state genuinely requires it.
- Files and folders: `kebab-case`. Functions and variables: `camelCase`. DB tables and columns: `snake_case`.
- All UI text in **English** for V1.
- Dates: always construct local dates from `getFullYear()/getMonth()/getDate()`; never use `toISOString().split('T')[0]` or `new Date("YYYY-MM-DD")` for user-facing dates (timezone shift bug).
- Bootstrap components and utilities first; custom CSS only when Bootstrap can't do it.
- Keep functions small; no file should exceed ~200 lines — split into components/services instead.
- Errors: every service call in page code is wrapped and surfaces a user-friendly toast; log the raw error to console.

## Commit Strategy

- Commit after **every working increment** — small, frequent commits.
- Format: `type: short description` where type is `init | feat | fix | migration | style | docs | chore`.
- A migration and the feature using it may be separate commits (migration first).
- Never commit secrets. `.env` is gitignored; only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are used client-side.

## Out of Scope for V1 (do not build, do not suggest)

- Recurring events or recurring expenses
- Budgets, allowances, spending limits
- Notifications (in-app or push), realtime subscriptions
- PWA / service workers / offline mode
- Email invites (invite is a join code only)
- Home Inventory, shopping lists, meal planning
- Any AI features
- Plugin systems, module registries, config-driven abstractions

When in doubt: build the simplest thing that satisfies V1, following the structure above.