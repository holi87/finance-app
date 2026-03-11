import { useState, useEffect } from 'react';
import type { Account } from '@budget-tracker/shared-types';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { useTranslation } from '@/i18n/I18nContext';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

export function AccountListPage() {
  const { t } = useTranslation();
  const { activeWorkspace } = useWorkspace();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

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
      setError(err instanceof Error ? err.message : t.accounts.loadFailed);
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
        <h1 className="text-xl font-bold text-gray-900">{t.accounts.title}</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
        >
          {t.common.add}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadAccounts} className="ml-2 font-medium underline">
            {t.common.retry}
          </button>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          title={t.accounts.noAccounts}
          description={t.accounts.noAccountsDesc}
          actionLabel={t.accounts.addAccount}
          onAction={() => setShowCreateForm(true)}
        />
      ) : (
        <>
          {/* Total balance */}
          <div className="mb-6 rounded-xl bg-blue-500 p-4 text-white shadow-sm">
            <p className="text-xs font-medium text-blue-100">{t.accounts.totalBalance}</p>
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
                {t.accounts.archived}
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

      {showCreateForm && (
        <CreateAccountModal
          workspaceId={activeWorkspace?.id ?? ''}
          defaultCurrency={currency}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            loadAccounts();
          }}
        />
      )}
    </div>
  );
}

// --- Create Account Modal ---

interface CreateAccountModalProps {
  workspaceId: string;
  defaultCurrency: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateAccountModal({ workspaceId, defaultCurrency, onClose, onCreated }: CreateAccountModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState('bank');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [openingBalance, setOpeningBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post(`/api/workspaces/${workspaceId}/accounts`, {
        name: name.trim(),
        type,
        currency,
        openingBalance: openingBalance || '0',
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.accounts.createFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">{t.accounts.addTitle}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="acc-name" className="block text-sm font-medium text-gray-700">
              {t.common.name}
            </label>
            <input
              id="acc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder={t.accounts.namePlaceholder}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="acc-type" className="block text-sm font-medium text-gray-700">
              {t.common.type}
            </label>
            <select
              id="acc-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="bank">{t.accounts.typeBank}</option>
              <option value="cash">{t.accounts.typeCash}</option>
              <option value="savings">{t.accounts.typeSavings}</option>
              <option value="credit">{t.accounts.typeCredit}</option>
              <option value="investment">{t.accounts.typeInvestment}</option>
            </select>
          </div>

          <div>
            <label htmlFor="acc-currency" className="block text-sm font-medium text-gray-700">
              {t.common.currency}
            </label>
            <select
              id="acc-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="PLN">{t.currencies.PLN}</option>
              <option value="USD">{t.currencies.USD}</option>
              <option value="EUR">{t.currencies.EUR}</option>
              <option value="GBP">{t.currencies.GBP}</option>
              <option value="CZK">{t.currencies.CZK}</option>
              <option value="CHF">{t.currencies.CHF}</option>
            </select>
          </div>

          <div>
            <label htmlFor="acc-balance" className="block text-sm font-medium text-gray-700">
              {t.accounts.openingBalance}
            </label>
            <input
              id="acc-balance"
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex flex-1 items-center justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : t.accounts.addAccount}
            </button>
          </div>
        </form>
      </div>
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
