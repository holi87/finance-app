import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import { onSyncStatusChange, syncWorkspace, type SyncStatus } from '@/sync/sync-orchestrator';
import { useTranslation, type Locale } from '@/i18n/I18nContext';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { t, locale, setLocale } = useTranslation();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: navigator.onLine ? 'idle' : 'offline',
    lastSyncedAt: null,
    pendingChanges: 0,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handleSyncNow() {
    if (!activeWorkspace) return;
    await syncWorkspace(activeWorkspace.id);
  }

  function formatLastSynced(iso: string | null): string {
    if (!iso) return t.settings.never;
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);

    if (diffMin < 1) return t.settings.justNow;
    if (diffMin < 60) return t.settings.minutesAgo.replace('{n}', String(diffMin));

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return t.settings.hoursAgo.replace('{n}', String(diffHr));

    return date.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">{t.settings.title}</h1>

      {/* Profile section */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t.settings.profile}
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
              {user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">
                {user?.displayName ?? 'User'}
              </p>
              <p className="truncate text-sm text-gray-500">{user?.email ?? ''}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Workspace section */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t.settings.workspace}
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {activeWorkspace ? (
            <>
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">{t.common.name}</p>
                <p className="text-sm font-medium text-gray-900">{activeWorkspace.name}</p>
              </div>
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">{t.common.type}</p>
                <p className="text-sm capitalize text-gray-900">{activeWorkspace.type}</p>
              </div>
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">{t.common.currency}</p>
                <p className="text-sm text-gray-900">{activeWorkspace.baseCurrency}</p>
              </div>
              <div className="px-4 py-3">
                <button
                  onClick={() => navigate('/workspaces')}
                  className="text-sm font-medium text-blue-500 hover:text-blue-600"
                >
                  {t.settings.switchWorkspace}
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-3">
              <p className="text-sm text-gray-500">{t.settings.noWorkspace}</p>
            </div>
          )}
        </div>
      </section>

      {/* Preferences — Language switcher */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t.settings.preferences}
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{t.settings.language}</p>
              <p className="text-xs text-gray-500">{t.settings.languageDesc}</p>
            </div>
            <div className="flex rounded-lg border border-gray-300 p-0.5">
              {(['pl', 'en'] as Locale[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLocale(lang)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    locale === lang
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sync section */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t.settings.sync}
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">{t.settings.lastSynced}</p>
            <p className="text-sm font-medium text-gray-900">
              {formatLastSynced(syncStatus.lastSyncedAt)}
            </p>
          </div>

          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">{t.settings.pendingChanges}</p>
            <p className="text-sm font-medium text-gray-900">
              {syncStatus.pendingChanges === 0
                ? t.settings.allSynced
                : t.settings.nPending.replace('{n}', String(syncStatus.pendingChanges))}
            </p>
          </div>

          {syncStatus.error && (
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500">{t.common.error}</p>
              <p className="text-sm text-red-600">{syncStatus.error}</p>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">{t.settings.manualSync}</p>
              <p className="text-xs text-gray-500">{t.settings.syncDesc}</p>
            </div>
            <button
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleSyncNow}
              disabled={syncStatus.state === 'syncing' || syncStatus.state === 'offline'}
            >
              {syncStatus.state === 'syncing' ? t.settings.syncing : t.settings.syncNow}
            </button>
          </div>
        </div>
      </section>

      {/* Device info */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          {t.settings.device}
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{t.settings.platform}</span>
              <span className="text-gray-900">
                {navigator.userAgent.includes('iPhone') ? 'iOS PWA' : 'Web'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.settings.online}</span>
              <span className="text-gray-900">{navigator.onLine ? t.common.yes : t.common.no}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
      >
        {t.auth.signOut}
      </button>
    </div>
  );
}
