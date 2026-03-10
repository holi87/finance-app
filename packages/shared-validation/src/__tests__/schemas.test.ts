import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  createWorkspaceSchema,
  createAccountSchema,
  createTransactionSchema,
  syncPushRequestSchema,
} from '../index';

describe('loginSchema', () => {
  it('should pass with valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'securePass1',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.password).toBe('securePass1');
    }
  });

  it('should fail when email is missing', () => {
    const result = loginSchema.safeParse({
      password: 'securePass1',
    });

    expect(result.success).toBe(false);
  });

  it('should fail when password is missing', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
    });

    expect(result.success).toBe(false);
  });

  it('should fail with an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'securePass1',
    });

    expect(result.success).toBe(false);
  });

  it('should fail when password is shorter than 8 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    });

    expect(result.success).toBe(false);
  });

  it('should fail when password exceeds 128 characters', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(129),
    });

    expect(result.success).toBe(false);
  });
});

describe('createWorkspaceSchema', () => {
  it('should pass with valid input', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'My Household',
      type: 'personal',
      baseCurrency: 'USD',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Household');
      expect(result.data.type).toBe('personal');
      expect(result.data.baseCurrency).toBe('USD');
    }
  });

  it('should fail when name is missing', () => {
    const result = createWorkspaceSchema.safeParse({
      type: 'personal',
      baseCurrency: 'USD',
    });

    expect(result.success).toBe(false);
  });

  it('should fail when name is empty string', () => {
    const result = createWorkspaceSchema.safeParse({
      name: '',
      type: 'personal',
      baseCurrency: 'USD',
    });

    expect(result.success).toBe(false);
  });

  it('should fail with an invalid workspace type', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'My Workspace',
      type: 'invalid_type',
      baseCurrency: 'USD',
    });

    expect(result.success).toBe(false);
  });

  it('should fail with an invalid currency length', () => {
    const result = createWorkspaceSchema.safeParse({
      name: 'My Workspace',
      type: 'personal',
      baseCurrency: 'US',
    });

    expect(result.success).toBe(false);
  });

  it('should accept all valid workspace types', () => {
    for (const type of ['personal', 'business', 'company', 'shared']) {
      const result = createWorkspaceSchema.safeParse({
        name: 'Workspace',
        type,
        baseCurrency: 'EUR',
      });
      expect(result.success).toBe(true);
    }
  });

  it('should trim whitespace from name', () => {
    const result = createWorkspaceSchema.safeParse({
      name: '  My Household  ',
      type: 'personal',
      baseCurrency: 'USD',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My Household');
    }
  });
});

describe('createAccountSchema', () => {
  it('should pass with valid input', () => {
    const result = createAccountSchema.safeParse({
      name: 'Main Checking',
      type: 'bank',
      currency: 'USD',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Main Checking');
      expect(result.data.type).toBe('bank');
      expect(result.data.currency).toBe('USD');
      expect(result.data.openingBalance).toBe('0');
    }
  });

  it('should pass with an explicit opening balance', () => {
    const result = createAccountSchema.safeParse({
      name: 'Savings',
      type: 'savings',
      currency: 'EUR',
      openingBalance: '1500.50',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openingBalance).toBe('1500.50');
    }
  });

  it('should accept all valid account types', () => {
    for (const type of ['cash', 'bank', 'savings', 'credit', 'investment']) {
      const result = createAccountSchema.safeParse({
        name: 'Account',
        type,
        currency: 'USD',
      });
      expect(result.success).toBe(true);
    }
  });

  it('should fail with an invalid account type', () => {
    const result = createAccountSchema.safeParse({
      name: 'My Account',
      type: 'crypto',
      currency: 'USD',
    });

    expect(result.success).toBe(false);
  });

  it('should fail with an invalid opening balance format', () => {
    const result = createAccountSchema.safeParse({
      name: 'My Account',
      type: 'bank',
      currency: 'USD',
      openingBalance: 'not-a-number',
    });

    expect(result.success).toBe(false);
  });
});

describe('createTransactionSchema', () => {
  it('should pass with valid input', () => {
    const result = createTransactionSchema.safeParse({
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'expense',
      amount: '49.99',
      currency: 'USD',
      transactionDate: '2026-03-10',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accountId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.data.type).toBe('expense');
      expect(result.data.amount).toBe('49.99');
      expect(result.data.currency).toBe('USD');
      expect(result.data.transactionDate).toBe('2026-03-10');
    }
  });

  it('should pass with optional fields included', () => {
    const result = createTransactionSchema.safeParse({
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      categoryId: '660e8400-e29b-41d4-a716-446655440000',
      type: 'income',
      amount: '2500.00',
      currency: 'EUR',
      description: 'Monthly salary',
      notes: 'March payment',
      transactionDate: '2026-03-01',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryId).toBe('660e8400-e29b-41d4-a716-446655440000');
      expect(result.data.description).toBe('Monthly salary');
      expect(result.data.notes).toBe('March payment');
    }
  });

  it('should fail with an invalid amount format', () => {
    const result = createTransactionSchema.safeParse({
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'expense',
      amount: 'abc',
      currency: 'USD',
      transactionDate: '2026-03-10',
    });

    expect(result.success).toBe(false);
  });

  it('should fail with more than two decimal places in amount', () => {
    const result = createTransactionSchema.safeParse({
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'expense',
      amount: '49.999',
      currency: 'USD',
      transactionDate: '2026-03-10',
    });

    expect(result.success).toBe(false);
  });

  it('should fail with an invalid transaction type', () => {
    const result = createTransactionSchema.safeParse({
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'refund',
      amount: '10.00',
      currency: 'USD',
      transactionDate: '2026-03-10',
    });

    expect(result.success).toBe(false);
  });

  it('should fail with an invalid date format', () => {
    const result = createTransactionSchema.safeParse({
      accountId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'expense',
      amount: '10.00',
      currency: 'USD',
      transactionDate: '03/10/2026',
    });

    expect(result.success).toBe(false);
  });

  it('should fail with an invalid accountId (not UUID)', () => {
    const result = createTransactionSchema.safeParse({
      accountId: 'not-a-uuid',
      type: 'expense',
      amount: '10.00',
      currency: 'USD',
      transactionDate: '2026-03-10',
    });

    expect(result.success).toBe(false);
  });

  it('should fail when required fields are missing', () => {
    const result = createTransactionSchema.safeParse({
      type: 'expense',
    });

    expect(result.success).toBe(false);
  });
});

describe('syncPushRequestSchema', () => {
  it('should pass with valid input', () => {
    const result = syncPushRequestSchema.safeParse({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '660e8400-e29b-41d4-a716-446655440000',
      operations: [
        {
          operationId: '770e8400-e29b-41d4-a716-446655440000',
          entityType: 'account',
          entityId: '880e8400-e29b-41d4-a716-446655440000',
          operationType: 'create',
          baseVersion: 0,
          payload: { name: 'New Account', type: 'bank' },
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deviceId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(result.data.workspaceId).toBe('660e8400-e29b-41d4-a716-446655440000');
      expect(result.data.operations).toHaveLength(1);
      expect(result.data.operations[0]!.operationType).toBe('create');
    }
  });

  it('should pass with multiple operations', () => {
    const result = syncPushRequestSchema.safeParse({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '660e8400-e29b-41d4-a716-446655440000',
      operations: [
        {
          operationId: '770e8400-e29b-41d4-a716-446655440000',
          entityType: 'account',
          entityId: '880e8400-e29b-41d4-a716-446655440000',
          operationType: 'create',
          baseVersion: 0,
          payload: { name: 'Account A' },
        },
        {
          operationId: '990e8400-e29b-41d4-a716-446655440000',
          entityType: 'transaction',
          entityId: 'aa0e8400-e29b-41d4-a716-446655440000',
          operationType: 'update',
          baseVersion: 1,
          payload: { amount: '200.00' },
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operations).toHaveLength(2);
    }
  });

  it('should fail with empty operations array', () => {
    const result = syncPushRequestSchema.safeParse({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '660e8400-e29b-41d4-a716-446655440000',
      operations: [],
    });

    expect(result.success).toBe(false);
  });

  it('should fail when deviceId is not a UUID', () => {
    const result = syncPushRequestSchema.safeParse({
      deviceId: 'not-a-uuid',
      workspaceId: '660e8400-e29b-41d4-a716-446655440000',
      operations: [
        {
          operationId: '770e8400-e29b-41d4-a716-446655440000',
          entityType: 'account',
          entityId: '880e8400-e29b-41d4-a716-446655440000',
          operationType: 'create',
          baseVersion: 0,
          payload: {},
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('should fail with an invalid operation type', () => {
    const result = syncPushRequestSchema.safeParse({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '660e8400-e29b-41d4-a716-446655440000',
      operations: [
        {
          operationId: '770e8400-e29b-41d4-a716-446655440000',
          entityType: 'account',
          entityId: '880e8400-e29b-41d4-a716-446655440000',
          operationType: 'upsert',
          baseVersion: 0,
          payload: {},
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('should fail with a negative baseVersion', () => {
    const result = syncPushRequestSchema.safeParse({
      deviceId: '550e8400-e29b-41d4-a716-446655440000',
      workspaceId: '660e8400-e29b-41d4-a716-446655440000',
      operations: [
        {
          operationId: '770e8400-e29b-41d4-a716-446655440000',
          entityType: 'account',
          entityId: '880e8400-e29b-41d4-a716-446655440000',
          operationType: 'create',
          baseVersion: -1,
          payload: {},
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
