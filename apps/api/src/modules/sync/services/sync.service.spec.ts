import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { SyncService } from './sync.service';

describe('SyncService', () => {
  let syncService: SyncService;

  const mockPrisma = {
    membership: {
      findUnique: vi.fn(),
    },
    syncOperationReceipt: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    syncChange: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    syncService = new SyncService(mockPrisma as any);
  });

  const userId = 'user-1';
  const deviceId = 'device-1';
  const workspaceId = 'ws-1';

  describe('push', () => {
    const validOp = {
      operationId: 'op-1',
      entityType: 'account',
      entityId: 'ent-1',
      operationType: 'create' as const,
      baseVersion: 0,
      payload: { name: 'Test Account' },
    };

    it('should throw ForbiddenException for non-member', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(
        syncService.push(userId, deviceId, workspaceId, [validOp]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for viewer role', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({
        role: 'viewer',
        workspaceId,
        userId,
      });

      await expect(
        syncService.push(userId, deviceId, workspaceId, [validOp]),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return accepted for idempotent replay', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({
        role: 'editor',
        workspaceId,
        userId,
      });
      mockPrisma.syncOperationReceipt.findUnique.mockResolvedValue({
        operationId: 'op-1',
        resultStatus: 'applied',
      });

      const result = await syncService.push(userId, deviceId, workspaceId, [validOp]);

      expect(result.accepted).toHaveLength(1);
      expect(result.accepted[0]!.operationId).toBe('op-1');
      expect(result.accepted[0]!.status).toBe('applied');
      expect(result.rejected).toHaveLength(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should process a new create operation via transaction', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({
        role: 'editor',
        workspaceId,
        userId,
      });
      mockPrisma.syncOperationReceipt.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
        return cb({
          syncChange: { create: vi.fn() },
          syncOperationReceipt: { create: vi.fn() },
        });
      });

      const result = await syncService.push(userId, deviceId, workspaceId, [validOp]);

      expect(result.accepted).toHaveLength(1);
      expect(result.accepted[0]!.status).toBe('applied');
      expect(result.accepted[0]!.newVersion).toBe(1);
    });
  });

  describe('pull', () => {
    it('should throw ForbiddenException for non-member', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(syncService.pull(userId, workspaceId, '0', 100)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return changes with hasMore false', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({ role: 'editor' });
      mockPrisma.syncChange.findMany.mockResolvedValue([
        {
          id: 1n,
          entityType: 'account',
          entityId: 'ent-1',
          operationType: 'create',
          entityVersion: 1,
          changedAt: new Date('2025-01-01T00:00:00Z'),
          payloadSnapshot: { name: 'Test' },
        },
        {
          id: 2n,
          entityType: 'account',
          entityId: 'ent-2',
          operationType: 'update',
          entityVersion: 2,
          changedAt: new Date('2025-01-02T00:00:00Z'),
          payloadSnapshot: { name: 'Updated' },
        },
      ]);

      const result = await syncService.pull(userId, workspaceId, '0', 100);

      expect(result.changes).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBe('2');
      expect(result.changes[0]!.changeId).toBe('1');
    });

    it('should return hasMore true when more changes exist', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({ role: 'editor' });
      mockPrisma.syncChange.findMany.mockResolvedValue([
        {
          id: 1n,
          entityType: 'account',
          entityId: 'ent-1',
          operationType: 'create',
          entityVersion: 1,
          changedAt: new Date('2025-01-01T00:00:00Z'),
          payloadSnapshot: {},
        },
        {
          id: 2n,
          entityType: 'account',
          entityId: 'ent-2',
          operationType: 'update',
          entityVersion: 2,
          changedAt: new Date('2025-01-02T00:00:00Z'),
          payloadSnapshot: {},
        },
        {
          id: 3n,
          entityType: 'category',
          entityId: 'ent-3',
          operationType: 'create',
          entityVersion: 1,
          changedAt: new Date('2025-01-03T00:00:00Z'),
          payloadSnapshot: {},
        },
      ]);

      const result = await syncService.pull(userId, workspaceId, '0', 2);

      expect(result.changes).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('2');
    });

    it('should return empty changes with original cursor', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({ role: 'viewer' });
      mockPrisma.syncChange.findMany.mockResolvedValue([]);

      const result = await syncService.pull(userId, workspaceId, '5', 100);

      expect(result.changes).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBe('5');
    });
  });
});
