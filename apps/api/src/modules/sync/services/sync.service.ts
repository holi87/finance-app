import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface PushOperation {
  operationId: string;
  entityType: string;
  entityId: string;
  operationType: 'create' | 'update' | 'delete';
  baseVersion: number;
  payload: Record<string, unknown>;
}

interface PushResult {
  accepted: Array<{
    operationId: string;
    entityType: string;
    entityId: string;
    newVersion: number;
    status: 'applied';
  }>;
  rejected: Array<{
    operationId: string;
    entityType: string;
    entityId: string;
    status: 'conflict';
    reason: string;
    serverVersion: number;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DynamicModel = Record<string, any>;

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  private readonly entityModelMap: Record<string, string> = {
    account: 'account',
    category: 'category',
    transaction: 'transaction',
    budget_limit: 'budgetLimit',
    tag: 'tag',
  };

  constructor(private readonly prisma: PrismaService) {}

  async push(
    userId: string,
    deviceId: string,
    workspaceId: string,
    operations: PushOperation[],
  ): Promise<PushResult> {
    // Verify membership
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    if (membership.role === 'viewer') {
      throw new ForbiddenException('Viewers cannot push changes');
    }

    const accepted: PushResult['accepted'] = [];
    const rejected: PushResult['rejected'] = [];

    for (const op of operations) {
      try {
        // Check idempotency
        const existingReceipt = await this.prisma.syncOperationReceipt.findUnique({
          where: { operationId_deviceId: { operationId: op.operationId, deviceId } },
        });

        if (existingReceipt) {
          // Already processed — return previous result
          if (existingReceipt.resultStatus === 'applied') {
            accepted.push({
              operationId: op.operationId,
              entityType: op.entityType,
              entityId: op.entityId,
              newVersion: 0, // Client will get actual version on pull
              status: 'applied',
            });
          }
          continue;
        }

        const result = await this.processOperation(
          workspaceId,
          userId,
          deviceId,
          op,
        );

        if (result.success) {
          accepted.push({
            operationId: op.operationId,
            entityType: op.entityType,
            entityId: op.entityId,
            newVersion: result.newVersion,
            status: 'applied',
          });
        } else {
          rejected.push({
            operationId: op.operationId,
            entityType: op.entityType,
            entityId: op.entityId,
            status: 'conflict',
            reason: result.reason || 'version_mismatch',
            serverVersion: result.serverVersion || 0,
          });
        }
      } catch (err) {
        this.logger.error(`Push operation failed: ${op.operationId}`, err);
        rejected.push({
          operationId: op.operationId,
          entityType: op.entityType,
          entityId: op.entityId,
          status: 'conflict',
          reason: err instanceof Error ? err.message : 'unknown_error',
          serverVersion: 0,
        });
      }
    }

    return { accepted, rejected };
  }

  async pull(
    userId: string,
    workspaceId: string,
    cursor: string,
    limit: number,
  ) {
    // Verify membership
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const cursorBigInt = BigInt(cursor || '0');

    const changes = await this.prisma.syncChange.findMany({
      where: {
        workspaceId,
        id: { gt: cursorBigInt },
      },
      orderBy: { id: 'asc' },
      take: limit + 1, // Fetch one extra to determine hasMore
    });

    const hasMore = changes.length > limit;
    const resultChanges = hasMore ? changes.slice(0, limit) : changes;
    const lastChange = resultChanges[resultChanges.length - 1];
    const nextCursor = lastChange ? lastChange.id.toString() : cursor;

    return {
      changes: resultChanges.map((c) => ({
        changeId: c.id.toString(),
        entityType: c.entityType,
        entityId: c.entityId,
        operationType: c.operationType,
        version: c.entityVersion,
        changedAt: c.changedAt.toISOString(),
        payload: c.payloadSnapshot,
      })),
      nextCursor,
      hasMore,
    };
  }

  private getModel(client: DynamicModel, modelName: string): DynamicModel {
    const model = client[modelName];
    if (!model) {
      throw new BadRequestException(`Model not found: ${modelName}`);
    }
    return model;
  }

  private async processOperation(
    workspaceId: string,
    userId: string,
    deviceId: string,
    op: PushOperation,
  ): Promise<{ success: boolean; newVersion: number; reason?: string; serverVersion?: number }> {
    const modelName = this.entityModelMap[op.entityType];
    if (!modelName) {
      throw new BadRequestException(`Unknown entity type: ${op.entityType}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // For create, simply create the entity
      if (op.operationType === 'create') {
        return this.handleCreate(tx, workspaceId, userId, deviceId, op);
      }

      // For update/delete, check version
      const model = this.getModel(tx as unknown as DynamicModel, modelName);
      const existing = await model.findFirst({
        where: { id: op.entityId, workspaceId },
      });

      if (!existing) {
        return { success: false, newVersion: 0, reason: 'entity_not_found', serverVersion: 0 };
      }

      const currentVersion = existing.version as number;

      if (op.baseVersion !== currentVersion) {
        // Version mismatch - conflict
        await this.recordReceipt(tx, op.operationId, deviceId, workspaceId, op, 'conflict');
        return {
          success: false,
          newVersion: 0,
          reason: 'version_mismatch',
          serverVersion: currentVersion,
        };
      }

      if (op.operationType === 'update') {
        return this.handleUpdate(tx, workspaceId, userId, deviceId, op, modelName, currentVersion);
      } else {
        return this.handleDelete(tx, workspaceId, userId, deviceId, op, modelName, currentVersion);
      }
    });
  }

  private async handleCreate(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    userId: string,
    deviceId: string,
    op: PushOperation,
  ) {
    const newVersion = 1;

    await tx.syncChange.create({
      data: {
        workspaceId,
        entityType: op.entityType,
        entityId: op.entityId,
        operationType: 'create',
        entityVersion: newVersion,
        changedBy: userId,
        payloadSnapshot: op.payload as Prisma.InputJsonValue,
      },
    });

    await this.recordReceipt(tx, op.operationId, deviceId, workspaceId, op, 'applied');

    return { success: true, newVersion };
  }

  private async handleUpdate(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    userId: string,
    deviceId: string,
    op: PushOperation,
    modelName: string,
    currentVersion: number,
  ) {
    const newVersion = currentVersion + 1;

    // Update entity version
    const model = this.getModel(tx as unknown as DynamicModel, modelName);
    await model.update({
      where: { id: op.entityId },
      data: { ...op.payload, version: newVersion, workspaceId },
    });

    await tx.syncChange.create({
      data: {
        workspaceId,
        entityType: op.entityType,
        entityId: op.entityId,
        operationType: 'update',
        entityVersion: newVersion,
        changedBy: userId,
        payloadSnapshot: op.payload as Prisma.InputJsonValue,
      },
    });

    await this.recordReceipt(tx, op.operationId, deviceId, workspaceId, op, 'applied');

    return { success: true, newVersion };
  }

  private async handleDelete(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    userId: string,
    deviceId: string,
    op: PushOperation,
    modelName: string,
    currentVersion: number,
  ) {
    const newVersion = currentVersion + 1;

    const model = this.getModel(tx as unknown as DynamicModel, modelName);
    await model.update({
      where: { id: op.entityId },
      data: { deletedAt: new Date(), version: newVersion },
    });

    await tx.syncChange.create({
      data: {
        workspaceId,
        entityType: op.entityType,
        entityId: op.entityId,
        operationType: 'delete',
        entityVersion: newVersion,
        changedBy: userId,
        payloadSnapshot: Prisma.JsonNull,
      },
    });

    await this.recordReceipt(tx, op.operationId, deviceId, workspaceId, op, 'applied');

    return { success: true, newVersion };
  }

  private async recordReceipt(
    tx: Prisma.TransactionClient,
    operationId: string,
    deviceId: string,
    workspaceId: string,
    op: PushOperation,
    status: string,
  ) {
    await tx.syncOperationReceipt.create({
      data: {
        operationId,
        deviceId,
        workspaceId,
        entityType: op.entityType,
        entityId: op.entityId,
        operationType: op.operationType,
        resultStatus: status,
      },
    });
  }
}
