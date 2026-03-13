import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { useTranslation } from '@/i18n/I18nContext';

export function AdminLayout() {
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-dvh bg-gray-50">
      {/* Top header */}
      <header className="border-b border-gray-200 bg-white" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">{t.admin.title}</h1>
          <NavLink
            to="/dashboard"
            className="text-sm font-medium text-blue-500 hover:text-blue-600"
          >
            ← {t.nav.dashboard}
          </NavLink>
        </div>
      </header>

      {/* Sub-navigation tabs */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl gap-1 px-4">
          <AdminTab to="/admin/users" label={t.admin.users} />
          <AdminTab to="/admin/workspaces" label={t.admin.workspaces} />
        </div>
      </nav>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}

function AdminTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
          isActive
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`
      }
    >
      {label}
    </NavLink>
  );
}
