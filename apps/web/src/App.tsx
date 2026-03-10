import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import { WorkspaceProvider } from '@/features/workspaces/WorkspaceContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { LoginPage } from '@/features/auth/LoginPage';
import { WorkspaceListPage } from '@/features/workspaces/WorkspaceListPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TransactionListPage } from '@/features/transactions/TransactionListPage';
import { TransactionForm } from '@/features/transactions/TransactionForm';
import { AccountListPage } from '@/features/accounts/AccountListPage';
import { CategoryListPage } from '@/features/categories/CategoryListPage';
import { BudgetPage } from '@/features/budgets/BudgetPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { AppLayout } from '@/layouts/AppLayout';

export function App() {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/workspaces" element={<WorkspaceListPage />} />

              {/* Workspace-scoped routes */}
              <Route
                element={
                  <WorkspaceProvider>
                    <AppLayout />
                  </WorkspaceProvider>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/transactions" element={<TransactionListPage />} />
                <Route path="/transactions/new" element={<TransactionForm />} />
                <Route path="/transactions/:id/edit" element={<TransactionForm />} />
                <Route path="/accounts" element={<AccountListPage />} />
                <Route path="/categories" element={<CategoryListPage />} />
                <Route path="/budgets" element={<BudgetPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
