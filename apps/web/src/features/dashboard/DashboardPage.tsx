import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { ReportSummary, Transaction } from '@budget-tracker/shared-types';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface DashboardData {
  summary: ReportSummary | null;
  recentTransactions: Transaction[];
}

export function DashboardPage() {
  const { activeWorkspace } = useWorkspace();
  const [data, setData] = useState<DashboardData>({
    summary: null,
    recentTransactions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    loadDashboard();
  }, [activeWorkspace?.id]);

  async function loadDashboard() {
    if (!activeWorkspace) return;
    setIsLoading(true);
    setError(null);

    try {
      const [summary, transactions] = await Promise.allSettled([
        api.get<ReportSummary>(`/api/workspaces/${activeWorkspace.id}/reports/summary`),
        api.get<{ items: Transaction[] }>(`/api/workspaces/${activeWorkspace.id}/transactions`, {
          pageSize: 10,
        }),
      ]);

      setData({
        summary: summary.status === 'fulfilled' ? summary.value : null,
        recentTransactions:
          transactions.status === 'fulfilled' ? transactions.value.items : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadDashboard} className="ml-2 font-medium underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currency = activeWorkspace?.baseCurrency ?? 'USD';

  return (
    <div className="px-4 py-6">
      {/* Balance cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BalanceCard
          label="Total Balance"
          amount={data.summary?.balance ?? '0.00'}
          currency={currency}
          variant="primary"
        />
        <BalanceCard
          label="Income"
          amount={data.summary?.incomeTotal ?? '0.00'}
          currency={currency}
          variant="success"
        />
        <BalanceCard
          label="Expenses"
          amount={data.summary?.expenseTotal ?? '0.00'}
          currency={currency}
          variant="danger"
        />
      </div>

      {/* Budget utilization placeholder */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Budget Summary
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-400">
            Budget utilization will appear here once budgets are set up.
          </p>
          <Link
            to="/budgets"
            className="mt-2 inline-block text-sm font-medium text-blue-500 hover:text-blue-600"
          >
            Set up budgets
          </Link>
        </div>
      </section>

      {/* Recent transactions */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Recent Transactions
          </h2>
          <Link
            to="/transactions"
            className="text-sm font-medium text-blue-500 hover:text-blue-600"
          >
            View all
          </Link>
        </div>

        {data.recentTransactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="Add your first transaction to start tracking."
            actionLabel="Add transaction"
            actionTo="/transactions/new"
          />
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
            {data.recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} currency={currency} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// --- Balance Card ---

interface BalanceCardProps {
  label: string;
  amount: string;
  currency: string;
  variant: 'primary' | 'success' | 'danger';
}

function BalanceCard({ label, amount, currency, variant }: BalanceCardProps) {
  const colors = {
    primary: 'bg-blue-500 text-white',
    success: 'bg-white text-green-600 border border-gray-200',
    danger: 'bg-white text-red-600 border border-gray-200',
  };

  const labelColors = {
    primary: 'text-blue-100',
    success: 'text-gray-500',
    danger: 'text-gray-500',
  };

  return (
    <div className={`rounded-xl p-4 shadow-sm ${colors[variant]}`}>
      <p className={`text-xs font-medium ${labelColors[variant]}`}>{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">
        {formatCurrency(amount, currency)}
      </p>
    </div>
  );
}

// --- Transaction Row ---

interface TransactionRowProps {
  transaction: Transaction;
  currency: string;
}

function TransactionRow({ transaction, currency }: TransactionRowProps) {
  const isExpense = transaction.type === 'expense';
  const isIncome = transaction.type === 'income';

  return (
    <Link
      to={`/transactions/${transaction.id}/edit`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${
          isExpense
            ? 'bg-red-100 text-red-600'
            : isIncome
              ? 'bg-green-100 text-green-600'
              : 'bg-blue-100 text-blue-600'
        }`}
      >
        {isExpense ? '-' : isIncome ? '+' : '~'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {transaction.description ?? 'Untitled'}
        </p>
        <p className="text-xs text-gray-500">{formatDate(transaction.transactionDate)}</p>
      </div>
      <span
        className={`text-sm font-semibold tabular-nums ${
          isExpense ? 'text-red-600' : isIncome ? 'text-green-600' : 'text-gray-900'
        }`}
      >
        {isExpense ? '-' : isIncome ? '+' : ''}
        {formatCurrency(transaction.amount, transaction.currency || currency)}
      </span>
    </Link>
  );
}

// --- Helpers ---

function formatCurrency(amount: string, currency: string): string {
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

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
