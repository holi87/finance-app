# Budget Tracker

Offline-first budget management application. Manage multiple independent financial workspaces (household, sole proprietorship, company, shared budget) as a web app and iPhone PWA with full offline support and sync.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), PWA
- **Backend:** Node.js, NestJS, PostgreSQL, Prisma, JWT + refresh tokens, Argon2
- **Monorepo:** pnpm workspaces
- **Infra:** Docker, Docker Compose, Caddy reverse proxy, GitHub Actions

## Project Structure

```
budget-tracker/
├── apps/
│   ├── web/                  # React PWA frontend
│   └── api/                  # NestJS backend
├── packages/
│   ├── shared-types/         # Domain types, enums, DTO contracts
│   ├── shared-validation/    # Zod schemas shared by frontend & backend
│   ├── sync-engine/          # Outbox model, cursor helpers, merge logic
│   ├── ui/                   # Shared UI components, design tokens
│   └── config/               # Shared TS, ESLint, Prettier configs
├── infra/
│   └── docker/               # Dockerfiles, compose files, Caddyfile
├── docs/                     # Architecture & design documents
└── .github/workflows/        # CI/CD
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Format code
pnpm format
```

## Changelog

### v0.8.0 — Stage 8: Docker & CI
- Multi-stage API Dockerfile (install → build → production with non-root user)
- Multi-stage Web Dockerfile (install → build → Caddy-based static serving)
- Docker Compose production config with PostgreSQL, API, Web, and Caddy reverse proxy
- Docker Compose dev config (PostgreSQL only for local development)
- Caddy reverse proxy with HTTPS, security headers, gzip, API/web routing
- GitHub Actions CI workflow (lint, typecheck, test, build with pnpm caching)
- GitHub Actions Docker workflow (build API + Web images with Buildx caching)
- .dockerignore for clean build contexts
- .env.example with all required environment variables
- Health checks on all services
- Persistent volumes for PostgreSQL data and Caddy certificates

### v0.7.0 — Stage 7: Sync Engine
- Backend sync service with push/pull endpoints
- Push: idempotency via operation receipts, version-based conflict detection
- Pull: cursor-based pagination over sync_changes table
- Transactional operation processing (create/update/delete) with sync change recording
- Frontend sync orchestrator with full push/pull cycle
- Sync lock to prevent concurrent sync operations
- Status listener pattern for reactive UI updates
- Auto-sync triggers: online recovery, app resume (visibility change)
- SyncBadge integrated with real sync status (idle/syncing/offline/error + pending count)
- useSyncInit hook for workspace-aware sync initialization
- Device ID persistence for idempotent operations
- Vite proxy rewrite for api/v1 prefix consistency

### v0.6.0 — Stage 6: Offline Storage
- Dexie IndexedDB database with schema for all entities
- Local repositories: accounts, categories, transactions, budgets, sync
- Data bootstrap after login (fetches all workspace data to IndexedDB)
- Sync outbox repository for pending changes
- Sync metadata repository for cursors and last-synced timestamps
- Logout clears all local data
- Indexed compound keys for workspace-scoped queries

### v0.5.0 — Stage 5: Frontend Foundation
- React + Vite + TypeScript + Tailwind CSS v4 app
- PWA manifest and service worker configuration
- JWT-based auth with auto-refresh on 401
- AuthContext and WorkspaceContext providers
- Login page, workspace switcher, workspace list/create
- Dashboard with balance cards and recent transactions
- Transaction list with filters, pagination, FAB for quick add
- Transaction form (expense/income/transfer) with validation
- Accounts list page with balance display
- Categories list page with tabbed expense/income view
- Budget page with progress bars and utilization tracking
- Settings page with profile, sync, and device info
- Responsive AppLayout: sidebar (desktop) + bottom nav (mobile)
- SyncBadge, LoadingSpinner, EmptyState components
- iPhone PWA safe area handling

### v0.4.0 — Stage 4: Financial Model
- Accounts CRUD with balance caching and sync change tracking
- Categories CRUD with parent-child hierarchy support
- Transactions CRUD with filtering, pagination, balance updates
- Transfer endpoint creating paired transactions with transfer link
- Budget periods and budget limits CRUD with unique constraints
- Reports: summary (income/expense/balance) and by-category breakdown
- Soft delete for all financial entities with version increment
- Every mutation records sync_changes for pull sync

### v0.3.0 — Stage 3: Auth & Workspaces
- JWT authentication with access + refresh token rotation
- Argon2 password hashing
- Login, register, refresh, logout endpoints
- `GET /api/v1/users/me` endpoint
- Workspace CRUD (create, list, get, update)
- Membership management (list, add, update role)
- Workspace-scoped guard with role-based access (owner/editor/viewer)
- Database seed script with test user

### v0.2.0 — Stage 2: Backend Foundation
- NestJS application with ConfigModule, global exception filter, validation pipe
- Prisma schema with full database model (15 tables, indexes, constraints)
- PrismaService with lifecycle management
- Health endpoint (`GET /api/v1/health`)
- Module stubs for all domain modules (auth, users, workspaces, memberships, accounts, categories, transactions, budgets, reports, sync)
- CORS configuration, request logging

### v0.1.0 — Stage 1: Repository Foundation
- pnpm monorepo with workspace configuration
- Shared TypeScript config (strict mode)
- ESLint + Prettier configuration
- `shared-types`: domain entities, API types, sync types, enums
- `shared-validation`: Zod schemas for all domain operations
- `sync-engine`: outbox helpers, cursor management, sync types
- `ui` and `config` package stubs
- `apps/web` and `apps/api` placeholders

### v0.0.1
- Initial project setup
