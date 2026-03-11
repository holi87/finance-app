import { useState } from 'react';
import { useReminders } from './ReminderContext';
import { useTranslation } from '@/i18n/I18nContext';

export function ReminderBar() {
  const { t } = useTranslation();
  const { pendingReminders, executeReminder, dismissReminder } = useReminders();
  const [expanded, setExpanded] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  if (pendingReminders.length === 0) return null;

  async function handleAction(id: string, action: 'execute' | 'dismiss') {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      if (action === 'execute') {
        await executeReminder(id);
      } else {
        await dismissReminder(id);
      }
    } catch {
      // Error handled silently — item stays in list for retry
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const count = pendingReminders.length;

  return (
    <div className="border-b border-amber-200 bg-amber-50" role="alert">
      {/* Collapsed bar */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <BellIcon />
          <span className="text-sm font-medium text-amber-800">
            {t.reminders.count.replace('{n}', String(count))}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-amber-700 hover:text-amber-900"
        >
          {expanded ? t.reminders.hide : t.reminders.showAll}
        </button>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="max-h-60 overflow-y-auto border-t border-amber-200 px-4 py-2">
          <div className="space-y-2">
            {pendingReminders.map((r) => {
              const isProcessing = processingIds.has(r.id);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {r.description || r.account.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.type === 'income' ? '+' : '-'}
                      {r.amount} {r.currency}
                      {r.category && ` · ${r.category.name}`}
                      {' · '}
                      {r.account.name}
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleAction(r.id, 'execute')}
                      disabled={isProcessing}
                      className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                    >
                      {t.reminders.execute}
                    </button>
                    <button
                      onClick={() => handleAction(r.id, 'dismiss')}
                      disabled={isProcessing}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {t.reminders.dismiss}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      className="h-5 w-5 text-amber-600"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}
