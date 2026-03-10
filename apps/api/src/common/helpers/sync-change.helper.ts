import { PrismaClient, Prisma } from '@prisma/client';

type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Records a sync change for an entity mutation.
 * Must be called within a Prisma transaction.
 */
export async function recordSyncChange(
  tx: PrismaTransactionClient,
  params: {
    workspaceId: string;
    entityType: string;
    entityId: string;
    operationType: 'create' | 'update' | 'delete';
    entityVersion: number;
    changedBy?: string;
    payload?: Prisma.InputJsonValue;
  },
) {
  return tx.syncChange.create({
    data: {
      workspaceId: params.workspaceId,
      entityType: params.entityType,
      entityId: params.entityId,
      operationType: params.operationType,
      entityVersion: params.entityVersion,
      changedBy: params.changedBy,
      payloadSnapshot: params.payload ?? Prisma.DbNull,
    },
  });
}
