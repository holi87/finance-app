import type { SyncOutboxItem } from '@budget-tracker/shared-types';
import type { SyncEntityType } from './types';
import type { SyncOperationType } from '@budget-tracker/shared-types';

/**
 * Creates a new outbox item for a local change.
 */
export function createOutboxItem(params: {
  deviceId: string;
  workspaceId: string;
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  baseVersion: number;
  payload: Record<string, unknown>;
}): SyncOutboxItem {
  return {
    id: crypto.randomUUID(),
    deviceId: params.deviceId,
    workspaceId: params.workspaceId,
    entityType: params.entityType,
    entityId: params.entityId,
    operationType: params.operationType,
    baseVersion: params.baseVersion,
    payload: params.payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  };
}

/**
 * Filters outbox items that are ready to be pushed.
 */
export function getPendingOutboxItems(items: SyncOutboxItem[]): SyncOutboxItem[] {
  return items.filter((item) => item.status === 'pending');
}

/**
 * Increments retry count for a failed outbox item.
 */
export function markOutboxItemRetry(item: SyncOutboxItem): SyncOutboxItem {
  return {
    ...item,
    retryCount: item.retryCount + 1,
    status: 'pending',
  };
}
