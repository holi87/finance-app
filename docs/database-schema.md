# Budget Tracker — Database Schema

## 1. Overview

Central database: PostgreSQL (stable LTS version).

The schema supports:
- Multiple workspaces with data isolation
- User roles and memberships
- Financial transactions, accounts, categories, budgets
- Offline-first sync (change log, cursors, operation receipts)
- Record versioning and soft delete

## 2. Tables

### users
```sql
id              UUID PRIMARY KEY
email           TEXT UNIQUE NOT NULL
password_hash   TEXT NOT NULL
display_name    TEXT NOT NULL
is_active       BOOLEAN NOT NULL DEFAULT true
created_at      TIMESTAMPTZ NOT NULL
updated_at      TIMESTAMPTZ NOT NULL
last_login_at   TIMESTAMPTZ NULL
```

### devices
```sql
id              UUID PRIMARY KEY
user_id         UUID NOT NULL REFERENCES users(id)
device_name     TEXT NOT NULL
platform        TEXT NOT NULL
last_seen_at    TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL
updated_at      TIMESTAMPTZ NOT NULL
```

### workspaces
```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL
slug            TEXT NOT NULL
type            TEXT NOT NULL              -- personal, business, company, shared
base_currency   CHAR(3) NOT NULL
owner_id        UUID NOT NULL REFERENCES users(id)
archived_at     TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL
updated_at      TIMESTAMPTZ NOT NULL

UNIQUE(owner_id, slug)
```

### memberships
```sql
id              UUID PRIMARY KEY
workspace_id    UUID NOT NULL REFERENCES workspaces(id)
user_id         UUID NOT NULL REFERENCES users(id)
role            TEXT NOT NULL              -- owner, editor, viewer
invited_by      UUID NULL REFERENCES users(id)
created_at      TIMESTAMPTZ NOT NULL
updated_at      TIMESTAMPTZ NOT NULL

UNIQUE(workspace_id, user_id)
```

### accounts
```sql
id                      UUID PRIMARY KEY
workspace_id            UUID NOT NULL REFERENCES workspaces(id)
name                    TEXT NOT NULL
type                    TEXT NOT NULL      -- cash, bank, savings, credit, investment
currency                CHAR(3) NOT NULL
opening_balance         NUMERIC(18,2) NOT NULL DEFAULT 0
current_balance_cached  NUMERIC(18,2) NOT NULL DEFAULT 0
is_archived             BOOLEAN NOT NULL DEFAULT false
version                 INTEGER NOT NULL DEFAULT 1
created_at              TIMESTAMPTZ NOT NULL
updated_at              TIMESTAMPTZ NOT NULL
deleted_at              TIMESTAMPTZ NULL
```

### categories
```sql
id                  UUID PRIMARY KEY
workspace_id        UUID NOT NULL REFERENCES workspaces(id)
parent_category_id  UUID NULL REFERENCES categories(id)
name                TEXT NOT NULL
kind                TEXT NOT NULL          -- expense, income, both
color               TEXT NULL
icon                TEXT NULL
is_archived         BOOLEAN NOT NULL DEFAULT false
version             INTEGER NOT NULL DEFAULT 1
created_at          TIMESTAMPTZ NOT NULL
updated_at          TIMESTAMPTZ NOT NULL
deleted_at          TIMESTAMPTZ NULL
```

### transactions
```sql
id                UUID PRIMARY KEY
workspace_id      UUID NOT NULL REFERENCES workspaces(id)
account_id        UUID NOT NULL REFERENCES accounts(id)
category_id       UUID NULL REFERENCES categories(id)
type              TEXT NOT NULL            -- expense, income, transfer
amount            NUMERIC(18,2) NOT NULL
currency          CHAR(3) NOT NULL
description       TEXT NULL
notes             TEXT NULL
transaction_date  DATE NOT NULL
created_by        UUID NOT NULL REFERENCES users(id)
version           INTEGER NOT NULL DEFAULT 1
created_at        TIMESTAMPTZ NOT NULL
updated_at        TIMESTAMPTZ NOT NULL
deleted_at        TIMESTAMPTZ NULL
```

### transfer_links
```sql
id                        UUID PRIMARY KEY
workspace_id              UUID NOT NULL REFERENCES workspaces(id)
outbound_transaction_id   UUID NOT NULL REFERENCES transactions(id)
inbound_transaction_id    UUID NOT NULL REFERENCES transactions(id)
created_at                TIMESTAMPTZ NOT NULL
```

### budget_periods
```sql
id              UUID PRIMARY KEY
workspace_id    UUID NOT NULL REFERENCES workspaces(id)
period_type     TEXT NOT NULL             -- monthly
starts_at       DATE NOT NULL
ends_at         DATE NOT NULL
created_at      TIMESTAMPTZ NOT NULL
updated_at      TIMESTAMPTZ NOT NULL
```

### budget_limits
```sql
id                UUID PRIMARY KEY
workspace_id      UUID NOT NULL REFERENCES workspaces(id)
budget_period_id  UUID NOT NULL REFERENCES budget_periods(id)
category_id       UUID NOT NULL REFERENCES categories(id)
amount            NUMERIC(18,2) NOT NULL
currency          CHAR(3) NOT NULL
version           INTEGER NOT NULL DEFAULT 1
created_at        TIMESTAMPTZ NOT NULL
updated_at        TIMESTAMPTZ NOT NULL
deleted_at        TIMESTAMPTZ NULL

UNIQUE(workspace_id, budget_period_id, category_id)
```

### tags
```sql
id              UUID PRIMARY KEY
workspace_id    UUID NOT NULL REFERENCES workspaces(id)
name            TEXT NOT NULL
color           TEXT NULL
version         INTEGER NOT NULL DEFAULT 1
created_at      TIMESTAMPTZ NOT NULL
updated_at      TIMESTAMPTZ NOT NULL
deleted_at      TIMESTAMPTZ NULL
```

### transaction_tags
```sql
transaction_id  UUID NOT NULL REFERENCES transactions(id)
tag_id          UUID NOT NULL REFERENCES tags(id)

PRIMARY KEY(transaction_id, tag_id)
```

## 3. Sync tables

### sync_changes
Records every entity mutation for the pull endpoint.

```sql
id                BIGSERIAL PRIMARY KEY
workspace_id      UUID NOT NULL REFERENCES workspaces(id)
entity_type       TEXT NOT NULL
entity_id         UUID NOT NULL
operation_type    TEXT NOT NULL            -- create, update, delete
entity_version    INTEGER NOT NULL
changed_by        UUID NULL REFERENCES users(id)
changed_at        TIMESTAMPTZ NOT NULL
payload_snapshot  JSONB NULL
```

### sync_operation_receipts
Enables push idempotency.

```sql
id              BIGSERIAL PRIMARY KEY
operation_id    TEXT NOT NULL
device_id       UUID NOT NULL REFERENCES devices(id)
workspace_id    UUID NOT NULL REFERENCES workspaces(id)
entity_type     TEXT NOT NULL
entity_id       UUID NOT NULL
operation_type  TEXT NOT NULL
processed_at    TIMESTAMPTZ NOT NULL
result_status   TEXT NOT NULL

UNIQUE(operation_id, device_id)
```

### sync_cursors
Tracks per-device sync position.

```sql
id                      UUID PRIMARY KEY
user_id                 UUID NOT NULL REFERENCES users(id)
device_id               UUID NOT NULL REFERENCES devices(id)
workspace_id            UUID NOT NULL REFERENCES workspaces(id)
last_pulled_change_id   BIGINT NOT NULL DEFAULT 0
updated_at              TIMESTAMPTZ NOT NULL

UNIQUE(user_id, device_id, workspace_id)
```

## 4. Recommended indexes

```sql
-- memberships
CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_workspace ON memberships(workspace_id);

-- accounts
CREATE INDEX idx_accounts_workspace_archived ON accounts(workspace_id, is_archived);
CREATE INDEX idx_accounts_workspace_deleted ON accounts(workspace_id, deleted_at);

-- categories
CREATE INDEX idx_categories_workspace_kind ON categories(workspace_id, kind);
CREATE INDEX idx_categories_workspace_deleted ON categories(workspace_id, deleted_at);

-- transactions
CREATE INDEX idx_txn_workspace_date ON transactions(workspace_id, transaction_date DESC);
CREATE INDEX idx_txn_workspace_account ON transactions(workspace_id, account_id);
CREATE INDEX idx_txn_workspace_category ON transactions(workspace_id, category_id);
CREATE INDEX idx_txn_workspace_deleted ON transactions(workspace_id, deleted_at);
CREATE INDEX idx_txn_workspace_updated ON transactions(workspace_id, updated_at);

-- budget_limits
CREATE INDEX idx_budget_limits_workspace_period ON budget_limits(workspace_id, budget_period_id);

-- sync_changes
CREATE INDEX idx_sync_changes_workspace_id ON sync_changes(workspace_id, id);
CREATE INDEX idx_sync_changes_workspace_changed ON sync_changes(workspace_id, changed_at);
CREATE INDEX idx_sync_changes_entity ON sync_changes(workspace_id, entity_type, entity_id);
```

## 5. Integrity rules

- All financial entities must have `workspace_id` — no orphaned records
- No data leakage between workspaces
- Soft delete for all synchronized entities (`deleted_at` instead of hard delete)
- `version` incremented on every mutation
- Every entity change creates a `sync_changes` entry

## 6. Implementation notes

- Use text fields with application-level validation for enums (simpler on MVP than PostgreSQL enums)
- `payload_snapshot` in sync_changes can store full entity snapshot or minimal diff — full snapshot is simpler for MVP
- Prisma handles migrations and schema generation
