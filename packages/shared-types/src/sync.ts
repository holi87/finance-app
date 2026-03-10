import type { SyncOperationType, SyncOutboxStatus } from './enums';

// --- Sync Push ---
export interface SyncPushRequest {
  deviceId: string;
  workspaceId: string;
  operations: SyncPushOperation[];
}

export interface SyncPushOperation {
  operationId: string;
  entityType: string;
  entityId: string;
  operationType: SyncOperationType;
  baseVersion: number;
  payload: Record<string, unknown>;
}

export interface SyncPushResponse {
  accepted: SyncPushAccepted[];
  rejected: SyncPushRejected[];
}

export interface SyncPushAccepted {
  operationId: string;
  entityType: string;
  entityId: string;
  newVersion: number;
  status: 'applied';
}

export interface SyncPushRejected {
  operationId: string;
  entityType: string;
  entityId: string;
  status: 'conflict';
  reason: string;
  serverVersion: number;
}

// --- Sync Pull ---
export interface SyncPullParams {
  workspaceId: string;
  cursor: string;
  limit?: number;
}

export interface SyncPullResponse {
  changes: SyncChange[];
  nextCursor: string;
  hasMore: boolean;
}

export interface SyncChange {
  changeId: string;
  entityType: string;
  entityId: string;
  operationType: SyncOperationType;
  version: number;
  changedAt: string;
  payload: Record<string, unknown> | null;
}

// --- Outbox (client-side) ---
export interface SyncOutboxItem {
  id: string;
  deviceId: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  operationType: SyncOperationType;
  baseVersion: number;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  status: SyncOutboxStatus;
}

// --- Sync Cursor (client-side tracking) ---
export interface SyncCursorLocal {
  workspaceId: string;
  cursor: string;
  lastSyncedAt: string;
}
