import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { WorkspaceSwitcher } from '@/features/workspaces/WorkspaceSwitcher';
import { SyncBadge } from '@/components/SyncBadge';
import { useAuth } from '@/features/auth/AuthContext';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSyncInit } from '@/sync/useSyncInit';
import { useTranslation } from '@/i18n/I18nContext';
import { ReminderBar } from '@/features/reminders/ReminderBar';

export function AppLayout() {
  const { user } = useAuth();
  const { activeWorkspace, isLoading, error } = useWorkspace();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Initialize sync engine — triggers auto-sync on workspace change, online recovery, app resume
  useSyncInit(activeWorkspace?.id ?? null);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <p className="mb-4 text-sm text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white"
        >
          {t.common.retry}
        </button>
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <p className="mb-4 text-sm text-gray-600">{t.workspaces.noWorkspaceSelected}</p>
        <button
          onClick={() => navigate('/workspaces')}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white"
        >
          {t.workspaces.chooseWorkspace}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
        {/* Sidebar header */}
        <div className="border-b border-gray-100 p-4">
          <WorkspaceSwitcher />
        </div>

        {/* Sidebar navigation */}
        <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
          <SidebarLink to="/dashboard" icon={<DashboardIcon />} label={t.nav.dashboard} />
          <SidebarLink to="/transactions" icon={<TransactionsIcon />} label={t.nav.transactions} />
          <SidebarLink to="/accounts" icon={<AccountsIcon />} label={t.nav.accounts} />
          <SidebarLink to="/categories" icon={<CategoriesIcon />} label={t.nav.categories} />
          <SidebarLink to="/reminders" icon={<RemindersIcon />} label={t.nav.reminders} />
          <SidebarLink to="/budgets" icon={<BudgetsIcon />} label={t.nav.budgets} />
          <SidebarLink to="/settings" icon={<SettingsIcon />} label={t.nav.settings} />
          {user?.isAdmin && (
            <SidebarLink to="/admin" icon={<AdminIcon />} label={t.nav.admin} />
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-gray-100 p-4">
          <SyncBadge />
          <div className="mt-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
              {user?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <span className="truncate text-sm text-gray-600">{user?.displayName ?? 'User'}</span>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top bar — safe area background + content */}
        <div className="bg-white lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <WorkspaceSwitcher />
            <SyncBadge />
          </header>
        </div>

        {/* Reminder notifications */}
        <ReminderBar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom navigation */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-around px-2 py-1">
            <BottomNavLink to="/dashboard" icon={<DashboardIcon />} label={t.nav.dashboard} />
            <BottomNavLink to="/transactions" icon={<TransactionsIcon />} label={t.nav.transactions} />
            <BottomNavAddButton />
            <BottomNavLink to="/budgets" icon={<BudgetsIcon />} label={t.nav.budgets} />
            <BottomNavLink to="/settings" icon={<SettingsIcon />} label={t.nav.settings} />
          </div>
        </nav>
      </div>
    </div>
  );
}

// --- Sidebar Link ---

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function SidebarLink({ to, icon, label }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      <span className="h-5 w-5">{icon}</span>
      {label}
    </NavLink>
  );
}

// --- Bottom Nav Link ---

interface BottomNavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function BottomNavLink({ to, icon, label }: BottomNavLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 px-3 py-2 text-xs ${
          isActive ? 'text-blue-500' : 'text-gray-500'
        }`
      }
    >
      <span className="h-5 w-5">{icon}</span>
      {label}
    </NavLink>
  );
}

// --- Bottom Nav Add Button ---

function BottomNavAddButton() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      onClick={() => navigate('/transactions/new')}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-md transition-transform active:scale-95"
      aria-label={t.nav.addTransaction}
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    </button>
  );
}

// --- Icons ---

function DashboardIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

function TransactionsIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function AccountsIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  );
}

function CategoriesIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function BudgetsIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function RemindersIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}
