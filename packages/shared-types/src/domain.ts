import type {
  WorkspaceType,
  MembershipRole,
  AccountType,
  CategoryKind,
  TransactionType,
  BudgetPeriodType,
} from './enums';

// --- Base ---
export interface SyncableEntity {
  id: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
}

// --- User ---
export interface User {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

// --- Device ---
export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  platform: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Workspace ---
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  type: WorkspaceType;
  baseCurrency: string;
  ownerId: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Membership ---
export interface Membership {
  id: string;
  workspaceId: string;
  userId: string;
  role: MembershipRole;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Account ---
export interface Account extends SyncableEntity {
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: string;
  currentBalanceCached: string;
  isArchived: boolean;
}

// --- Category ---
export interface Category extends SyncableEntity {
  parentCategoryId: string | null;
  name: string;
  kind: CategoryKind;
  color: string | null;
  icon: string | null;
  isArchived: boolean;
}

// --- Transaction ---
export interface Transaction extends SyncableEntity {
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  notes: string | null;
  transactionDate: string;
  createdBy: string;
}

// --- Transfer Link ---
export interface TransferLink {
  id: string;
  workspaceId: string;
  outboundTransactionId: string;
  inboundTransactionId: string;
  createdAt: string;
}

// --- Budget Period ---
export interface BudgetPeriod {
  id: string;
  workspaceId: string;
  periodType: BudgetPeriodType;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

// --- Budget Limit ---
export interface BudgetLimit extends SyncableEntity {
  budgetPeriodId: string;
  categoryId: string;
  amount: string;
  currency: string;
}

// --- Tag ---
export interface Tag extends SyncableEntity {
  name: string;
  color: string | null;
}
