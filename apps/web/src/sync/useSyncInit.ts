import { useEffect, useRef } from 'react';
import { initSyncTriggers, syncWorkspace } from './sync-orchestrator';

/**
 * Hook that initializes sync triggers and kicks off a sync when the active workspace changes.
 * Should be used once at the app layout level.
 */
export function useSyncInit(activeWorkspaceId: string | null) {
  const workspaceRef = useRef<string | null>(null);
  const initialized = useRef(false);

  // Keep ref in sync for the trigger callback
  workspaceRef.current = activeWorkspaceId;

  // Initialize sync triggers once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initSyncTriggers(() => workspaceRef.current);
  }, []);

  // Sync when workspace changes
  useEffect(() => {
    if (activeWorkspaceId && navigator.onLine) {
      syncWorkspace(activeWorkspaceId).catch(console.warn);
    }
  }, [activeWorkspaceId]);
}
