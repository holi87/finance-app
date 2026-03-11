import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Transaction, PaginatedResponse } from '@budget-tracker/shared-types';
import { TransactionType } from '@budget-tracker/shared-types';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { useTranslation } from '@/i18n/I18nContext';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

export function TransactionListPage() {
  const { t } = useTranslation();
  const { activeWorkspace } = useWorkspace();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const pageSize = 20;

  useEffect(() => {
    if (!activeWorkspace) return;
    loadTransactions();
  }, [activeWorkspace?.id, page, typeFilter, dateFrom, dateTo]);

  async function loadTransactions() {
    if (!activeWorkspace) return;
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number | undefined> = {
        page,
        pageSize,
      };
      if (typeFilter) params['type'] = typeFilter;
      if (dateFrom) params['from'] = dateFrom;
      if (dateTo) params['to'] = dateTo;

      const result = await api.get<PaginatedResponse<Transaction>>(
        `/api/workspaces/${activeWorkspace.id}/transactions`,
        params,
      );
      setTransactions(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.transactions.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const currency = activeWorkspace?.baseCurrency ?? 'USD';

  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t.transactions.title}</h1>
        <Link
          to="/transactions/new"
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
        >
          {t.common.add}
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          aria-label="Filter by type"
        >
          <option value="">{t.transactions.allTypes}</option>
          <option value={TransactionType.EXPENSE}>{t.transactions.expensesFilter}</option>
          <option value={TransactionType.INCOME}>{t.transactions.incomeFilter}</option>
          <option value={TransactionType.TRANSFER}>{t.transactions.transfersFilter}</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          aria-label="From date"
          placeholder="From"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          aria-label="To date"
          placeholder="To"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadTransactions} className="ml-2 font-medium underline">
            {t.common.retry}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          title={t.transactions.noFound}
          description={
            typeFilter || dateFrom || dateTo
              ? t.transactions.changeFilters
              : t.transactions.getStarted
          }
          actionLabel={!typeFilter && !dateFrom && !dateTo ? t.transactions.addTransaction : undefined}
          actionTo={!typeFilter && !dateFrom && !dateTo ? '/transactions/new' : undefined}
        />
      ) : (
        <>
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
            {transactions.map((tx) => (
              <Link
                key={tx.id}
                to={`/transactions/${tx.id}/edit`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    tx.type === 'expense'
                      ? 'bg-red-100 text-red-600'
                      : tx.type === 'income'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : '~'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {tx.description ?? t.common.untitled}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.transactionDate).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    tx.type === 'expense'
                      ? 'text-red-600'
                      : tx.type === 'income'
                        ? 'text-green-600'
                        : 'text-gray-900'
                  }`}
                >
                  {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                  {formatAmount(tx.amount, tx.currency || currency)}
                </span>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.transactions.previous}
              </button>
              <span className="text-sm text-gray-500">
                {t.transactions.pageOf.replace('{page}', String(page)).replace('{total}', String(totalPages))}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.transactions.next}
              </button>
            </div>
          )}
        </>
      )}

      {/* FAB for mobile */}
      <Link
        to="/transactions/new"
        className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-2xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:hidden"
        aria-label={t.transactions.addTransaction}
      >
        +
      </Link>
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
