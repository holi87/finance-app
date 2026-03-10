import { db, type LocalCategory } from '../db';

export const categoriesRepo = {
  async getAll(workspaceId: string): Promise<LocalCategory[]> {
    return db.categories
      .where('workspaceId')
      .equals(workspaceId)
      .filter((c) => c.deletedAt === null)
      .toArray();
  },

  async getByKind(workspaceId: string, kind: string): Promise<LocalCategory[]> {
    return db.categories
      .where('[workspaceId+kind]')
      .equals([workspaceId, kind])
      .filter((c) => c.deletedAt === null)
      .toArray();
  },

  async getById(id: string): Promise<LocalCategory | undefined> {
    return db.categories.get(id);
  },

  async upsert(category: LocalCategory): Promise<void> {
    await db.categories.put(category);
  },

  async upsertMany(categories: LocalCategory[]): Promise<void> {
    await db.categories.bulkPut(categories);
  },

  async clearForWorkspace(workspaceId: string): Promise<void> {
    await db.categories.where('workspaceId').equals(workspaceId).delete();
  },
};
