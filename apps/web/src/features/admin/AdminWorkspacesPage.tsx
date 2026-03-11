import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useTranslation } from '@/i18n/I18nContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  type: string;
  baseCurrency: string;
  ownerId: string;
  archivedAt: string | null;
  createdAt: string;
  _count?: { memberships: number };
  memberCount?: number;
}

interface WorkspacesResponse {
  items: AdminWorkspace[];
  total: number;
  page: number;
  pageSize: number;
}

interface WorkspaceMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

interface SimpleUser {
  id: string;
  email: string;
  displayName: string;
}

export function AdminWorkspacesPage() {
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<AdminWorkspace | null>(null);

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<WorkspacesResponse>('/api/admin/workspaces', {
        page,
        pageSize: 20,
      });
      setWorkspaces(data.items);
      setTotal(data.total);
    } catch {
      setError(t.admin.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }, [page, t.admin.loadFailed]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{t.admin.workspacesTitle}</h2>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          {t.workspaces.noWorkspaces}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 font-medium text-gray-500">{t.common.name}</th>
                    <th className="px-4 py-3 font-medium text-gray-500">{t.common.type}</th>
                    <th className="px-4 py-3 font-medium text-gray-500">{t.common.currency}</th>
                    <th className="px-4 py-3 font-medium text-gray-500">{t.admin.members}</th>
                    <th className="px-4 py-3 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((ws) => (
                    <tr key={ws.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-900">{ws.name}</td>
                      <td className="px-4 py-3 capitalize text-gray-600">{ws.type}</td>
                      <td className="px-4 py-3 text-gray-600">{ws.baseCurrency}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {ws._count?.memberships ?? ws.memberCount ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedWorkspace(ws)}
                          className="text-sm font-medium text-blue-500 hover:text-blue-600"
                        >
                          {t.admin.members}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                ←
              </button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                →
              </button>
            </div>
          )}
        </>
      )}

      {/* Members panel */}
      {selectedWorkspace && (
        <MembersPanel
          workspace={selectedWorkspace}
          onClose={() => setSelectedWorkspace(null)}
        />
      )}
    </div>
  );
}

// --- Members Panel ---

function MembersPanel({
  workspace,
  onClose,
}: {
  workspace: AdminWorkspace;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<WorkspaceMember[]>(
        `/api/admin/workspaces/${workspace.id}/members`,
      );
      setMembers(data);
    } catch {
      setError(t.admin.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }, [workspace.id, t.admin.loadFailed]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleRoleChange(membershipId: string, role: string) {
    try {
      await api.patch(`/api/admin/workspaces/members/${membershipId}`, { role });
      loadMembers();
    } catch {
      setError(t.admin.saveFailed);
    }
  }

  async function handleRemoveMember(membershipId: string) {
    try {
      await api.delete(`/api/admin/workspaces/members/${membershipId}`);
      loadMembers();
    } catch {
      setError(t.admin.saveFailed);
    }
  }

  async function handleAddMember(userId: string, role: string) {
    try {
      await api.post(`/api/admin/workspaces/${workspace.id}/members`, { userId, role });
      setShowAddModal(false);
      loadMembers();
    } catch {
      throw new Error(t.admin.saveFailed);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {workspace.name} — {t.admin.members}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            {members.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">{t.admin.noMembers}</p>
            ) : (
              <div className="mb-4 max-h-80 space-y-2 overflow-y-auto">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {m.user.displayName}
                      </p>
                      <p className="truncate text-xs text-gray-500">{m.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                      >
                        <option value="owner">{t.admin.roleOwner}</option>
                        <option value="editor">{t.admin.roleEditor}</option>
                        <option value="viewer">{t.admin.roleViewer}</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600"
            >
              {t.admin.addMember}
            </button>
          </>
        )}

        {showAddModal && (
          <AddMemberModal
            workspaceId={workspace.id}
            existingMemberIds={members.map((m) => m.userId)}
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddMember}
          />
        )}
      </div>
    </div>
  );
}

// --- Add Member Modal ---

function AddMemberModal({
  workspaceId: _workspaceId,
  existingMemberIds,
  onClose,
  onSubmit,
}: {
  workspaceId: string;
  existingMemberIds: string[];
  onClose: () => void;
  onSubmit: (userId: string, role: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [allUsers, setAllUsers] = useState<SimpleUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState('editor');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    async function loadAllUsers() {
      try {
        const data = await api.get<{ items: SimpleUser[] }>('/api/admin/users', {
          pageSize: 200,
        });
        // Filter out users who are already members
        const available = data.items.filter((u) => !existingMemberIds.includes(u.id));
        setAllUsers(available);
        const first = available[0];
        if (first) setSelectedUserId(first.id);
      } catch {
        setError(t.admin.loadFailed);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    loadAllUsers();
  }, [existingMemberIds, t.admin.loadFailed]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSubmit(selectedUserId, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.admin.saveFailed);
    } finally {
      setIsSaving(false);
    }
  }

  // Suppress unused variable lint — workspaceId is used as a key prop indirectly
  void _workspaceId;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h4 className="mb-4 text-base font-semibold text-gray-900">{t.admin.addMember}</h4>
        {isLoadingUsers ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : allUsers.length === 0 ? (
          <p className="text-sm text-gray-500">{t.admin.noUsers}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.admin.selectUser}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t.admin.role}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="owner">{t.admin.roleOwner}</option>
                <option value="editor">{t.admin.roleEditor}</option>
                <option value="viewer">{t.admin.roleViewer}</option>
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {isSaving ? t.common.loading : t.admin.addMember}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
