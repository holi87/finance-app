import { z } from 'zod';
import { currencySchema } from './common';

const workspaceTypes = ['personal', 'business', 'company', 'shared'] as const;
const memberRoles = ['owner', 'editor', 'viewer'] as const;

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: z.enum(workspaceTypes),
  baseCurrency: currencySchema,
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(memberRoles),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(memberRoles),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
