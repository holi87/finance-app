import { useState, useEffect } from 'react';
import type { BudgetPeriod, BudgetLimit, Category } from '@budget-tracker/shared-types';
import { CategoryKind } from '@budget-tracker/shared-types';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreatePeriod, setShowCreatePeriod] = useState(false);
  const [showCreateLimit, setShowCreateLimit] = useState(false);

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
  const latestPeriod = periods.length > 0 ? periods[periods.length - 1] : null;

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
        {periods.length > 0 && (
          <button
            onClick={() => setShowCreateLimit(true)}
            className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
          >
            + Add limit
          </button>
        )}
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
          actionLabel="Create budget period"
          onAction={() => setShowCreatePeriod(true)}
        />
      ) : (
        <>
          {/* Current period info */}
          {latestPeriod && (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase text-blue-600">
                    {latestPeriod.periodType} period
                  </p>
                  <p className="text-sm text-blue-800">
                    {new Date(latestPeriod.startsAt).toLocaleDateString()} &mdash;{' '}
                    {new Date(latestPeriod.endsAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreatePeriod(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  New period
                </button>
              </div>
            </div>
          )}

          {limits.length === 0 ? (
            <EmptyState
              title="No budget limits set"
              description="Add spending limits to categories to monitor your budget."
              actionLabel="Add budget limit"
              onAction={() => setShowCreateLimit(true)}
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
                      <span>{formatAmount(spent.toFixed(2), currency)} spent</span>
                      <span>{formatAmount(budgeted.toFixed(2), currency)} budgeted</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showCreatePeriod && (
        <CreatePeriodModal
          workspaceId={activeWorkspace?.id ?? ''}
          onClose={() => setShowCreatePeriod(false)}
          onCreated={() => {
            setShowCreatePeriod(false);
            loadBudgets();
          }}
        />
      )}

      {showCreateLimit && latestPeriod && (
        <CreateLimitModal
          workspaceId={activeWorkspace?.id ?? ''}
          periodId={latestPeriod.id}
          categories={categories.filter(
            (c) => c.kind === CategoryKind.EXPENSE || c.kind === CategoryKind.BOTH,
          )}
          currency={currency}
          onClose={() => setShowCreateLimit(false)}
          onCreated={() => {
            setShowCreateLimit(false);
            loadBudgets();
          }}
        />
      )}
    </div>
  );
}

// --- Create Budget Period Modal ---

interface CreatePeriodModalProps {
  workspaceId: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreatePeriodModal({ workspaceId, onClose, onCreated }: CreatePeriodModalProps) {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [periodType, setPeriodType] = useState('monthly');
  const [startsAt, setStartsAt] = useState(firstDay.toISOString().split('T')[0]!);
  const [endsAt, setEndsAt] = useState(lastDay.toISOString().split('T')[0]!);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post(`/api/workspaces/${workspaceId}/budget-periods`, {
        periodType,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget period');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Create budget period</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="bp-type" className="block text-sm font-medium text-gray-700">
              Period type
            </label>
            <select
              id="bp-type"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <div>
            <label htmlFor="bp-start" className="block text-sm font-medium text-gray-700">
              Start date
            </label>
            <input
              id="bp-start"
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="bp-end" className="block text-sm font-medium text-gray-700">
              End date
            </label>
            <input
              id="bp-end"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !startsAt || !endsAt}
              className="flex flex-1 items-center justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Create Budget Limit Modal ---

interface CreateLimitModalProps {
  workspaceId: string;
  periodId: string;
  categories: Category[];
  currency: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateLimitModal({ workspaceId, periodId, categories, currency, onClose, onCreated }: CreateLimitModalProps) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post(`/api/workspaces/${workspaceId}/budget-limits`, {
        budgetPeriodId: periodId,
        categoryId,
        amount,
        currency,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget limit');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Add budget limit</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {categories.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              No expense categories found. Create categories first.
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="bl-category" className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  id="bl-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bl-amount" className="block text-sm font-medium text-gray-700">
                  Budget limit ({currency})
                </label>
                <input
                  id="bl-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || categories.length === 0}
              className="flex flex-1 items-center justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Add limit'}
            </button>
          </div>
        </form>
      </div>
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
