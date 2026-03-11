// --- Workspace ---
export const WorkspaceType = {
  PERSONAL: 'personal',
  BUSINESS: 'business',
  COMPANY: 'company',
  SHARED: 'shared',
} as const;
export type WorkspaceType = (typeof WorkspaceType)[keyof typeof WorkspaceType];

// --- Membership ---
export const MembershipRole = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;
export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole];

// --- Account ---
export const AccountType = {
  CASH: 'cash',
  BANK: 'bank',
  SAVINGS: 'savings',
  CREDIT: 'credit',
  INVESTMENT: 'investment',
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

// --- Category ---
export const CategoryKind = {
  EXPENSE: 'expense',
  INCOME: 'income',
  BOTH: 'both',
} as const;
export type CategoryKind = (typeof CategoryKind)[keyof typeof CategoryKind];

// --- Transaction ---
export const TransactionType = {
  EXPENSE: 'expense',
  INCOME: 'income',
  TRANSFER: 'transfer',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

// --- Budget ---
export const BudgetPeriodType = {
  MONTHLY: 'monthly',
} as const;
export type BudgetPeriodType = (typeof BudgetPeriodType)[keyof typeof BudgetPeriodType];

// --- Reminder ---
export const ReminderStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  DISMISSED: 'dismissed',
} as const;
export type ReminderStatus = (typeof ReminderStatus)[keyof typeof ReminderStatus];

// --- Sync ---
export const SyncOperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;
export type SyncOperationType = (typeof SyncOperationType)[keyof typeof SyncOperationType];

export const SyncOutboxStatus = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
} as const;
export type SyncOutboxStatus = (typeof SyncOutboxStatus)[keyof typeof SyncOutboxStatus];

// --- Device ---
export const DevicePlatform = {
  WEB: 'web',
  IOS_PWA: 'ios-pwa',
} as const;
export type DevicePlatform = (typeof DevicePlatform)[keyof typeof DevicePlatform];
