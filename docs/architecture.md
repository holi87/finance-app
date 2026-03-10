# Budget Tracker — Architecture

## 1. System style

- **Offline-first** client with local database
- **Centralized sync backend** as source of truth
- **Modular monolith** backend (NestJS)
- **Monorepo** managed by pnpm workspaces

## 2. High-level data flow

```
User action → Local DB write → UI update (immediate) → Outbox entry
                                                            ↓
                                              Network available?
                                              ↓ yes
                                      POST /sync/push (batch operations)
                                              ↓
                                      Backend validates, applies, logs changes
                                              ↓
                                      GET /sync/pull (fetch remote changes)
                                              ↓
                                      Update local DB + cursor
```

## 3. Client architecture

The client is a React PWA that works as both a web app and an iPhone home-screen app.

### Responsibilities
- Render UI from local data
- Handle authentication (JWT stored securely)
- Maintain local IndexedDB database via Dexie
- Queue changes in outbox when offline
- Execute push/pull sync when network is available
- Show sync status to user at all times

### Client modules
- `app/` — entrypoint, router, providers, error boundaries
- `features/auth/` — login, token management
- `features/workspaces/` — workspace switcher, workspace settings
- `features/dashboard/` — summary cards, recent transactions
- `features/accounts/` — account list, account form
- `features/categories/` — category list, category form
- `features/transactions/` — transaction list, transaction form, filters
- `features/budgets/` — budget periods, budget limits, utilization
- `features/settings/` — profile, preferences, device info
- `storage/` — Dexie database, local repositories, schema
- `sync/` — outbox, push/pull, retry, cursor, network awareness
- `services/` — API client, auth interceptor
- `components/` — shared UI components (Button, Input, Modal, SyncBadge, etc.)
- `layouts/` — app shell, mobile nav, desktop sidebar

### Local database (IndexedDB via Dexie)

Stores locally:
- workspaces, memberships
- accounts, categories, transactions, budget_periods, budget_limits
- tags, transaction_tags
- sync_outbox (pending operations)
- sync_cursors (last pulled change ID per workspace)
- device metadata

**Design rule:** UI always reads from local DB, never directly from API for business data.

## 4. Sync engine

The sync engine is a separate module (`packages/sync-engine` for shared types, `apps/web/src/sync/` for client logic, `apps/api/src/modules/sync/` for backend logic).

### Sync timing
- On app start
- On network recovery
- On app focus regain
- On manual "Sync now" tap
- Optionally on a periodic timer during active session

### Sync sequence
1. Acquire sync lock (prevent parallel syncs)
2. Push: send outbox operations to `POST /sync/push`
3. On success: mark outbox items as synced
4. Pull: fetch changes from `GET /sync/pull?cursor=X`
5. Apply remote changes to local DB
6. Update local cursor
7. Refresh UI and sync status
8. Release lock

### Conflict strategy (MVP)
- Each entity has a `version` field incremented on every change
- Client sends `baseVersion` with each push operation
- If server version ≠ baseVersion → conflict
- Simple cases: last-write-wins
- Risky cases: reject and notify client
- Future: explicit conflict resolution UI

## 5. Backend architecture

Modular monolith in NestJS. Each domain has its own module with clear internal structure.

### Backend modules
- `auth` — login, refresh, logout, JWT guards
- `users` — user profile, user management
- `workspaces` — workspace CRUD, settings
- `memberships` — workspace membership, role management
- `accounts` — financial account CRUD
- `categories` — category CRUD (per workspace)
- `transactions` — income/expense/transfer CRUD
- `budgets` — budget periods, budget limits
- `reports` — summary, by-category aggregations
- `sync` — push/pull endpoints, change log, conflict detection
- `health` — health check endpoint

### Module internal structure
```
modules/transactions/
├── controllers/
│   └── transactions.controller.ts
├── services/
│   └── transactions.service.ts
├── dto/
│   ├── create-transaction.dto.ts
│   └── update-transaction.dto.ts
├── repositories/
│   └── transactions.repository.ts
├── mappers/
│   └── transaction.mapper.ts
├── validators/
├── policies/
├── transactions.module.ts
└── __tests__/
```

**Rules:**
- Controllers: only HTTP concerns (parse request, call service, return response)
- Services: business logic, authorization checks, orchestration
- Repositories: database access via Prisma
- No circular dependencies between modules
- No direct import of another module's internals — use exported public API

## 6. API design

RESTful with prefix `/api/v1`. JSON request/response bodies.

All business endpoints require JWT authentication. Workspace-scoped endpoints require membership verification and role checking.

Sync endpoints (`/sync/push`, `/sync/pull`) are first-class API citizens, not afterthoughts.

Full endpoint specifications are in `docs/api-contract.md`.

## 7. Authorization model

Every business request is validated for:
1. Valid JWT → identifies user
2. Workspace membership → user belongs to workspace
3. Role permission → user's role allows the operation

Roles:
- **owner** — full control (CRUD + member management + workspace settings)
- **editor** — read + write financial data
- **viewer** — read only

Authorization is enforced at the service layer using guards and decorators, not by UI filtering alone.

## 8. Data architecture

Central PostgreSQL database stores the full system state.

Key design decisions:
- All financial entities scoped by `workspace_id`
- Soft delete (`deleted_at`) for synced entities
- Record versioning (`version` integer, incremented on each change)
- `sync_changes` table logs every entity mutation for pull sync
- `sync_operation_receipts` table enables push idempotency
- `sync_cursors` table tracks per-device sync position

Full schema in `docs/database-schema.md`.

## 9. PWA architecture

### Manifest & service worker
- Web app manifest for installability
- Service worker caches app shell and static assets
- App updates via standard SW update flow

### iPhone PWA constraints
- No reliable background sync when app is closed
- Sync must happen during active sessions
- Outbox must be durable (persisted in IndexedDB)
- Sync status must be clearly visible
- Manual "Sync now" button always available

## 10. Deployment topology

```
Internet → Caddy (reverse proxy, TLS) → web (static frontend)
                                       → api (NestJS)
                                              ↓
                                         PostgreSQL (private network, persistent volume)
```

- Caddy handles HTTPS termination and routing
- `web` serves static build output
- `api` connects to `postgres` on Docker internal network
- `postgres` uses a persistent Docker volume
- Target host: Mac Mini M4 running Docker Compose

## 11. Key architectural principles

1. **Separation of concerns** — clear boundaries between UI, business logic, data access, sync
2. **Modularity** — small, focused modules with explicit contracts
3. **Offline-first is foundational** — not bolted on later
4. **Workspace isolation** — data boundary enforced at every layer
5. **No god classes** — services, controllers, components must stay small
6. **Sync is core infrastructure** — treated with the same rigor as auth or data access
7. **Domain/transport/infrastructure layers** — clearly separated in backend
