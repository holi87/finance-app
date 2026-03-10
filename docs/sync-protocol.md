# Budget Tracker — Sync Protocol

## 1. Purpose

Enable full offline work with eventual consistency:
- Local writes without waiting for server
- Batch push of local changes when online
- Pull of remote changes from other devices
- Data consistency within each workspace

## 2. Fundamentals

- Client is local-first (IndexedDB via Dexie)
- Backend is source of truth (PostgreSQL)
- Client maintains an outbox of unsent operations
- Backend maintains a change log for pull
- Sync uses push/pull pattern with cursor-based pagination

## 3. Key concepts

| Concept | Description |
|---------|-------------|
| **Local State** | Data in client's IndexedDB |
| **Outbox** | Queue of local operations pending sync |
| **Push** | Send local changes to backend |
| **Pull** | Fetch remote changes since last cursor |
| **Cursor** | Pointer to last pulled change (bigint ID from sync_changes) |
| **Version** | Integer on each entity, incremented on every mutation |

## 4. Local change lifecycle

1. User creates/edits/deletes a record
2. Change is written to local IndexedDB immediately
3. An outbox entry is created with the operation details
4. UI shows the new state instantly
5. When online, client pushes outbox operations to backend
6. Backend validates and applies each operation
7. Client marks outbox entries as synced on success
8. Client pulls remote changes and updates local DB

## 5. Operation types

- `create` — new entity
- `update` — modify existing entity
- `delete` — soft delete entity

Each operation targets a specific entity type: account, category, transaction, budgetLimit, etc.

## 6. Outbox item structure

```typescript
interface SyncOutboxItem {
  id: string;              // local operation ID (UUID)
  deviceId: string;
  workspaceId: string;
  entityType: string;      // "transaction", "account", etc.
  entityId: string;
  operationType: "create" | "update" | "delete";
  baseVersion: number;     // 0 for create, current version for update/delete
  payload: Record<string, unknown>;
  createdAt: string;       // ISO timestamp
  retryCount: number;
  status: "pending" | "synced" | "failed";
}
```

## 7. Push endpoint

### POST /api/v1/sync/push

Request:
```json
{
  "deviceId": "device-1",
  "workspaceId": "ws-1",
  "operations": [
    {
      "operationId": "op-uuid-1",
      "entityType": "transaction",
      "entityId": "txn-uuid-1",
      "operationType": "create",
      "baseVersion": 0,
      "payload": { ... }
    }
  ]
}
```

Response:
```json
{
  "accepted": [
    {
      "operationId": "op-uuid-1",
      "entityType": "transaction",
      "entityId": "txn-uuid-1",
      "newVersion": 1,
      "status": "applied"
    }
  ],
  "rejected": [
    {
      "operationId": "op-uuid-2",
      "entityType": "transaction",
      "entityId": "txn-uuid-2",
      "status": "conflict",
      "reason": "version_mismatch",
      "serverVersion": 3
    }
  ]
}
```

### Backend push processing

For each operation:
1. Authenticate user
2. Verify workspace access
3. Check idempotency (operationId + deviceId already processed?)
4. Validate payload
5. Check baseVersion against current entity version
6. Apply change transactionally
7. Increment entity version
8. Write entry to sync_changes log
9. Write receipt to sync_operation_receipts
10. Return result per operation

## 8. Pull endpoint

### GET /api/v1/sync/pull

Params: `workspaceId`, `cursor` (bigint), `limit` (optional, default 100)

Response:
```json
{
  "changes": [
    {
      "changeId": 121,
      "entityType": "transaction",
      "entityId": "txn-uuid-2",
      "operationType": "update",
      "version": 3,
      "changedAt": "2026-03-10T12:00:00Z",
      "payload": { ... }
    }
  ],
  "nextCursor": 121,
  "hasMore": false
}
```

### Backend pull processing

1. Authenticate user
2. Verify workspace access
3. Query sync_changes WHERE workspace_id = X AND id > cursor, ORDER BY id ASC, LIMIT N
4. Return changes with next cursor and hasMore flag

## 9. Conflict strategy (MVP)

- Client sends `baseVersion` with every update/delete operation
- Backend compares `baseVersion` against current entity `version`
- If they match → apply change, increment version
- If they don't match → conflict
  - Simple fields: apply last-write-wins
  - Critical conflicts: reject and return conflict status
- Client handles rejected operations by refetching entity and optionally retrying

## 10. Soft delete

All financial entities use soft delete (set `deleted_at` timestamp).

Reasons:
- Client must be able to pull "entity was deleted" information
- Sync log needs visibility of deletions
- Prevents data loss during sync conflicts

## 11. Idempotency

- Every push operation has a unique `operationId` (client-generated UUID)
- Backend stores processed operations in `sync_operation_receipts`
- If same operationId + deviceId is received again, return the previous result
- This handles network retries safely

## 12. Retry and resilience

Client must:
- Persist outbox in IndexedDB (survives app restart)
- Retry sync on network recovery
- Increment retryCount on failures
- Show error status to user
- Never delete outbox items until backend confirms success

## 13. Sync sequence

Recommended order when sync is triggered:

1. Check if sync is already running (lock)
2. Execute push (send all pending outbox items)
3. On push success, execute pull
4. Update local cursor
5. Refresh local views and sync status indicator
6. Release lock

Never run two syncs in parallel.

## 14. Required entity fields for sync

Every synchronized entity must have:
- `id` (UUID)
- `workspaceId` (UUID)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)
- `version` (integer)
- `deletedAt` (DateTime, nullable)

## 15. UI sync status

The user must see at all times:
- Online / Offline indicator
- "Changes saved locally" when offline
- "Syncing..." during active sync
- "Last synced: [timestamp]"
- "Sync error" with retry option
- Count of unsent changes

Sync status must not be buried in settings — it should be visible on every main screen.
