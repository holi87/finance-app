# Budget Tracker — Instructions for Claude Code

You are the implementation agent for the Budget Tracker project.

## Your mission

Build a production-quality, offline-first budget management application from an empty repository to a working MVP. The app manages multiple independent financial workspaces (household, sole proprietorship, company, shared budget) as a web app and iPhone PWA with full offline support and sync.

## Source of truth

All architectural decisions, domain models, API contracts, database schemas, sync protocols, and infrastructure requirements are defined in the `docs/` directory. **Always read the relevant doc before implementing a module.** If context is lost, re-read `docs/`.

Key documents and their purpose:

| Document | Governs |
|----------|---------|
| `docs/architecture.md` | System layers, data flow, deployment topology |
| `docs/domain-model.md` | Entities, relationships, aggregates, business rules |
| `docs/database-schema.md` | PostgreSQL tables, columns, indexes, constraints |
| `docs/api-contract.md` | REST endpoints, request/response shapes, auth rules |
| `docs/sync-protocol.md` | Push/pull, outbox, cursor, versioning, conflict handling |
| `docs/ui-ux-spec.md` | Views, navigation, mobile-first layout, offline UX |
| `docs/docker-setup.md` | Dockerfiles, compose, networking, volumes |
| `docs/github-actions.md` | CI/CD workflows, quality gates |
| `docs/testing-strategy.md` | Test layers, priorities, sync/offline coverage |
| `docs/security-and-backup.md` | Auth model, secrets, backup/restore |
| `docs/mvp-roadmap.md` | Implementation order, stage definitions, done criteria |
| `docs/deployment-runbook.md` | Mac Mini M4 deployment, rollback, smoke tests |

## Tech stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), Zod, PWA (vite-plugin-pwa)
**Backend:** Node.js, NestJS, PostgreSQL, Prisma, JWT + refresh tokens, Argon2
**Monorepo:** pnpm workspaces
**Infra:** Docker, Docker Compose, Caddy reverse proxy, GitHub Actions
**Testing:** Vitest, supertest (backend integration), Playwright (e2e when mature)

## Repository structure

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

## Implementation order

Build in this exact sequence. Each stage must leave the repo in a buildable, runnable state.

1. **Foundation** — monorepo, pnpm, shared configs, ESLint, Prettier, README
2. **Backend foundation** — NestJS, env config, Prisma, PostgreSQL, health endpoint, module stubs
3. **Auth & workspaces** — user model, JWT auth, refresh tokens, workspace CRUD, memberships, RBAC
4. **Financial model** — accounts, categories, transactions, transfers, budgets CRUD with workspace isolation
5. **Frontend foundation** — React + Vite, routing, app shell, login, workspace switcher, dashboard skeleton, PWA bootstrap
6. **Offline storage** — Dexie IndexedDB, local tables, local repositories, data bootstrap after login
7. **Sync engine** — outbox, push/pull endpoints, cursor sync, retry, conflict detection, UI sync status
8. **Docker & CI** — Dockerfiles (web, api), docker-compose, Caddy, GitHub Actions (lint, typecheck, test, build, docker)
9. **Hardening** — error/empty/loading/offline states, test coverage, doc cleanup, architecture review

## Code quality rules

- Full TypeScript, no `any` unless absolutely unavoidable
- Small focused modules — no file > ~300 lines, no god classes
- Backend: controller → service → repository. No business logic in controllers.
- Frontend: feature-based organization. Each feature owns its components, hooks, actions.
- Shared validation schemas (Zod) used by both frontend and backend
- Every synchronized entity has: `id`, `workspaceId`, `createdAt`, `updatedAt`, `version`, `deletedAt`
- Soft delete for all financial entities
- Workspace isolation enforced at service layer, not just UI

## Commit discipline

- Commit after each meaningful unit of work (new module, new endpoint, new feature screen)
- Update the Changelog section in README.md before each commit
- Never leave the repo in a broken state
- Push after each logical group of commits

## Critical architectural principles

1. **Offline-first is the core, not an add-on.** UI reads from local DB. Changes go to outbox first.
2. **Backend is source of truth.** Sync resolves to server state.
3. **Workspace is the data boundary.** Every financial entity belongs to exactly one workspace. No cross-workspace data leaks.
4. **Sync is a first-class citizen.** Push/pull endpoints are as important as CRUD endpoints.
5. **Modular monolith.** Backend modules have clear boundaries but run in one process.
