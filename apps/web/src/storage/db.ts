import Dexie, { type EntityTable } from 'dexie';

// --- Local entity interfaces ---

export interface LocalWorkspace {
  id: string;
  name: string;
  slug: string;
  type: string;
  baseCurrency: string;
  ownerId: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalAccount {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  currency: string;
  openingBalance: string;
  currentBalanceCached: string;
  isArchived: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocalCategory {
  id: string;
  workspaceId: string;
  parentCategoryId: string | null;
  name: string;
  kind: string;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocalTransaction {
  id: string;
  workspaceId: string;
  accountId: string;
  categoryId: string | null;
  type: string;
  amount: string;
  currency: string;
  description: string | null;
  notes: string | null;
  transactionDate: string;
  createdBy: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocalBudgetPeriod {
  id: string;
  workspaceId: string;
  periodType: string;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalBudgetLimit {
  id: string;
  workspaceId: string;
  budgetPeriodId: string;
  categoryId: string;
  amount: string;
  currency: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocalTag {
  id: string;
  workspaceId: string;
  name: string;
  color: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface LocalSyncOutboxItem {
  id: string;
  deviceId: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  operationType: string;
  baseVersion: number;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  status: string;
}

export interface LocalSyncMeta {
  key: string;
  value: string;
}

// --- Database ---

class BudgetTrackerDB extends Dexie {
  workspaces!: EntityTable<LocalWorkspace, 'id'>;
  memberships!: EntityTable<LocalMembership, 'id'>;
  accounts!: EntityTable<LocalAccount, 'id'>;
  categories!: EntityTable<LocalCategory, 'id'>;
  transactions!: EntityTable<LocalTransaction, 'id'>;
  budgetPeriods!: EntityTable<LocalBudgetPeriod, 'id'>;
  budgetLimits!: EntityTable<LocalBudgetLimit, 'id'>;
  tags!: EntityTable<LocalTag, 'id'>;
  syncOutbox!: EntityTable<LocalSyncOutboxItem, 'id'>;
  syncMeta!: EntityTable<LocalSyncMeta, 'key'>;

  constructor() {
    super('BudgetTracker');

    this.version(1).stores({
      workspaces: 'id, slug',
      memberships: 'id, workspaceId, userId, [workspaceId+userId]',
      accounts: 'id, workspaceId, [workspaceId+deletedAt]',
      categories: 'id, workspaceId, [workspaceId+kind], [workspaceId+deletedAt]',
      transactions: 'id, workspaceId, accountId, categoryId, transactionDate, [workspaceId+transactionDate], [workspaceId+deletedAt]',
      budgetPeriods: 'id, workspaceId',
      budgetLimits: 'id, workspaceId, budgetPeriodId, [workspaceId+budgetPeriodId]',
      tags: 'id, workspaceId',
      syncOutbox: 'id, workspaceId, status, [workspaceId+status]',
      syncMeta: 'key',
    });
  }
}

export const db = new BudgetTrackerDB();

/**
 * Clear all local data (on logout).
 */
export async function clearAllLocalData() {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}
