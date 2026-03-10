import type { User, Workspace, Membership, Account, Category, Transaction, BudgetPeriod, BudgetLimit } from './domain';
import type { MembershipRole } from './enums';

// --- Error ---
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

// --- Auth ---
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'email' | 'displayName'>;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// --- User ---
export type UserProfileResponse = Pick<User, 'id' | 'email' | 'displayName'>;

// --- Workspace ---
export interface CreateWorkspaceRequest {
  name: string;
  type: string;
  baseCurrency: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
}

export interface WorkspaceWithRole extends Workspace {
  role: MembershipRole;
}

// --- Membership ---
export interface AddMemberRequest {
  userId: string;
  role: MembershipRole;
}

export interface UpdateMemberRoleRequest {
  role: MembershipRole;
}

// --- Account ---
export interface CreateAccountRequest {
  name: string;
  type: string;
  currency: string;
  openingBalance?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  type?: string;
  isArchived?: boolean;
}

// --- Category ---
export interface CreateCategoryRequest {
  name: string;
  kind: string;
  parentCategoryId?: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  kind?: string;
  color?: string;
  icon?: string;
  isArchived?: boolean;
}

// --- Transaction ---
export interface CreateTransactionRequest {
  accountId: string;
  categoryId?: string;
  type: string;
  amount: string;
  currency: string;
  description?: string;
  notes?: string;
  transactionDate: string;
}

export interface UpdateTransactionRequest {
  categoryId?: string;
  amount?: string;
  description?: string;
  notes?: string;
  transactionDate?: string;
}

export interface TransactionListParams {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// --- Transfer ---
export interface CreateTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currency: string;
  description?: string;
  transactionDate: string;
}

// --- Budget ---
export interface CreateBudgetPeriodRequest {
  periodType: string;
  startsAt: string;
  endsAt: string;
}

export interface CreateBudgetLimitRequest {
  budgetPeriodId: string;
  categoryId: string;
  amount: string;
  currency: string;
}

export interface UpdateBudgetLimitRequest {
  amount?: string;
}

// --- Reports ---
export interface ReportSummary {
  incomeTotal: string;
  expenseTotal: string;
  balance: string;
  currency: string;
}

export interface CategoryReport {
  categoryId: string;
  categoryName: string;
  total: string;
  currency: string;
}

// Re-export domain types used in responses
export type {
  User,
  Workspace,
  Membership,
  Account,
  Category,
  Transaction,
  BudgetPeriod,
  BudgetLimit,
};
