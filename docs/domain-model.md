# Budget Tracker — Domain Model

## 1. Core concept

The system is organized around **Workspaces** — independent financial spaces.

Examples: household budget, sole proprietorship (JDG), company, shared budget with spouse.

A Workspace is the primary boundary for data, permissions, reports, categories, accounts, and budgets.

## 2. Entities

### User
System user.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| email | string | unique, required |
| passwordHash | string | Argon2 |
| displayName | string | required |
| isActive | boolean | default true |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| lastLoginAt | DateTime? | |

### Device
User's device, relevant for sync tracking.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | UUID | FK → User |
| deviceName | string | |
| platform | string | e.g. "web", "ios-pwa" |
| lastSeenAt | DateTime? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Workspace
Independent financial space.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| name | string | required |
| slug | string | URL-safe identifier |
| type | enum | personal, business, company, shared |
| baseCurrency | string(3) | e.g. "PLN" |
| ownerId | UUID | FK → User |
| archivedAt | DateTime? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Membership
Links a User to a Workspace with a role.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workspaceId | UUID | FK → Workspace |
| userId | UUID | FK → User |
| role | enum | owner, editor, viewer |
| invitedBy | UUID? | FK → User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

**Constraint:** UNIQUE(workspaceId, userId)

### Account
Financial account within a workspace.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workspaceId | UUID | FK → Workspace |
| name | string | required |
| type | enum | cash, bank, savings, credit, investment |
| currency | string(3) | |
| openingBalance | decimal(18,2) | default 0 |
| currentBalanceCached | decimal(18,2) | default 0 |
| isArchived | boolean | default false |
| version | integer | default 1, incremented on change |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| deletedAt | DateTime? | soft delete |

### Category
Financial category, scoped per workspace.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workspaceId | UUID | FK → Workspace |
| parentCategoryId | UUID? | FK → Category (self-ref) |
| name | string | required |
| kind | enum | expense, income, both |
| color | string? | hex color |
| icon | string? | icon identifier |
| isArchived | boolean | default false |
| version | integer | default 1 |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| deletedAt | DateTime? | soft delete |

### Transaction
Core financial operation.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workspaceId | UUID | FK → Workspace |
| accountId | UUID | FK → Account |
| categoryId | UUID? | FK → Category |
| type | enum | expense, income, transfer |
| amount | decimal(18,2) | positive value |
| currency | string(3) | |
| description | string? | |
| notes | string? | |
| transactionDate | date | |
| createdBy | UUID | FK → User |
| version | integer | default 1 |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| deletedAt | DateTime? | soft delete |

### TransferLink
Links two transactions that represent a transfer between accounts.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workspaceId | UUID | FK → Workspace |
| outboundTransactionId | UUID | FK → Transaction |
| inboundTransactionId | UUID | FK → Transaction |
| createdAt | DateTime | |

### BudgetPeriod
A budget time period (monthly on start).

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workspaceId | UUID | FK → Workspace |
| periodType | enum | monthly |
| startsAt | date | |
| endsAt | date | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### BudgetLimit
Spending limit for a category in a period.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workspaceId | UUID | FK → Workspace |
| budgetPeriodId | UUID | FK → BudgetPeriod |
| categoryId | UUID | FK → Category |
| amount | decimal(18,2) | |
| currency | string(3) | |
| version | integer | default 1 |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| deletedAt | DateTime? | soft delete |

**Constraint:** UNIQUE(workspaceId, budgetPeriodId, categoryId)

### Tag
Optional transaction tagging.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| workspaceId | UUID | FK → Workspace |
| name | string | required |
| color | string? | |
| version | integer | default 1 |
| createdAt | DateTime | |
| updatedAt | DateTime | |
| deletedAt | DateTime? | soft delete |

### TransactionTag
Join table: Transaction ↔ Tag.

PK: (transactionId, tagId)

## 3. Sync entities

### SyncOutboxItem (client-side only)

| Field | Type | Notes |
|-------|------|-------|
| id | string | local operation ID |
| deviceId | string | |
| workspaceId | string | |
| entityType | string | e.g. "transaction" |
| entityId | string | |
| operationType | enum | create, update, delete |
| baseVersion | integer | |
| payload | JSON | |
| createdAt | DateTime | |
| retryCount | integer | default 0 |
| status | enum | pending, synced, failed |

### SyncChange (server-side, for pull)

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | auto-increment PK |
| workspaceId | UUID | |
| entityType | string | |
| entityId | UUID | |
| operationType | string | create, update, delete |
| entityVersion | integer | |
| changedBy | UUID? | |
| changedAt | DateTime | |
| payloadSnapshot | JSON? | |

### SyncCursor (server-side, per device per workspace)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| userId | UUID | |
| deviceId | UUID | |
| workspaceId | UUID | |
| lastPulledChangeId | bigint | default 0 |
| updatedAt | DateTime | |

## 4. Relationships

- User → many Memberships
- Workspace → many Memberships, Accounts, Categories, Transactions, BudgetPeriods, Tags
- Account → many Transactions
- Category → many Transactions, many BudgetLimits; optional self-referencing parent
- Transaction → optional Category; many Tags via TransactionTag
- BudgetPeriod → many BudgetLimits
- Transfer = two linked Transactions via TransferLink

## 5. Business rules

1. **Workspace isolation:** No financial entity exists without a workspaceId. No cross-workspace data access.
2. **Account consistency:** Transfers must be between two accounts in the same workspace.
3. **Categories are per-workspace**, not global.
4. **Budgets** are defined at workspace + period level.
5. **Soft delete** for all synchronized financial entities (set `deletedAt`, don't hard-delete).
6. **Version increment** on every entity mutation — required for sync conflict detection.
7. **One currency per workspace** on MVP start (baseCurrency).

## 6. Sync-required fields

Every synchronized entity must have:
- `id` (UUID)
- `workspaceId` (UUID)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `version` (integer)
- `deletedAt` (DateTime, nullable)
