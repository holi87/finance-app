import { db, type LocalSyncOutboxItem } from '../db';

export const syncOutboxRepo = {
  async getPending(workspaceId: string): Promise<LocalSyncOutboxItem[]> {
    return db.syncOutbox
      .where('[workspaceId+status]')
      .equals([workspaceId, 'pending'])
      .toArray();
  },

  async getAllPending(): Promise<LocalSyncOutboxItem[]> {
    return db.syncOutbox.where('status').equals('pending').toArray();
  },

  async add(item: LocalSyncOutboxItem): Promise<void> {
    await db.syncOutbox.put(item);
  },

  async markSynced(id: string): Promise<void> {
    await db.syncOutbox.update(id, { status: 'synced' });
  },

  async markFailed(id: string): Promise<void> {
    await db.syncOutbox.update(id, {
      status: 'pending',
      retryCount: (await db.syncOutbox.get(id))?.retryCount ?? 0 + 1,
    });
  },

  async removeSynced(): Promise<void> {
    await db.syncOutbox.where('status').equals('synced').delete();
  },

  async count(): Promise<number> {
    return db.syncOutbox.where('status').equals('pending').count();
  },
};

export const syncMetaRepo = {
  async get(key: string): Promise<string | undefined> {
    const entry = await db.syncMeta.get(key);
    return entry?.value;
  },

  async set(key: string, value: string): Promise<void> {
    await db.syncMeta.put({ key, value });
  },

  async getCursor(workspaceId: string): Promise<string> {
    return (await syncMetaRepo.get(`cursor_${workspaceId}`)) || '0';
  },

  async setCursor(workspaceId: string, cursor: string): Promise<void> {
    await syncMetaRepo.set(`cursor_${workspaceId}`, cursor);
  },

  async getLastSyncedAt(workspaceId: string): Promise<string | null> {
    return (await syncMetaRepo.get(`lastSynced_${workspaceId}`)) || null;
  },

  async setLastSyncedAt(workspaceId: string, timestamp: string): Promise<void> {
    await syncMetaRepo.set(`lastSynced_${workspaceId}`, timestamp);
  },
};
