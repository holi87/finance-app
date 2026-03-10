import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Account, Category, Transaction, CreateTransactionRequest } from '@budget-tracker/shared-types';
import { TransactionType, CategoryKind } from '@budget-tracker/shared-types';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function TransactionForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { activeWorkspace } = useWorkspace();
  const isEditing = Boolean(id);

  // Form state
  const [type, setType] = useState<string>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]!,
  );
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

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

      // Load existing transaction for edit
      if (id) {
        const tx = await api.get<Transaction>(
          `/api/workspaces/${activeWorkspace.id}/transactions/${id}`,
        );
        setType(tx.type);
        setAmount(tx.amount);
        setAccountId(tx.accountId);
        setCategoryId(tx.categoryId ?? '');
        setTransactionDate(tx.transactionDate.split('T')[0]!);
        setDescription(tx.description ?? '');
        setNotes(tx.notes ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form data');
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
        await api.patch(`/api/workspaces/${activeWorkspace.id}/transactions/${id}`, {
          categoryId: categoryId || undefined,
          amount,
          description: description || undefined,
          notes: notes || undefined,
          transactionDate,
        });
      } else {
        const body: CreateTransactionRequest = {
          accountId,
          categoryId: categoryId || undefined,
          type,
          amount,
          currency,
          description: description || undefined,
          notes: notes || undefined,
          transactionDate,
        };
        await api.post(`/api/workspaces/${activeWorkspace.id}/transactions`, body);
      }

      navigate('/transactions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction');
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
          {isEditing ? 'Edit Transaction' : 'Add Transaction'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Transaction type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: TransactionType.EXPENSE, label: 'Expense', color: 'red' },
                { value: TransactionType.INCOME, label: 'Income', color: 'green' },
                { value: TransactionType.TRANSFER, label: 'Transfer', color: 'blue' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  disabled={isEditing}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    type === option.value
                      ? option.color === 'red'
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : option.color === 'green'
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  } disabled:opacity-60`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount
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
              Account
            </label>
            <select
              id="account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              disabled={isEditing}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-100"
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.type})
                </option>
              ))}
            </select>
          </div>

          {/* Category (not for transfers) */}
          {type !== TransactionType.TRANSFER && (
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="">No category</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={255}
              placeholder="What was this for?"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
              <span className="ml-1 text-gray-400">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Additional details..."
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || !accountId}
              className="flex flex-1 items-center justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <LoadingSpinner size="sm" />
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Add Transaction'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
