import { db, type LocalAccount } from '../db';

export const accountsRepo = {
  async getAll(workspaceId: string): Promise<LocalAccount[]> {
    return db.accounts
      .where('workspaceId')
      .equals(workspaceId)
      .filter((a) => a.deletedAt === null)
      .toArray();
  },

  async getById(id: string): Promise<LocalAccount | undefined> {
    return db.accounts.get(id);
  },

  async upsert(account: LocalAccount): Promise<void> {
    await db.accounts.put(account);
  },

  async upsertMany(accounts: LocalAccount[]): Promise<void> {
    await db.accounts.bulkPut(accounts);
  },

  async remove(id: string): Promise<void> {
    await db.accounts.delete(id);
  },

  async clearForWorkspace(workspaceId: string): Promise<void> {
    await db.accounts.where('workspaceId').equals(workspaceId).delete();
  },
};
