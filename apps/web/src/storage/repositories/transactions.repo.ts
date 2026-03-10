import { db, type LocalTransaction } from '../db';

export const transactionsRepo = {
  async getAll(workspaceId: string): Promise<LocalTransaction[]> {
    return db.transactions
      .where('workspaceId')
      .equals(workspaceId)
      .filter((t) => t.deletedAt === null)
      .reverse()
      .sortBy('transactionDate');
  },

  async getRecent(workspaceId: string, limit: number): Promise<LocalTransaction[]> {
    const all = await db.transactions
      .where('workspaceId')
      .equals(workspaceId)
      .filter((t) => t.deletedAt === null)
      .reverse()
      .sortBy('transactionDate');
    return all.slice(0, limit);
  },

  async getById(id: string): Promise<LocalTransaction | undefined> {
    return db.transactions.get(id);
  },

  async upsert(transaction: LocalTransaction): Promise<void> {
    await db.transactions.put(transaction);
  },

  async upsertMany(transactions: LocalTransaction[]): Promise<void> {
    await db.transactions.bulkPut(transactions);
  },

  async clearForWorkspace(workspaceId: string): Promise<void> {
    await db.transactions.where('workspaceId').equals(workspaceId).delete();
  },
};
