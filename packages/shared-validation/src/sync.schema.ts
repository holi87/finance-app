import { z } from 'zod';

const syncOperationTypes = ['create', 'update', 'delete'] as const;

export const syncPushOperationSchema = z.object({
  operationId: z.string().uuid(),
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  operationType: z.enum(syncOperationTypes),
  baseVersion: z.number().int().min(0),
  payload: z.record(z.unknown()),
});

export const syncPushRequestSchema = z.object({
  deviceId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  operations: z.array(syncPushOperationSchema).min(1).max(100),
});

export const syncPullParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  cursor: z.string().default('0'),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export type SyncPushOperationInput = z.infer<typeof syncPushOperationSchema>;
export type SyncPushRequestInput = z.infer<typeof syncPushRequestSchema>;
export type SyncPullParamsInput = z.infer<typeof syncPullParamsSchema>;
