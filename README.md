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
