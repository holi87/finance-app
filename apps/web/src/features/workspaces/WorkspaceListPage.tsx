import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WorkspaceWithRole, CreateWorkspaceRequest } from '@budget-tracker/shared-types';
import { WorkspaceType } from '@budget-tracker/shared-types';
import { api } from '@/services/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

export function WorkspaceListPage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<WorkspaceWithRole[]>('/api/workspaces');
      setWorkspaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  }

  function selectWorkspace(workspaceId: string) {
    localStorage.setItem('bt_active_workspace_id', workspaceId);
    navigate('/dashboard');
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Workspaces</h1>
        <p className="mb-6 text-sm text-gray-500">Choose a workspace to manage</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              onClick={loadWorkspaces}
              className="ml-2 font-medium text-red-800 underline"
            >
              Retry
            </button>
          </div>
        )}

        {workspaces.length === 0 && !error ? (
          <EmptyState
            title="No workspaces yet"
            description="Create your first workspace to start tracking your finances."
            actionLabel="Create workspace"
            onAction={() => setShowCreateForm(true)}
          />
        ) : (
          <div className="space-y-3">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                onClick={() => selectWorkspace(workspace.id)}
                className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-lg font-bold text-blue-600">
                  {workspace.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{workspace.name}</p>
                  <p className="text-xs capitalize text-gray-500">
                    {workspace.type} &middot; {workspace.baseCurrency} &middot; {workspace.role}
                  </p>
                </div>
                <svg
                  className="h-5 w-5 shrink-0 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8.25 4.5 7.5 7.5-7.5 7.5"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Create workspace button */}
        <button
          onClick={() => setShowCreateForm(true)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-500"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create new workspace
        </button>

        {/* Create workspace modal */}
        {showCreateForm && (
          <CreateWorkspaceModal
            onClose={() => setShowCreateForm(false)}
            onCreated={() => {
              setShowCreateForm(false);
              loadWorkspaces();
            }}
          />
        )}
      </div>
    </div>
  );
}

// --- Create Workspace Modal ---

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateWorkspaceModal({ onClose, onCreated }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>(WorkspaceType.PERSONAL);
  const [currency, setCurrency] = useState('USD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const body: CreateWorkspaceRequest = {
        name: name.trim(),
        type,
        baseCurrency: currency,
      };
      await api.post('/api/workspaces', body);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Create workspace</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="ws-name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="ws-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder="e.g. Household Budget"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="ws-type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="ws-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value={WorkspaceType.PERSONAL}>Personal</option>
              <option value={WorkspaceType.BUSINESS}>Business</option>
              <option value={WorkspaceType.COMPANY}>Company</option>
              <option value={WorkspaceType.SHARED}>Shared</option>
            </select>
          </div>

          <div>
            <label htmlFor="ws-currency" className="block text-sm font-medium text-gray-700">
              Base currency
            </label>
            <select
              id="ws-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="PLN">PLN - Polish Zloty</option>
              <option value="CZK">CZK - Czech Koruna</option>
              <option value="CHF">CHF - Swiss Franc</option>
              <option value="JPY">JPY - Japanese Yen</option>
              <option value="CAD">CAD - Canadian Dollar</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex flex-1 items-center justify-center rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
