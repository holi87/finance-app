import { z } from 'zod';
import { currencySchema, decimalAmountSchema, dateSchema } from './common';

const transactionTypes = ['expense', 'income', 'transfer'] as const;

export const createTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(transactionTypes),
  amount: decimalAmountSchema,
  currency: currencySchema,
  description: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  transactionDate: dateSchema,
});

export const updateTransactionSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amount: decimalAmountSchema.optional(),
  description: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  transactionDate: dateSchema.optional(),
});

export const createTransferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: decimalAmountSchema,
  currency: currencySchema,
  description: z.string().max(255).optional(),
  transactionDate: dateSchema,
});

export const transactionListParamsSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(transactionTypes).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type TransactionListParamsInput = z.infer<typeof transactionListParamsSchema>;
