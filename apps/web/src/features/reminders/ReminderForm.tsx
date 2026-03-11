import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Account, Category } from '@budget-tracker/shared-types';
import { TransactionType, CategoryKind } from '@budget-tracker/shared-types';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { useTranslation } from '@/i18n/I18nContext';
import { useReminders } from './ReminderContext';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface ReminderDetail {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: string;
  amount: string;
  currency: string;
  description: string | null;
  reminderDate: string;
  status: string;
}

export function ReminderForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { activeWorkspace } = useWorkspace();
  const { refresh: refreshPending } = useReminders();
  const isEditing = Boolean(id);

  // Form state
  const [type, setType] = useState<string>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [reminderDate, setReminderDate] = useState(
    new Date().toISOString().split('T')[0]!,
  );
  const [description, setDescription] = useState('');

  // Reference data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    loadFormData();
  }, [activeWorkspace?.id, id]);

  async function loadFormData() {
    if (!activeWorkspace) return;
    setIsLoading(true);

    try {
      const [accountsResult, categoriesResult] = await Promise.all([
        api.get<Account[]>(`/api/workspaces/${activeWorkspace.id}/accounts`),
        api.get<Category[]>(`/api/workspaces/${activeWorkspace.id}/categories`),
      ]);

      setAccounts(accountsResult.filter((a) => !a.isArchived));
      setCategories(categoriesResult.filter((c) => !c.isArchived));

      // Set default account
      if (accountsResult.length > 0 && !accountId) {
        setAccountId(accountsResult[0]!.id);
      }

      // Load existing reminder for edit
      if (id) {
        const reminder = await api.get<ReminderDetail>(
          `/api/workspaces/${activeWorkspace.id}/reminders/${id}`,
        );
        setType(reminder.type);
        setAmount(reminder.amount);
        setAccountId(reminder.accountId);
        setCategoryId(reminder.categoryId ?? '');
        setReminderDate(reminder.reminderDate.split('T')[0]!);
        setDescription(reminder.description ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reminders.loadFormFailed);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const currency = activeWorkspace.baseCurrency;

      if (isEditing && id) {
        await api.patch(`/api/workspaces/${activeWorkspace.id}/reminders/${id}`, {
          accountId,
          categoryId: categoryId || undefined,
          type,
          amount,
          currency,
          description: description || undefined,
          reminderDate,
        });
      } else {
        await api.post(`/api/workspaces/${activeWorkspace.id}/reminders`, {
          accountId,
          categoryId: categoryId || undefined,
          type,
          amount,
          currency,
          description: description || undefined,
          reminderDate,
        });
      }

      refreshPending();
      navigate('/reminders');
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reminders.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Filter categories by transaction type
  const filteredCategories = categories.filter((c) => {
    if (type === TransactionType.TRANSFER) return false;
    if (c.kind === CategoryKind.BOTH) return true;
    if (type === TransactionType.EXPENSE && c.kind === CategoryKind.EXPENSE) return true;
    if (type === TransactionType.INCOME && c.kind === CategoryKind.INCOME) return true;
    return false;
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-xl font-bold text-gray-900">
          {isEditing ? t.reminders.editTitle : t.reminders.addTitle}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Transaction type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{t.common.type}</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: TransactionType.EXPENSE, label: t.transactions.expense, color: 'red' },
                { value: TransactionType.INCOME, label: t.transactions.income, color: 'green' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    type === option.value
                      ? option.color === 'red'
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-green-300 bg-green-50 text-green-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              {t.transactions.amount}
            </label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                {activeWorkspace?.baseCurrency ?? '$'}
              </span>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder="0.00"
                className="block w-full rounded-lg border border-gray-300 py-3 pl-12 pr-3 text-lg font-semibold tabular-nums shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Account */}
          <div>
            <label htmlFor="account" className="block text-sm font-medium text-gray-700">
              {t.transactions.account}
            </label>
            <select
              id="account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="">{t.transactions.selectAccount}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              {t.transactions.category}
            </label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="">{t.transactions.noCategory}</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reminder date */}
          <div>
            <label htmlFor="reminderDate" className="block text-sm font-medium text-gray-700">
              {t.reminders.reminderDate}
            </label>
            <input
              id="reminderDate"
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">{t.reminders.reminderDateHint}</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              {t.transactions.description}
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={255}
              placeholder={t.transactions.descriptionPlaceholder}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || !accountId}
              className="flex flex-1 items-center justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : isEditing ? (
                t.reminders.saveChanges
              ) : (
                t.reminders.addTitle
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
