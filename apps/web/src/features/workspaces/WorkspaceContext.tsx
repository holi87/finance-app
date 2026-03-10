import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { WorkspaceWithRole } from '@budget-tracker/shared-types';
import { api } from '@/services/api';

interface WorkspaceState {
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole | null;
  isLoading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

const ACTIVE_WORKSPACE_KEY = 'bt_active_workspace_id';

export function useWorkspace(): WorkspaceState {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<WorkspaceWithRole[]>('/api/workspaces');
      setWorkspaces(data);

      // Restore active workspace from localStorage or pick first
      const storedId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const restored = data.find((w) => w.id === storedId);
      if (restored) {
        setActiveWorkspace(restored);
      } else if (data.length > 0) {
        setActiveWorkspace(data[0]!);
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, data[0]!.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshWorkspaces();
  }, [refreshWorkspaces]);

  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      const workspace = workspaces.find((w) => w.id === workspaceId);
      if (workspace) {
        setActiveWorkspace(workspace);
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
      }
    },
    [workspaces],
  );

  const value: WorkspaceState = {
    workspaces,
    activeWorkspace,
    isLoading,
    error,
    switchWorkspace,
    refreshWorkspaces,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
