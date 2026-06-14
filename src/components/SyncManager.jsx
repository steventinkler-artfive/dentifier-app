import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { getAllFromOutbox, removeFromOutbox, markOutboxItemFailed } from '@/lib/offline';
import toast from 'react-hot-toast';

/**
 * SyncManager — drop this anywhere inside the authenticated app tree.
 * Listens for the 'online' event, checks auth, then flushes the outbox.
 */
export default function SyncManager() {
  const isSyncing = useRef(false);

  const flushOutbox = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      // 1. Check authentication before attempting sync
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        toast.error('Session expired — please log back in to sync your saved data.', { duration: 6000 });
        isSyncing.current = false;
        return;
      }

      // 2. Get all pending items
      const items = await getAllFromOutbox();
      const pending = items.filter(item => item.status === 'pending');

      if (pending.length === 0) {
        isSyncing.current = false;
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;

      // 3. Replay each item in chronological order
      for (const item of pending) {
        try {
          if (item.method === 'create') {
            await base44.entities[item.entityName].create(item.data);
          } else if (item.method === 'update') {
            await base44.entities[item.entityName].update(item.id, item.data);
          }
          await removeFromOutbox(item.key);
          syncedCount++;
        } catch (err) {
          // Non-network error — mark as failed, do not remove
          await markOutboxItemFailed(item.key);
          failedCount++;
          console.error(`Failed to sync outbox item ${item.key}:`, err);
        }
      }

      if (syncedCount > 0 && failedCount === 0) {
        toast.success(`Back online — your ${syncedCount > 1 ? 'quotes have' : 'quote has'} synced.`);
      } else if (syncedCount > 0 && failedCount > 0) {
        toast.success(`${syncedCount} item${syncedCount > 1 ? 's' : ''} synced.`);
        toast.error(`${failedCount} item${failedCount > 1 ? 's' : ''} failed to sync — please try again.`);
      } else if (failedCount > 0) {
        toast.error(`${failedCount} item${failedCount > 1 ? 's' : ''} failed to sync — please try again.`);
      }
    } finally {
      isSyncing.current = false;
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      flushOutbox();
    };

    window.addEventListener('online', handleOnline);

    // Also attempt flush on mount in case items were queued and app was reopened with connectivity
    if (navigator.onLine) {
      flushOutbox();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return null;
}