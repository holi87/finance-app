import { z } from 'zod';

const categoryKinds = ['expense', 'income', 'both'] as const;

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  kind: z.enum(categoryKinds),
  parentCategoryId: z.string().uuid().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  kind: z.enum(categoryKinds).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
  isArchived: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
