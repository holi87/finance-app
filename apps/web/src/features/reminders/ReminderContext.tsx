import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { useWorkspace } from '@/features/workspaces/WorkspaceContext';

interface ReminderItem {
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

interface ReminderContextValue {
  pendingReminders: ReminderItem[];
  isLoading: boolean;
  executeReminder: (reminderId: string) => Promise<void>;
  dismissReminder: (reminderId: string) => Promise<void>;
  refresh: () => void;
}

const ReminderContext = createContext<ReminderContextValue | null>(null);

const POLL_INTERVAL = 60_000; // 60 seconds

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useWorkspace();
  const [pendingReminders, setPendingReminders] = useState<ReminderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const workspaceIdRef = useRef(activeWorkspace?.id);
  workspaceIdRef.current = activeWorkspace?.id;

  const fetchPending = useCallback(async () => {
    const wsId = workspaceIdRef.current;
    if (!wsId) {
      setPendingReminders([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.get<ReminderItem[]>(
        `/api/workspaces/${wsId}/reminders/pending`,
      );
      // Only update if workspace hasn't changed during fetch
      if (workspaceIdRef.current === wsId) {
        setPendingReminders(data);
      }
    } catch {
      // Silently fail — reminders are non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on workspace change
  useEffect(() => {
    fetchPending();
  }, [activeWorkspace?.id, fetchPending]);

  // Poll every 60s
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    const interval = setInterval(fetchPending, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [activeWorkspace?.id, fetchPending]);

  const executeReminder = useCallback(async (reminderId: string) => {
    const wsId = workspaceIdRef.current;
    if (!wsId) return;
    await api.post(`/api/workspaces/${wsId}/reminders/${reminderId}/execute`, {});
    setPendingReminders((prev) => prev.filter((r) => r.id !== reminderId));
  }, []);

  const dismissReminder = useCallback(async (reminderId: string) => {
    const wsId = workspaceIdRef.current;
    if (!wsId) return;
    await api.post(`/api/workspaces/${wsId}/reminders/${reminderId}/dismiss`, {});
    setPendingReminders((prev) => prev.filter((r) => r.id !== reminderId));
  }, []);

  return (
    <ReminderContext.Provider
      value={{ pendingReminders, isLoading, executeReminder, dismissReminder, refresh: fetchPending }}
    >
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders() {
  const ctx = useContext(ReminderContext);
  if (!ctx) throw new Error('useReminders must be used within ReminderProvider');
  return ctx;
}
