import { db, type LocalBudgetPeriod, type LocalBudgetLimit } from '../db';

export const budgetPeriodsRepo = {
  async getAll(workspaceId: string): Promise<LocalBudgetPeriod[]> {
    return db.budgetPeriods
      .where('workspaceId')
      .equals(workspaceId)
      .toArray();
  },

  async upsert(period: LocalBudgetPeriod): Promise<void> {
    await db.budgetPeriods.put(period);
  },

  async upsertMany(periods: LocalBudgetPeriod[]): Promise<void> {
    await db.budgetPeriods.bulkPut(periods);
  },

  async clearForWorkspace(workspaceId: string): Promise<void> {
    await db.budgetPeriods.where('workspaceId').equals(workspaceId).delete();
  },
};

export const budgetLimitsRepo = {
  async getAll(workspaceId: string): Promise<LocalBudgetLimit[]> {
    return db.budgetLimits
      .where('workspaceId')
      .equals(workspaceId)
      .filter((l) => l.deletedAt === null)
      .toArray();
  },

  async getByPeriod(workspaceId: string, budgetPeriodId: string): Promise<LocalBudgetLimit[]> {
    return db.budgetLimits
      .where('[workspaceId+budgetPeriodId]')
      .equals([workspaceId, budgetPeriodId])
      .filter((l) => l.deletedAt === null)
      .toArray();
  },

  async upsert(limit: LocalBudgetLimit): Promise<void> {
    await db.budgetLimits.put(limit);
  },

  async upsertMany(limits: LocalBudgetLimit[]): Promise<void> {
    await db.budgetLimits.bulkPut(limits);
  },

  async clearForWorkspace(workspaceId: string): Promise<void> {
    await db.budgetLimits.where('workspaceId').equals(workspaceId).delete();
  },
};
