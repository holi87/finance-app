import { useAuth } from '@/features/auth/AuthContext';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { useNavigate } from 'react-router-dom';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Settings</h1>

      {/* Profile section */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Profile
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
          Workspace
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {activeWorkspace ? (
            <>
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">Name</p>
                <p className="text-sm font-medium text-gray-900">{activeWorkspace.name}</p>
              </div>
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm capitalize text-gray-900">{activeWorkspace.type}</p>
              </div>
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-xs text-gray-500">Currency</p>
                <p className="text-sm text-gray-900">{activeWorkspace.baseCurrency}</p>
              </div>
              <div className="px-4 py-3">
                <button
                  onClick={() => navigate('/workspaces')}
                  className="text-sm font-medium text-blue-500 hover:text-blue-600"
                >
                  Switch workspace
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-3">
              <p className="text-sm text-gray-500">No workspace selected</p>
            </div>
          )}
        </div>
      </section>

      {/* Preferences placeholder */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Preferences
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-400">
            Preferences and customization options will be available here.
          </p>
        </div>
      </section>

      {/* Sync section placeholder */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Sync
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Manual sync</p>
              <p className="text-xs text-gray-500">Force sync data with server</p>
            </div>
            <button
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => {
                // Placeholder - will be implemented with sync engine
              }}
            >
              Sync now
            </button>
          </div>
        </div>
      </section>

      {/* Device info placeholder */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Device
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Platform</span>
              <span className="text-gray-900">
                {navigator.userAgent.includes('iPhone') ? 'iOS PWA' : 'Web'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Online</span>
              <span className="text-gray-900">{navigator.onLine ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
      >
        Sign out
      </button>
    </div>
  );
}
