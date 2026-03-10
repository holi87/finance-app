import { useState, useEffect } from 'react';
import type { Account } from '@budget-tracker/shared-types';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

export function AccountListPage() {
  const { activeWorkspace } = useWorkspace();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    loadAccounts();
  }, [activeWorkspace?.id]);

  async function loadAccounts() {
    if (!activeWorkspace) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<Account[]>(
        `/api/workspaces/${activeWorkspace.id}/accounts`,
      );
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }

  const currency = activeWorkspace?.baseCurrency ?? 'USD';
  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const archivedAccounts = accounts.filter((a) => a.isArchived);

  const totalBalance = activeAccounts.reduce(
    (sum, a) => sum + parseFloat(a.currentBalanceCached || '0'),
    0,
  );

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
        <h1 className="text-xl font-bold text-gray-900">Accounts</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadAccounts} className="ml-2 font-medium underline">
            Retry
          </button>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add your first account to start tracking balances."
        />
      ) : (
        <>
          {/* Total balance */}
          <div className="mb-6 rounded-xl bg-blue-500 p-4 text-white shadow-sm">
            <p className="text-xs font-medium text-blue-100">Total Balance</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {formatAmount(totalBalance.toFixed(2), currency)}
            </p>
          </div>

          {/* Active accounts */}
          <div className="space-y-3">
            {activeAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-500">
                  {accountTypeIcon(account.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{account.name}</p>
                  <p className="text-xs capitalize text-gray-500">
                    {account.type} &middot; {account.currency}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                  {formatAmount(account.currentBalanceCached, account.currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Archived accounts */}
          {archivedAccounts.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Archived
              </h2>
              <div className="space-y-2">
                {archivedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 opacity-60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-600">{account.name}</p>
                    </div>
                    <span className="text-sm tabular-nums text-gray-500">
                      {formatAmount(account.currentBalanceCached, account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function accountTypeIcon(type: string): string {
  switch (type) {
    case 'cash':
      return '$';
    case 'bank':
      return 'B';
    case 'savings':
      return 'S';
    case 'credit':
      return 'C';
    case 'investment':
      return 'I';
    default:
      return '?';
  }
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
