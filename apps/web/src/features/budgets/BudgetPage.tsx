import { useState, useEffect } from 'react';
import type { BudgetPeriod, BudgetLimit, Category } from '@budget-tracker/shared-types';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface BudgetLimitWithCategory extends BudgetLimit {
  categoryName?: string;
  spent?: string;
}

export function BudgetPage() {
  const { activeWorkspace } = useWorkspace();
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [limits, setLimits] = useState<BudgetLimitWithCategory[]>([]);
  const [_categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    loadBudgets();
  }, [activeWorkspace?.id]);

  async function loadBudgets() {
    if (!activeWorkspace) return;
    setIsLoading(true);
    setError(null);

    try {
      const [periodsData, categoriesData] = await Promise.all([
        api.get<BudgetPeriod[]>(`/api/workspaces/${activeWorkspace.id}/budget-periods`),
        api.get<Category[]>(`/api/workspaces/${activeWorkspace.id}/categories`),
      ]);

      setPeriods(periodsData);
      setCategories(categoriesData);

      // Load limits for the most recent period
      if (periodsData.length > 0) {
        const latestPeriod = periodsData[periodsData.length - 1]!;
        const limitsData = await api.get<BudgetLimit[]>(
          `/api/workspaces/${activeWorkspace.id}/budget-periods/${latestPeriod.id}/limits`,
        );
        // Enrich limits with category names
        const enriched = limitsData.map((limit) => {
          const cat = categoriesData.find((c) => c.id === limit.categoryId);
          return {
            ...limit,
            categoryName: cat?.name ?? 'Unknown',
          };
        });
        setLimits(enriched);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets');
    } finally {
      setIsLoading(false);
    }
  }

  const currency = activeWorkspace?.baseCurrency ?? 'USD';

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Budgets</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadBudgets} className="ml-2 font-medium underline">
            Retry
          </button>
        </div>
      )}

      {periods.length === 0 ? (
        <EmptyState
          title="No budget periods"
          description="Set up monthly budgets to track spending against limits for each category."
        />
      ) : limits.length === 0 ? (
        <EmptyState
          title="No budget limits set"
          description="Add spending limits to categories to monitor your budget."
        />
      ) : (
        <div className="space-y-3">
          {limits.map((limit) => {
            const budgeted = parseFloat(limit.amount);
            const spent = parseFloat(limit.spent ?? '0');
            const remaining = budgeted - spent;
            const percentage = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
            const isOver = spent > budgeted;
            const isNear = percentage >= 80 && !isOver;

            return (
              <div
                key={limit.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {limit.categoryName}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      isOver
                        ? 'text-red-600'
                        : isNear
                          ? 'text-amber-600'
                          : 'text-green-600'
                    }`}
                  >
                    {remaining >= 0
                      ? `${formatAmount(remaining.toFixed(2), currency)} left`
                      : `${formatAmount(Math.abs(remaining).toFixed(2), currency)} over`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-1 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOver
                        ? 'bg-red-500'
                        : isNear
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {formatAmount(spent.toFixed(2), currency)} spent
                  </span>
                  <span>
                    {formatAmount(budgeted.toFixed(2), currency)} budgeted
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatAmount(amount: string, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}
