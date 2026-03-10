import type { SyncCursorLocal } from '@budget-tracker/shared-types';

/**
 * Creates initial cursor for a workspace.
 */
export function createInitialCursor(workspaceId: string): SyncCursorLocal {
  return {
    workspaceId,
    cursor: '0',
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * Updates cursor after a successful pull.
 */
export function advanceCursor(
  current: SyncCursorLocal,
  nextCursor: string,
): SyncCursorLocal {
  return {
    ...current,
    cursor: nextCursor,
    lastSyncedAt: new Date().toISOString(),
  };
}
