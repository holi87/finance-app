import { api } from '@/services/api';
import { db } from '@/storage/db';
import { syncOutboxRepo, syncMetaRepo } from '@/storage';
import type { SyncPushResponse, SyncPullResponse } from '@budget-tracker/shared-types';

type SyncStatusListener = (status: SyncStatus) => void;

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'error' | 'offline';
  lastSyncedAt: string | null;
  pendingChanges: number;
  error: string | null;
}

let syncLock = false;
let currentStatus: SyncStatus = {
  state: 'idle',
  lastSyncedAt: null,
  pendingChanges: 0,
  error: null,
};
const listeners: Set<SyncStatusListener> = new Set();

function getDeviceId(): string {
  let deviceId = localStorage.getItem('bt_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('bt_device_id', deviceId);
  }
  return deviceId;
}

function notifyListeners() {
  listeners.forEach((fn) => fn({ ...currentStatus }));
}

function updateStatus(partial: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...partial };
  notifyListeners();
}

/**
 * Subscribe to sync status changes.
 */
export function onSyncStatusChange(listener: SyncStatusListener): () => void {
  listeners.add(listener);
  // Immediately send current status
  listener({ ...currentStatus });
  return () => listeners.delete(listener);
}

/**
 * Get current sync status.
 */
export function getSyncStatus(): SyncStatus {
  return { ...currentStatus };
}

/**
 * Execute a full sync cycle: push local changes, then pull remote changes.
 */
export async function syncWorkspace(workspaceId: string): Promise<void> {
  if (syncLock) return;
  if (!navigator.onLine) {
    updateStatus({ state: 'offline' });
    return;
  }

  syncLock = true;
  updateStatus({ state: 'syncing', error: null });

  try {
    // 1. Push local changes
    await pushChanges(workspaceId);

    // 2. Pull remote changes
    await pullChanges(workspaceId);

    // 3. Clean up synced outbox items
    await syncOutboxRepo.removeSynced();

    // 4. Update status
    const pending = await syncOutboxRepo.count();
    const now = new Date().toISOString();
    await syncMetaRepo.setLastSyncedAt(workspaceId, now);

    updateStatus({
      state: 'idle',
      lastSyncedAt: now,
      pendingChanges: pending,
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    updateStatus({ state: 'error', error: message });
  } finally {
    syncLock = false;
  }
}

async function pushChanges(workspaceId: string): Promise<void> {
  const pending = await syncOutboxRepo.getPending(workspaceId);
  if (pending.length === 0) return;

  const deviceId = getDeviceId();

  const response = await api.post<SyncPushResponse>('/api/sync/push', {
    deviceId,
    workspaceId,
    operations: pending.map((item) => ({
      operationId: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      operationType: item.operationType,
      baseVersion: item.baseVersion,
      payload: item.payload,
    })),
  });

  // Mark accepted as synced
  for (const accepted of response.accepted) {
    await syncOutboxRepo.markSynced(accepted.operationId);
  }

  // Handle rejected (increment retry)
  for (const rejected of response.rejected) {
    await syncOutboxRepo.markFailed(rejected.operationId);
  }
}

async function pullChanges(workspaceId: string): Promise<void> {
  let cursor = await syncMetaRepo.getCursor(workspaceId);
  let hasMore = true;

  while (hasMore) {
    const response = await api.get<SyncPullResponse>(
      `/api/sync/pull?workspaceId=${workspaceId}&cursor=${cursor}&limit=100`,
    );

    // Apply changes to local DB
    for (const change of response.changes) {
      await applyRemoteChange(change);
    }

    cursor = response.nextCursor;
    hasMore = response.hasMore;

    // Save cursor progress
    await syncMetaRepo.setCursor(workspaceId, cursor);
  }
}

async function applyRemoteChange(change: {
  entityType: string;
  entityId: string;
  operationType: string;
  payload: Record<string, unknown> | null;
}) {
  const tableMap: Record<string, string> = {
    account: 'accounts',
    category: 'categories',
    transaction: 'transactions',
    budget_period: 'budgetPeriods',
    budget_limit: 'budgetLimits',
    tag: 'tags',
  };

  const tableName = tableMap[change.entityType];
  if (!tableName) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (db as unknown as Record<string, any>)[tableName];
  if (!table) return;

  if (change.operationType === 'delete') {
    // For soft delete, update the local record with deletedAt
    if (change.payload) {
      await table.put(change.payload);
    }
  } else if (change.payload) {
    await table.put(change.payload);
  }
}

/**
 * Initialize sync triggers: on app focus, online recovery, etc.
 */
export function initSyncTriggers(getActiveWorkspaceId: () => string | null) {
  // Sync on coming online
  window.addEventListener('online', () => {
    const wsId = getActiveWorkspaceId();
    if (wsId) syncWorkspace(wsId);
  });

  window.addEventListener('offline', () => {
    updateStatus({ state: 'offline' });
  });

  // Sync on visibility change (app resume)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const wsId = getActiveWorkspaceId();
      if (wsId) syncWorkspace(wsId);
    }
  });

  // Update initial status
  syncOutboxRepo.count().then((count) => {
    updateStatus({
      pendingChanges: count,
      state: navigator.onLine ? 'idle' : 'offline',
    });
  });
}
