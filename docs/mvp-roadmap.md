# Budget Tracker — MVP Roadmap

## 1. Purpose

This roadmap guides implementation from empty repo to working MVP in controlled, logical stages. Each stage must leave the project in a consistent, runnable, testable state.

## 2. Pre-implementation decisions (Stage 0)

Confirmed defaults for MVP:
- One currency per workspace
- Categories scoped per workspace
- Roles: owner, editor, viewer
- Monthly budget periods
- No attachments, no CSV import in MVP
- Simple conflict handling (version-based, last-write-wins for simple cases)
- Offline-first as core requirement

## 3. Stage 1 — Repository foundation

**Scope:**
- Create monorepo with pnpm workspaces
- Directory structure: `apps/web`, `apps/api`, `packages/*`, `infra/docker`, `docs/`, `.github/workflows/`
- Shared TypeScript config (base tsconfig)
- ESLint + Prettier configuration
- Root package.json with workspace scripts
- README with project description
- `.gitignore`

**Done when:**
- `pnpm install` works
- `pnpm lint` and `pnpm typecheck` can run
- Structure matches documentation

## 4. Stage 2 — Backend foundation

**Scope:**
- Initialize NestJS in `apps/api`
- Environment variable configuration
- PostgreSQL + Prisma setup
- First migration with core tables
- Health endpoint (`GET /api/v1/health`)
- Module stubs for all backend modules
- Basic project structure per module

**Done when:**
- Backend starts
- `/api/v1/health` returns ok
- Prisma connects to PostgreSQL
- Module structure is modular

## 5. Stage 3 — Auth and workspaces

**Scope:**
- User model and registration/seeding
- Login endpoint (email + password)
- JWT access token + refresh token flow
- Argon2 password hashing
- Workspace CRUD
- Membership model
- Role-based access (owner/editor/viewer)
- Workspace-scoped guards

**Done when:**
- User can log in and get tokens
- User can list their workspaces
- Roles are enforced on workspace endpoints

## 6. Stage 4 — Financial model

**Scope:**
- Accounts CRUD
- Categories CRUD
- Transactions CRUD (income, expense)
- Transfer endpoint (creates linked pair)
- Budget periods and budget limits
- DTO validation (Zod schemas)
- Workspace-scoped filtering
- Soft delete with `deletedAt`
- Version field on all entities

**Done when:**
- Basic financial operations work via API
- Data is isolated per workspace
- Records have version/updatedAt/deletedAt

## 7. Stage 5 — Frontend foundation

**Scope:**
- Initialize React + Vite + TypeScript in `apps/web`
- Routing setup
- App shell with mobile layout
- Login screen
- Workspace switcher
- Dashboard skeleton
- Sync status placeholder
- Tailwind CSS setup
- PWA bootstrap (manifest, basic service worker)
- Shared UI components

**Done when:**
- Frontend starts and renders
- Login screen works (connects to API)
- Mobile and desktop layouts exist
- PWA manifest is present

## 8. Stage 6 — Offline storage

**Scope:**
- Dexie (IndexedDB) setup
- Local table definitions mirroring server schema
- Local repository layer
- Data bootstrap after login (initial pull)
- UI reads from local database
- Clean local data on logout

**Done when:**
- Data exists locally in IndexedDB
- UI doesn't depend solely on live API
- Storage layer is modular and testable

## 9. Stage 7 — Sync engine

**Scope:**
- Outbox pattern implementation
- Local operations create outbox entries
- `POST /sync/push` endpoint (backend)
- `GET /sync/pull` endpoint (backend)
- Client push/pull logic
- Cursor-based sync tracking
- Retry on failure
- Sync lock (prevent parallel syncs)
- Update local DB after sync
- Sync status display in UI

**Done when:**
- Local changes are queued in outbox
- Push sends operations to server
- Pull fetches remote changes
- Basic version conflict is handled
- Sync status shows in UI

## 10. Stage 8 — Docker and CI

**Scope:**
- Dockerfile for web (multi-stage)
- Dockerfile for api (multi-stage)
- docker-compose.yml with all services
- PostgreSQL with persistent volume
- Caddy reverse proxy
- `.env.example`
- GitHub Actions: lint, typecheck, test, build, docker build
- README with run instructions

**Done when:**
- `docker compose up` starts everything
- CI pipeline passes
- Docker images build correctly

## 11. Stage 9 — Hardening

**Scope:**
- Improve error handling across app
- Complete empty/loading/error/offline states
- Expand test coverage for critical paths
- Review architecture for large files or bad dependencies
- Finalize README and documentation
- PWA install experience
- Conflict messaging in UI
- Backup script or runbook

**Done when:**
- Project is consistent and clean
- Architecture hasn't drifted into monolith
- Key paths are polished
- Repo is ready for continued development

## 12. MVP completion criteria

MVP is done when a user can:
- Log in
- Have multiple workspaces
- Switch between workspaces
- Add accounts, categories, and transactions
- See basic budget utilization
- Use the app offline
- Have data sync when back online
- Run the whole stack via Docker Compose
- Have CI pipeline passing
