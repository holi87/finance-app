export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  pendingChanges: number;
  error: string | null;
}

export const SYNC_ENTITY_TYPES = [
  'account',
  'category',
  'transaction',
  'transfer_link',
  'budget_period',
  'budget_limit',
  'tag',
  'transaction_tag',
] as const;

export type SyncEntityType = (typeof SYNC_ENTITY_TYPES)[number];
