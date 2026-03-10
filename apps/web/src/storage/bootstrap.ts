import { api } from '../services/api';
import { db, clearAllLocalData } from './db';
import type {
  LocalWorkspace,
  LocalMembership,
  LocalAccount,
  LocalCategory,
  LocalTransaction,
  LocalBudgetPeriod,
  LocalBudgetLimit,
} from './db';

/**
 * Bootstrap local storage after login.
 * Fetches all workspace data from server and stores in IndexedDB.
 */
export async function bootstrapLocalData() {
  // 1. Fetch workspaces
  const workspaces = await api.get<(LocalWorkspace & { role: string })[]>('/api/workspaces');

  // Store workspaces and memberships
  const localWorkspaces: LocalWorkspace[] = [];
  const localMemberships: LocalMembership[] = [];

  for (const ws of workspaces) {
    localWorkspaces.push({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      type: ws.type,
      baseCurrency: ws.baseCurrency,
      ownerId: ws.ownerId,
      archivedAt: ws.archivedAt,
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt,
    });

    // We don't have full membership data from workspace list,
    // create a minimal one from the role
    const user = JSON.parse(localStorage.getItem('bt_user') || '{}');
    if (user.id) {
      localMemberships.push({
        id: `${ws.id}_${user.id}`,
        workspaceId: ws.id,
        userId: user.id,
        role: ws.role,
        invitedBy: null,
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
      });
    }
  }

  await db.workspaces.bulkPut(localWorkspaces);
  await db.memberships.bulkPut(localMemberships);

  // 2. For each workspace, fetch financial data
  for (const ws of workspaces) {
    await bootstrapWorkspaceData(ws.id);
  }
}

/**
 * Bootstrap data for a single workspace.
 */
export async function bootstrapWorkspaceData(workspaceId: string) {
  try {
    const [accounts, categories, transactionsRes, budgetPeriods, budgetLimits] =
      await Promise.all([
        api.get<LocalAccount[]>(`/api/workspaces/${workspaceId}/accounts`),
        api.get<LocalCategory[]>(`/api/workspaces/${workspaceId}/categories`),
        api.get<{ items: LocalTransaction[] }>(
          `/api/workspaces/${workspaceId}/transactions?pageSize=100`,
        ),
        api.get<LocalBudgetPeriod[]>(`/api/workspaces/${workspaceId}/budget-periods`),
        api.get<LocalBudgetLimit[]>(`/api/workspaces/${workspaceId}/budget-limits`),
      ]);

    await db.transaction('rw', [
      db.accounts,
      db.categories,
      db.transactions,
      db.budgetPeriods,
      db.budgetLimits,
    ], async () => {
      await db.accounts.bulkPut(
        accounts.map((a) => ({ ...a, workspaceId, amount: String(a.openingBalance) })),
      );
      await db.categories.bulkPut(categories.map((c) => ({ ...c, workspaceId })));
      await db.transactions.bulkPut(
        transactionsRes.items.map((t) => ({ ...t, workspaceId })),
      );
      await db.budgetPeriods.bulkPut(budgetPeriods.map((p) => ({ ...p, workspaceId })));
      await db.budgetLimits.bulkPut(budgetLimits.map((l) => ({ ...l, workspaceId })));
    });
  } catch (err) {
    console.warn(`Failed to bootstrap workspace ${workspaceId}:`, err);
  }
}

/**
 * Clear all local data on logout.
 */
export { clearAllLocalData };
