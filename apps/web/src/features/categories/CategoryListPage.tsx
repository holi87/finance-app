import { useState, useEffect } from 'react';
import type { Category } from '@budget-tracker/shared-types';
import { CategoryKind } from '@budget-tracker/shared-types';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { useTranslation } from '@/i18n/I18nContext';

const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

export function CategoryListPage() {
  const { activeWorkspace } = useWorkspace();
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (!activeWorkspace) return;
    loadCategories();
  }, [activeWorkspace?.id]);

  async function loadCategories() {
    if (!activeWorkspace) return;
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.get<Category[]>(
        `/api/workspaces/${activeWorkspace.id}/categories`,
      );
      setCategories(data.filter((c) => !c.isArchived));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.categories.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }

  const expenseCategories = categories.filter(
    (c) => c.kind === CategoryKind.EXPENSE || c.kind === CategoryKind.BOTH,
  );
  const incomeCategories = categories.filter(
    (c) => c.kind === CategoryKind.INCOME || c.kind === CategoryKind.BOTH,
  );

  const displayedCategories = activeTab === 'expense' ? expenseCategories : incomeCategories;

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
        <h1 className="text-xl font-bold text-gray-900">{t.categories.title}</h1>
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
          <button onClick={loadCategories} className="ml-2 font-medium underline">
            {t.common.retry}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex rounded-lg border border-gray-200 bg-gray-100 p-1">
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'expense'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {`${t.categories.expenseTab} (${expenseCategories.length})`}
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'income'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {`${t.categories.incomeTab} (${incomeCategories.length})`}
        </button>
      </div>

      {displayedCategories.length === 0 ? (
        <EmptyState
          title={t.categories.noCategories.replace('{type}', activeTab === 'expense' ? t.categories.expenseTab.toLowerCase() : t.categories.incomeTab.toLowerCase())}
          description={t.categories.noCategoriesDesc}
          actionLabel={t.categories.addCategory}
          onAction={() => setShowCreateForm(true)}
        />
      ) : (
        <div className="space-y-2">
          {displayedCategories.map((category) => (
            <div
              key={category.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: category.color ?? '#94a3b8' }}
              />
              <span className="text-sm font-medium text-gray-900">{category.name}</span>
              {category.kind === CategoryKind.BOTH && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {t.common.both}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateForm && (
        <CreateCategoryModal
          workspaceId={activeWorkspace?.id ?? ''}
          defaultKind={activeTab}
          onClose={() => setShowCreateForm(false)}
          onCreated={() => {
            setShowCreateForm(false);
            loadCategories();
          }}
        />
      )}
    </div>
  );
}

// --- Create Category Modal ---

interface CreateCategoryModalProps {
  workspaceId: string;
  defaultKind: string;
  onClose: () => void;
  onCreated: () => void;
}

function CreateCategoryModal({ workspaceId, defaultKind, onClose, onCreated }: CreateCategoryModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [kind, setKind] = useState(defaultKind);
  const [color, setColor] = useState(CATEGORY_COLORS[0]!);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await api.post(`/api/workspaces/${workspaceId}/categories`, {
        name: name.trim(),
        kind,
        color,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.categories.createFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">{t.categories.addTitle}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700">
              {t.common.name}
            </label>
            <input
              id="cat-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder={t.categories.namePlaceholder}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cat-kind" className="block text-sm font-medium text-gray-700">
              {t.common.type}
            </label>
            <select
              id="cat-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="expense">{t.categories.kindExpense}</option>
              <option value="income">{t.categories.kindIncome}</option>
              <option value="both">{t.categories.kindBoth}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">{t.categories.color}</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    color === c ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
              {isSubmitting ? <LoadingSpinner size="sm" /> : t.categories.addCategory}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
