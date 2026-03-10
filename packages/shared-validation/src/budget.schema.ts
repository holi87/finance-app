import { z } from 'zod';
import { currencySchema, decimalAmountSchema, dateSchema } from './common';

const budgetPeriodTypes = ['monthly'] as const;

export const createBudgetPeriodSchema = z.object({
  periodType: z.enum(budgetPeriodTypes),
  startsAt: dateSchema,
  endsAt: dateSchema,
});

export const createBudgetLimitSchema = z.object({
  budgetPeriodId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: decimalAmountSchema,
  currency: currencySchema,
});

export const updateBudgetLimitSchema = z.object({
  amount: decimalAmountSchema.optional(),
});

export type CreateBudgetPeriodInput = z.infer<typeof createBudgetPeriodSchema>;
export type CreateBudgetLimitInput = z.infer<typeof createBudgetLimitSchema>;
export type UpdateBudgetLimitInput = z.infer<typeof updateBudgetLimitSchema>;
