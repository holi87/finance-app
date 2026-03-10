import { z } from 'zod';
import { currencySchema, decimalAmountSchema } from './common';

const accountTypes = ['cash', 'bank', 'savings', 'credit', 'investment'] as const;

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: z.enum(accountTypes),
  currency: currencySchema,
  openingBalance: decimalAmountSchema.optional().default('0'),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  type: z.enum(accountTypes).optional(),
  isArchived: z.boolean().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
