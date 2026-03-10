# Budget Tracker — Implementation Prompts

Use these prompts sequentially with Claude Code. Send one at a time. After each prompt, verify the repo is in a consistent, buildable state before proceeding.

---

## Prompt 1 — Repository Foundation

You are building a Budget Tracker application. Start by creating the monorepo foundation.

Read `docs/CLAUDE.md` for full project context. Read `docs/architecture.md` for structural decisions.

**Create this structure:**
```
budget-tracker/
├── apps/
│   ├── web/          (empty, will be initialized in prompt 5)
│   └── api/          (empty, will be initialized in prompt 2)
├── packages/
│   ├── shared-types/
│   ├── shared-validation/
│   ├── sync-engine/
│   ├── ui/
│   └── config/
├── infra/
│   └── docker/
├── docs/             (copy from provided documentation)
├── .github/
│   └── workflows/
├── .gitignore
├── .prettierrc
├── .eslintrc.js (or eslint.config.js)
├── tsconfig.base.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

**Requirements:**
- pnpm workspaces configured in `pnpm-workspace.yaml`
- Base `tsconfig.base.json` with strict mode, path aliases
- ESLint config (TypeScript rules, import order)
- Prettier config (consistent formatting)
- Root `package.json` with scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `format`
- Each package has its own `package.json` and `tsconfig.json` extending base
- `packages/shared-types/` with placeholder index.ts exporting basic domain types
- `packages/shared-validation/` with Zod as dependency, placeholder schemas
- `packages/sync-engine/` with placeholder sync types
- `.gitignore` covering node_modules, dist, .env, IDE files
- README.md with project description, stack, structure overview, and a Changelog section

**Acceptance criteria:**
- `pnpm install` succeeds
- `pnpm lint` runs (even if no files to lint yet)
- `pnpm typecheck` runs
- Directory structure matches the plan
- All packages resolve each other correctly

---

## Prompt 2 — Backend Foundation

Initialize the NestJS backend in `apps/api`.

Read `docs/architecture.md` (backend section), `docs/database-schema.md`, and `docs/api-contract.md`.

**Requirements:**
- NestJS application in `apps/api/`
- Environment configuration module (DATABASE_URL, JWT secrets, NODE_ENV, etc.)
- Prisma integration with PostgreSQL
- Prisma schema matching `docs/database-schema.md` (all tables, relations, indexes)
- Initial migration
- Health module with `GET /api/v1/health`
- Module stubs for: auth, users, workspaces, memberships, accounts, categories, transactions, budgets, reports, sync
- Each module has the directory structure: controllers/, services/, dto/, repositories/, module file
- Global exception filter for consistent error responses
- Global validation pipe
- CORS configuration
- Request logging (basic)

**Module structure per domain:**
```
modules/transactions/
├── controllers/transactions.controller.ts
├── services/transactions.service.ts
├── dto/create-transaction.dto.ts
├── dto/update-transaction.dto.ts
├── repositories/transactions.repository.ts
├── transactions.module.ts
└── __tests__/
```

**Acceptance criteria:**
- `pnpm --filter api dev` starts the server
- `GET /api/v1/health` returns `{ "status": "ok" }`
- Prisma can connect to PostgreSQL and run migrations
- All module stubs exist with correct structure
- No business logic in controllers (controllers call services)
- TypeScript compiles without errors

---

## Prompt 3 — Auth and Workspaces

Implement authentication and workspace management.

Read `docs/api-contract.md` (auth and workspace sections), `docs/security-and-backup.md`, and `docs/domain-model.md`.

**Auth requirements:**
- `POST /api/v1/auth/login` — email + password, returns JWT access + refresh tokens
- `POST /api/v1/auth/refresh` — refresh token rotation
- `POST /api/v1/auth/logout` — invalidate refresh token
- Argon2 password hashing
- JWT access token (short-lived, ~15 min)
- Refresh token (longer-lived, stored in DB or secure storage)
- JWT auth guard for protected routes
- `GET /api/v1/users/me` — return current user profile

**Workspace requirements:**
- `GET /api/v1/workspaces` — list user's workspaces with their role
- `POST /api/v1/workspaces` — create workspace (creator becomes owner)
- `GET /api/v1/workspaces/:id` — workspace details
- `PATCH /api/v1/workspaces/:id` — update workspace
- `GET /api/v1/workspaces/:id/members` — list members
- `POST /api/v1/workspaces/:id/members` — add member
- `PATCH /api/v1/workspaces/:id/members/:membershipId` — change role
- Workspace membership guard (check user belongs to workspace)
- Role-based authorization (owner/editor/viewer permissions)

**Quality rules:**
- Validation with Zod schemas (in shared-validation package)
- Proper error responses (401, 403, 404)
- No business logic in controllers
- Tests for auth service (login, refresh, invalid credentials)
- Tests for workspace authorization (access denied for non-members)

**Seed data:**
- Create a seed script with a test user and sample workspaces

**Acceptance criteria:**
- Can register/seed a user and log in
- Access token works for protected routes
- Refresh token rotation works
- Workspace CRUD works
- Role enforcement works (viewer can't write, non-member can't access)
- Tests pass

---

## Prompt 4 — Financial Model

Implement the core financial modules.

Read `docs/api-contract.md` (accounts, categories, transactions, budgets, transfers sections) and `docs/domain-model.md`.

**Accounts:**
- CRUD endpoints scoped to workspace
- Types: cash, bank, savings, credit, investment
- Soft delete
- Version field incremented on update

**Categories:**
- CRUD endpoints scoped to workspace
- Kind: expense, income, both
- Optional parent category (self-referencing)
- Soft delete, versioning

**Transactions:**
- CRUD endpoints scoped to workspace
- Types: expense, income
- Filter by: date range, account, category, type
- Pagination (page, pageSize, total)
- Soft delete, versioning
- `created_by` tracks which user created it

**Transfers:**
- `POST /api/v1/workspaces/:id/transfers`
- Creates two linked transactions (outbound expense + inbound income)
- Creates TransferLink record
- Both in same workspace

**Budgets:**
- Budget periods (monthly)
- Budget limits per category per period
- UNIQUE constraint on (workspace, period, category)
- Soft delete, versioning

**Reports:**
- `GET .../reports/summary` — income/expense/balance for date range
- `GET .../reports/by-category` — expense breakdown by category

**Quality rules:**
- Every mutation increments `version` and updates `updated_at`
- Every mutation for synced entities creates a `sync_changes` entry (prepare the sync_changes write logic even though sync endpoints come later)
- All data scoped by workspace_id
- DTO validation with Zod
- Integration tests for key operations

**Acceptance criteria:**
- All CRUD operations work
- Data is workspace-isolated
- Transfers create correct paired entries
- Budget limits enforce uniqueness
- Reports return correct aggregations
- Version increments on every change
- Soft delete works correctly
- Tests pass

---

## Prompt 5 — Frontend Foundation

Initialize the React frontend as a PWA.

Read `docs/ui-ux-spec.md` and `docs/architecture.md` (client section).

**Setup:**
- React + TypeScript + Vite in `apps/web/`
- Tailwind CSS
- React Router (file-based or configured routes)
- PWA plugin (vite-plugin-pwa) with manifest and basic service worker
- API client module (axios or fetch wrapper with JWT interceptor)

**Feature-based structure:**
```
src/
├── app/          (router, providers, error boundary)
├── features/
│   ├── auth/     (login screen, auth context/hook)
│   ├── workspaces/ (switcher, workspace context)
│   ├── dashboard/  (summary cards, recent transactions)
│   ├── accounts/
│   ├── categories/
│   ├── transactions/ (list, form, filters)
│   ├── budgets/
│   └── settings/
├── components/   (shared: Button, Input, Modal, Card, etc.)
├── layouts/      (app shell, mobile nav, desktop sidebar)
├── services/     (API client, auth service)
├── storage/      (placeholder for IndexedDB)
├── sync/         (placeholder for sync engine)
├── hooks/        (shared hooks)
├── styles/       (Tailwind config, global styles)
└── types/        (local type definitions)
```

**Implement:**
- App shell with responsive layout (mobile bottom nav, desktop sidebar)
- Login screen (connects to API)
- Auth context/provider (manages tokens, auto-refresh)
- Workspace switcher (dropdown/modal showing user's workspaces)
- Dashboard skeleton (summary cards with placeholder data)
- Transaction list screen (fetches from API, with filters)
- Add transaction form (all fields per UI spec)
- Account list screen
- Category list screen
- Budget overview screen
- Settings screen (profile, workspace info, manual sync placeholder)
- Sync status badge component (placeholder showing "Online")
- Loading, empty, and error states for all views
- Mobile-first responsive design

**Acceptance criteria:**
- Frontend starts with `pnpm --filter web dev`
- Login works against backend API
- Workspace switching works
- Transaction list shows data from API
- Add transaction form submits to API
- Mobile and desktop layouts work
- PWA manifest is served correctly
- TypeScript compiles without errors

---

## Prompt 6 — Offline Storage

Add the IndexedDB layer for offline-first data.

Read `docs/sync-protocol.md` and `docs/architecture.md` (local database section).

**Requirements:**
- Install and configure Dexie in `apps/web/src/storage/`
- Define local database schema matching server entities:
  - workspaces, memberships, accounts, categories, transactions, budget_periods, budget_limits, tags, transaction_tags
  - sync_outbox (pending operations)
  - sync_metadata (cursors, device info)
- Create local repository layer (one per entity):
  - `storage/repositories/local-transactions.repository.ts`
  - `storage/repositories/local-accounts.repository.ts`
  - etc.
- Bootstrap data after login:
  - On first login or empty local DB: fetch all workspace data via API and populate local DB
  - On subsequent opens: read from local DB immediately
- Modify all UI views to read from local DB instead of API:
  - Transaction list reads from IndexedDB
  - Account list reads from IndexedDB
  - Categories read from IndexedDB
  - Budgets read from IndexedDB
  - Dashboard aggregates from IndexedDB
- On logout: clear all local data for the user

**Quality rules:**
- Storage layer is decoupled from UI components
- Repositories return typed data
- Error handling for IndexedDB operations
- No direct Dexie calls in UI components

**Acceptance criteria:**
- Data is stored in IndexedDB after login
- UI renders from local data (works even if API goes down after initial load)
- Logout clears local data
- Storage layer is modular and testable

---

## Prompt 7 — Sync Engine

Implement the full push/pull sync system.

Read `docs/sync-protocol.md` carefully — it is the primary reference for this stage.

**Backend (sync module):**
- `POST /api/v1/sync/push` — accept batch of operations, validate, apply, return per-operation results
  - Check idempotency (operationId + deviceId)
  - Validate payload
  - Check baseVersion against current entity version
  - Apply change transactionally
  - Increment entity version
  - Write to sync_changes log
  - Write to sync_operation_receipts
  - Return accepted/rejected per operation
- `GET /api/v1/sync/pull` — return changes since cursor
  - Query sync_changes WHERE workspace_id = X AND id > cursor
  - Support pagination (limit, hasMore)
  - Return deterministic ordering (by id ASC)
  - Return nextCursor

**Frontend (sync module in `apps/web/src/sync/`):**
- Outbox manager:
  - When user creates/updates/deletes locally, create outbox entry
  - Persist outbox in IndexedDB (survives restart)
  - Outbox entries have: id, entityType, entityId, operationType, baseVersion, payload, retryCount, status
- Sync orchestrator:
  - Sync lock (prevent parallel syncs)
  - Push: send all pending outbox items to /sync/push
  - On success: mark outbox items as synced, remove from outbox
  - Pull: fetch changes from /sync/pull with current cursor
  - Apply remote changes to local IndexedDB
  - Update local cursor
  - Handle pagination (hasMore = true → keep pulling)
- Sync triggers:
  - On app start
  - On network recovery (online event)
  - On visibility change (app regains focus)
  - On manual "Sync now" button
- Network awareness:
  - Detect online/offline state
  - Show in sync status component
- Retry logic:
  - Increment retryCount on failure
  - Don't delete failed items from outbox
  - Retry on next sync trigger
- Sync status UI:
  - Online/offline indicator
  - "Syncing..." during active sync
  - "Last synced: [time]" after success
  - "X changes pending" when offline
  - "Sync error" with retry button on failure

**Quality rules:**
- Outbox entries are never lost
- Sync is transactional (push then pull, not interleaved)
- Backend validates every operation independently
- Idempotency prevents duplicate application
- Tests for: outbox creation, push happy path, pull happy path, version conflict rejection

**Acceptance criteria:**
- Creating a transaction offline adds it to outbox
- Coming online triggers sync
- Push sends operations to server successfully
- Pull fetches remote changes and updates local DB
- Sync status displays correctly
- Basic version conflict is handled (rejected with info)
- Outbox survives app restart
- Tests pass

---

## Prompt 8 — Docker and CI

Add the infrastructure layer.

Read `docs/docker-setup.md` and `docs/github-actions.md`.

**Docker:**
- `infra/docker/web.Dockerfile` — multi-stage build for frontend (Node build → nginx serve)
- `infra/docker/api.Dockerfile` — multi-stage build for backend (Node build → Node runtime, non-root)
- `infra/docker/compose/docker-compose.yml` — full stack:
  - web, api, postgres, caddy
  - Private network
  - Persistent volume for postgres
  - Healthchecks on all services
  - `.env` file for configuration
- `infra/docker/caddy/Caddyfile` — reverse proxy config
- `.env.example` with all required variables

**GitHub Actions:**
- `.github/workflows/ci.yml`:
  - Trigger: push to main, pull_request
  - Jobs: lint, typecheck, test, build
  - pnpm cache
- `.github/workflows/docker.yml`:
  - Trigger: push to main, tags, workflow_dispatch
  - Build web and api images
  - Tag with commit SHA

**README update:**
- How to run locally (dev mode)
- How to run with Docker Compose
- Environment variables reference
- Migration instructions
- CI status badge placeholder

**Acceptance criteria:**
- `docker compose up --build` starts the entire system
- Frontend accessible through Caddy
- Backend connects to PostgreSQL
- Database has persistent volume
- CI workflow runs lint/typecheck/test/build
- Docker workflow builds images
- README has complete setup instructions

---

## Prompt 9 — Hardening and Polish

Final stabilization pass.

Read `docs/testing-strategy.md` and `docs/mvp-roadmap.md` (hardening section).

**Requirements:**
- Review all views for proper loading/empty/error/offline states
- Improve error handling in API client and sync engine
- Add missing unit tests for:
  - Auth service edge cases
  - Workspace isolation
  - Transaction CRUD
  - Sync push/pull
  - Local storage repositories
- Add integration tests for:
  - Full auth flow
  - Workspace access control
  - Sync round-trip
- Fix any TypeScript errors or warnings
- Review for oversized files (>300 lines) and refactor
- Review for business logic in controllers — move to services
- Ensure all Zod schemas are in shared-validation package
- PWA install experience (manifest icons, offline fallback page)
- Sync conflict user messaging
- Update README changelog
- Clean up any TODO comments or placeholder code
- Verify Docker Compose works end-to-end
- Verify CI pipeline passes

**Acceptance criteria:**
- Project is consistent and clean
- All critical paths have test coverage
- No TypeScript errors
- Architecture is modular (no god classes, no monolithic files)
- Offline experience is smooth
- Sync status is clear and helpful
- Docker Compose works reliably
- CI passes all gates
- README is complete and accurate
- Project is ready for real daily use and continued development
