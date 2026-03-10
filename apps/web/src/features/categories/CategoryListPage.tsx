import { useState, useEffect } from 'react';
import type { Category } from '@budget-tracker/shared-types';
import { CategoryKind } from '@budget-tracker/shared-types';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

export function CategoryListPage() {
  const { activeWorkspace } = useWorkspace();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

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
      setError(err instanceof Error ? err.message : 'Failed to load categories');
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
        <h1 className="text-xl font-bold text-gray-900">Categories</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadCategories} className="ml-2 font-medium underline">
            Retry
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
          Expense ({expenseCategories.length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'income'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Income ({incomeCategories.length})
        </button>
      </div>

      {displayedCategories.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} categories`}
          description="Categories help you organize your transactions."
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
                  both
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
