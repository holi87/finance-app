import { useState, useEffect } from 'react';

type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

export function SyncBadge() {
  const [status, setStatus] = useState<SyncStatus>(navigator.onLine ? 'online' : 'offline');

  useEffect(() => {
    function handleOnline() {
      setStatus('online');
    }
    function handleOffline() {
      setStatus('offline');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const config = {
    online: {
      dotColor: 'bg-green-500',
      label: 'Online',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50 border-green-200',
    },
    offline: {
      dotColor: 'bg-gray-400',
      label: 'Offline',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50 border-gray-200',
    },
    syncing: {
      dotColor: 'bg-blue-500 animate-pulse',
      label: 'Syncing...',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    error: {
      dotColor: 'bg-red-500',
      label: 'Sync error',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50 border-red-200',
    },
  };

  const current = config[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${current.bgColor} ${current.textColor}`}
      role="status"
      aria-label={`Sync status: ${current.label}`}
    >
      <span className={`h-2 w-2 rounded-full ${current.dotColor}`} />
      {current.label}
    </div>
  );
}
