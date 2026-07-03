# FamWeave — Product Specification

> "FamWeave" is a working title. See DECISIONS.md ADR-006 (brand independence).

## Vision

Families run on scattered tools: group chats, spreadsheets, paper notes, memory. FamWeave is the shared operating layer for a household — one place where a family sees its schedule, its spending, and its documents, with age-appropriate access for every member.

Long-term, FamWeave grows from a calendar-and-expenses tool into a full family/home platform (inventory, warranties, AI assistant) built on the same multi-tenant foundation.

## Target Users

- **Primary: parents** (25–50) managing a household with children — they create the family, invite members, own budgets and admin rights.
- **Secondary: children/teens** — limited participants; they see their own schedule and family info relevant to them, without edit rights or visibility into finances.
- **Later (V2+):** couples without children, multi-generation households, and home-renovation use cases.

## Version 1 (MVP) — "Family Calendar & Expenses"

Deadline-driven scope (course capstone, due 2026-07-14). Everything below ships; nothing else does.

### Features

1. **Accounts & profiles** — email/password sign-up, login, logout; profile with display name, birth date, avatar, personal color.
2. **Families (multi-tenant)** — a user creates a family (becomes *parent*) or joins one via invite code. All data is isolated per family.
3. **Roles** — `parent` (full CRUD + admin) and `child` (read-only), enforced server-side via RLS.
4. **Calendar** — month view; events with title, date, time, location, assigned member, notes. Parent CRUD, child read-only.
5. **Expenses** — list with search and filters (category, date, member); amount, category, payer, notes. Parent CRUD, child read-only.
6. **Receipts & files** — upload receipt/invoice files to an expense; view/download. Avatar upload. (Supabase Storage)
7. **Admin panel** — parent-only: member list, role management, invite code.
8. **Dashboard** — upcoming events + current-month spending summary.

### Success criteria for V1

- All capstone grading criteria satisfied (5+ responsive screens, 4+ tables, roles + admin, storage, RLS, deployment, docs).
- Live deployment with seeded demo family and demo accounts (`parent@demo` / `child@demo`).
- A new module could be added without modifying existing modules (verified by structure review).

## Roadmap

| Version | Theme | Contents |
|---|---|---|
| **V1** | Family Calendar & Expenses | The MVP above (capstone) |
| **V1.5** | Daily-life quality | Recurring events & expenses, budgets & allowances, in-app + push notifications, PWA/installable, email invites |
| **V2** | Home Inventory | Rooms, items, photos, values; foundation for renovation-sector niche |
| **V3** | Documents & Warranties | Warranty tracking with expiry reminders, document vault, receipts linked to inventory items |
| **V4** | AI Family Assistant | Receipt photo → parsed expense; natural-language queries over family data; auto-categorization; schedule suggestions |

AI (V4) is a layer over the data model of V1–V3, not a separate module — one more reason the schema stays clean and normalized.

## Non-Goals for Version 1

Explicitly out of scope — do not design for, build, or partially implement:

- Recurring events/expenses, budgets, allowances, spending limits
- Notifications of any kind; realtime updates
- PWA, offline mode, mobile apps
- Email invites (join code only)
- Home Inventory, shopping lists, meal planning
- Any AI features
- Payments/monetization, subscription tiers
- Localization framework (UI is English-only in V1)
- Plugin systems or config-driven module registries

If a V1 feature can be shipped simpler by ignoring a future version's needs *without breaking the architecture principles*, ship it simpler.