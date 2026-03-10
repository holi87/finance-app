# Budget Tracker — API Contract

## 1. General

- Base prefix: `/api/v1`
- Format: JSON
- Auth: JWT Bearer token on all endpoints except login
- Consistent error format
- Validated payloads (Zod schemas shared with frontend)

## 2. Error response format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": []
  }
}
```

Standard HTTP codes: 200, 201, 400, 401, 403, 404, 409 (conflict), 500.

## 3. Auth

### POST /api/v1/auth/login
```json
// Request
{ "email": "user@example.com", "password": "secret" }

// Response 200
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "...", "email": "user@example.com", "displayName": "User" }
}
```

### POST /api/v1/auth/refresh
```json
// Request
{ "refreshToken": "..." }

// Response 200
{ "accessToken": "...", "refreshToken": "..." }
```

### POST /api/v1/auth/logout
Invalidates refresh token. No body needed (auth from JWT).

## 4. Users

### GET /api/v1/users/me
Returns the authenticated user profile.

```json
// Response 200
{ "id": "...", "email": "user@example.com", "displayName": "User" }
```

## 5. Workspaces

### GET /api/v1/workspaces
List workspaces the user belongs to.

```json
// Response 200
[
  {
    "id": "ws-1", "name": "Domowy", "type": "personal",
    "baseCurrency": "PLN", "role": "owner"
  }
]
```

### POST /api/v1/workspaces
```json
// Request
{ "name": "Domowy", "type": "personal", "baseCurrency": "PLN" }
```

### GET /api/v1/workspaces/:workspaceId
Workspace details.

### PATCH /api/v1/workspaces/:workspaceId
Update workspace.

### GET /api/v1/workspaces/:workspaceId/members
List members.

### POST /api/v1/workspaces/:workspaceId/members
```json
// Request
{ "userId": "user-2", "role": "editor" }
```

### PATCH /api/v1/workspaces/:workspaceId/members/:membershipId
Change member role.

## 6. Accounts

All scoped to workspace: `/api/v1/workspaces/:workspaceId/accounts`

### GET .../accounts
List accounts.

### POST .../accounts
```json
{ "name": "Main account", "type": "bank", "currency": "PLN", "openingBalance": "1000.00" }
```

### PATCH .../accounts/:accountId
Update account.

### DELETE .../accounts/:accountId
Soft delete.

## 7. Categories

All scoped to workspace: `/api/v1/workspaces/:workspaceId/categories`

### GET .../categories
List categories.

### POST .../categories
```json
{ "name": "Food", "kind": "expense", "color": "#22c55e" }
```

### PATCH .../categories/:categoryId
Update.

### DELETE .../categories/:categoryId
Soft delete.

## 8. Transactions

All scoped to workspace: `/api/v1/workspaces/:workspaceId/transactions`

### GET .../transactions
List with filters: `from`, `to`, `accountId`, `categoryId`, `type`, `page`, `pageSize`.

```json
// Response 200
{
  "items": [
    {
      "id": "txn-1", "workspaceId": "ws-1", "accountId": "acc-1",
      "categoryId": "cat-1", "type": "expense", "amount": "120.00",
      "currency": "PLN", "description": "Groceries",
      "transactionDate": "2026-03-10", "version": 1,
      "createdAt": "...", "updatedAt": "..."
    }
  ],
  "page": 1, "pageSize": 20, "total": 1
}
```

### POST .../transactions
```json
{
  "accountId": "acc-1", "categoryId": "cat-1", "type": "expense",
  "amount": "120.00", "currency": "PLN", "description": "Groceries",
  "notes": "Biedronka", "transactionDate": "2026-03-10"
}
```

### GET .../transactions/:transactionId
Detail.

### PATCH .../transactions/:transactionId
Update.

### DELETE .../transactions/:transactionId
Soft delete.

## 9. Transfers

### POST /api/v1/workspaces/:workspaceId/transfers
Creates two linked transactions (outbound + inbound).

```json
{
  "fromAccountId": "acc-1", "toAccountId": "acc-2",
  "amount": "500.00", "currency": "PLN",
  "description": "Transfer to savings", "transactionDate": "2026-03-10"
}
```

## 10. Budgets

### GET .../budget-periods
List budget periods for workspace.

### POST .../budget-periods
Create budget period.

### GET .../budget-limits
List budget limits.

### POST .../budget-limits
```json
{
  "budgetPeriodId": "bp-1", "categoryId": "cat-1",
  "amount": "1000.00", "currency": "PLN"
}
```

### PATCH .../budget-limits/:budgetLimitId
Update.

### DELETE .../budget-limits/:budgetLimitId
Soft delete.

## 11. Reports

### GET .../reports/summary
Params: `from`, `to`

```json
{
  "incomeTotal": "10000.00", "expenseTotal": "4200.00",
  "balance": "5800.00", "currency": "PLN"
}
```

### GET .../reports/by-category
Expense totals per category for a date range.

## 12. Sync

### POST /api/v1/sync/push
Client sends batch of local operations.

```json
// Request
{
  "deviceId": "device-1",
  "workspaceId": "ws-1",
  "operations": [
    {
      "operationId": "op-1",
      "entityType": "transaction",
      "entityId": "txn-1",
      "operationType": "create",
      "baseVersion": 0,
      "payload": {
        "accountId": "acc-1", "categoryId": "cat-1",
        "type": "expense", "amount": "120.00", "currency": "PLN",
        "description": "Groceries", "transactionDate": "2026-03-10"
      }
    }
  ]
}

// Response 200
{
  "accepted": [
    {
      "operationId": "op-1", "entityType": "transaction",
      "entityId": "txn-1", "newVersion": 1, "status": "applied"
    }
  ],
  "rejected": []
}
```

### GET /api/v1/sync/pull
Params: `workspaceId`, `cursor`, `limit` (optional)

```json
// Response 200
{
  "changes": [
    {
      "changeId": 121, "entityType": "transaction",
      "entityId": "txn-2", "operationType": "update",
      "version": 3, "changedAt": "2026-03-10T12:00:00Z",
      "payload": {}
    }
  ],
  "nextCursor": 121,
  "hasMore": false
}
```

## 13. Health

### GET /api/v1/health
```json
{ "status": "ok" }
```

## 14. Authorization rules

- User must be a member of the workspace for any workspace-scoped operation
- **viewer**: read-only access to financial data
- **editor**: read + write financial data (transactions, accounts, categories, budgets)
- **owner**: editor permissions + member management + workspace settings

## 15. Contract principles

- DTOs shared logically between frontend and backend (via `shared-types` and `shared-validation`)
- All payloads validated with Zod schemas
- API should be ready for OpenAPI documentation generation
- Sync endpoints are first-class API citizens
