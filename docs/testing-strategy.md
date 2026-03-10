# Budget Tracker — Testing Strategy

## 1. Purpose

Ensure stability, predictability, and safety when making changes — especially in the critical areas of sync, offline behavior, and workspace isolation.

## 2. Test priorities

Test what's most expensive to break:
1. Authorization and workspace isolation
2. Transaction flows (create, update, delete, transfer)
3. Sync engine (push, pull, conflict handling)
4. Local storage operations
5. Core UI paths (login, add transaction, workspace switch)

## 3. Test layers

### Unit tests
- Backend services (auth, accounts, categories, transactions, budgets, sync)
- Validation schemas (Zod)
- Sync helpers (outbox, cursor, merge logic)
- Mappers and transformers
- Local storage repositories (client-side)
- Form logic and feature hooks

### Integration tests
- Backend endpoints (HTTP → service → database)
- Authorization enforcement (role checks, workspace isolation)
- Sync push/pull (end-to-end through API)
- Database operations (Prisma + PostgreSQL)

### E2E tests (when mature)
- Login → workspace → add transaction → verify list
- Offline add → come online → sync → verify consistency
- Viewer role attempts write → denied

## 4. Backend test coverage (minimum)

- Auth service: login, refresh, invalid credentials
- Workspace: create, list, access control
- Accounts: CRUD, workspace isolation
- Categories: CRUD, workspace isolation
- Transactions: CRUD, transfer, version increment, soft delete
- Budgets: CRUD, unique constraints
- Sync: push with valid/invalid baseVersion, pull with cursor, idempotency
- Health: returns ok

Critical cases:
- User without workspace access cannot see data
- Viewer cannot write data
- Transfer creates correct paired entries
- Update increments version
- Soft delete sets deletedAt
- Push rejects mismatched baseVersion

## 5. Frontend test coverage (minimum)

- Workspace switcher behavior
- Transaction form validation
- Sync status display
- Local storage adapters (read/write/delete)
- Feature hooks (data fetching, mutations)
- Empty/loading/error state rendering

## 6. Sync-specific tests

- Outbox item created after local write
- Push sends correct operations
- Pull fetches changes after cursor
- Retry on network failure
- No outbox data loss after app restart
- Version conflict handling
- Local DB updated after successful sync

## 7. Quality gates in CI

Pipeline must require:
- lint pass
- typecheck pass
- unit tests pass
- selected integration tests pass
- build succeeds

## 8. Code quality standards

- Full TypeScript (no `any`)
- Readable names
- Small modules
- No business logic in controllers
- No giant UI components without decomposition
- No tight coupling between unrelated modules

## 9. Definition of done

Testing layer is ready when:
- Critical paths have tests
- CI blocks regressions
- Architecture remains modular
- Sync and offline have meaningful test coverage
- Project can grow without fear of breaking fundamentals
