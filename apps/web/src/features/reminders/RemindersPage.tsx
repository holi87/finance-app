import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { useTranslation } from '@/i18n/I18nContext';
import { useReminders } from './ReminderContext';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface ReminderListItem {
  id: string;
  type: string;
  amount: string;
  currency: string;
  description: string | null;
  reminderDate: string;
  status: string;
  account: { id: string; name: string };
  category: { id: string; name: string; color: string | null } | null;
}

export function RemindersPage() {
  const { t } = useTranslation();
  const { activeWorkspace } = useWorkspace();
  const { executeReminder, dismissReminder, refresh: refreshPending } = useReminders();
  const [reminders, setReminders] = useState<ReminderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!activeWorkspace) return;
    loadReminders();
  }, [activeWorkspace?.id]);

  async function loadReminders() {
    if (!activeWorkspace) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<ReminderListItem[]>(
        `/api/workspaces/${activeWorkspace.id}/reminders`,
      );
      setReminders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reminders.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAction(id: string, action: 'execute' | 'dismiss') {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      if (action === 'execute') {
        await executeReminder(id);
      } else {
        await dismissReminder(id);
      }
      // Update the list item's status locally
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: action === 'execute' ? 'completed' : 'dismissed' }
            : r,
        ),
      );
    } catch {
      setError(t.reminders.actionFailed);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDelete(reminder: ReminderListItem) {
    if (!activeWorkspace) return;
    if (!window.confirm(t.reminders.deleteConfirm)) return;
    try {
      await api.delete(`/api/workspaces/${activeWorkspace.id}/reminders/${reminder.id}`);
      setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
      refreshPending();
    } catch {
      setError(t.reminders.deleteFailed);
    }
  }

  const filtered = statusFilter
    ? reminders.filter((r) => r.status === statusFilter)
    : reminders;

  const currency = activeWorkspace?.baseCurrency ?? 'USD';

  return (
    <div className="px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{t.reminders.title}</h1>
        <Link
          to="/reminders/new"
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
        >
          {t.common.add}
        </Link>
      </div>

      {/* Status filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          aria-label="Filter by status"
        >
          <option value="">{t.reminders.allStatuses}</option>
          <option value="pending">{t.reminders.statusPending}</option>
          <option value="completed">{t.reminders.statusCompleted}</option>
          <option value="dismissed">{t.reminders.statusDismissed}</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={loadReminders} className="ml-2 font-medium underline">
            {t.common.retry}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t.reminders.noReminders}
          description={
            statusFilter ? t.reminders.noRemindersDesc : t.reminders.noRemindersDesc
          }
          actionLabel={!statusFilter ? t.reminders.addReminder : undefined}
          actionTo={!statusFilter ? '/reminders/new' : undefined}
        />
      ) : (
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {filtered.map((r) => {
            const isProcessing = processingIds.has(r.id);
            const isPending = r.status === 'pending';
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                {/* Status indicator */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                    r.status === 'pending'
                      ? 'bg-amber-100 text-amber-600'
                      : r.status === 'completed'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {r.status === 'pending' ? '⏳' : r.status === 'completed' ? '✓' : '✕'}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {r.description || r.account.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(r.reminderDate).toLocaleDateString()}
                    {' · '}
                    {r.type === 'income' ? '+' : '-'}
                    {formatAmount(r.amount, r.currency || currency)}
                    {r.category && ` · ${r.category.name}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="ml-2 flex shrink-0 items-center gap-1.5">
                  {isPending && (
                    <>
                      <button
                        onClick={() => handleAction(r.id, 'execute')}
                        disabled={isProcessing}
                        className="rounded-lg bg-green-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                        title={t.reminders.execute}
                      >
                        {t.reminders.execute}
                      </button>
                      <button
                        onClick={() => handleAction(r.id, 'dismiss')}
                        disabled={isProcessing}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        title={t.reminders.dismiss}
                      >
                        {t.reminders.dismiss}
                      </button>
                      <Link
                        to={`/reminders/${r.id}/edit`}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        ✎
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(r)}
                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    title={t.common.delete}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB for mobile */}
      <Link
        to="/reminders/new"
        className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-2xl text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:hidden"
        aria-label={t.reminders.addReminder}
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
