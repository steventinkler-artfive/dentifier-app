import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { addToOutbox } from '@/lib/offline';

/**
 * Returns a `mutate` function that tries the SDK call first.
 * If offline (or network timeout), queues the payload in IndexedDB outbox.
 *
 * Usage:
 *   const { mutate } = useOfflineMutation();
 *   const result = await mutate({
 *     method: 'create',           // 'create' | 'update'
 *     entityName: 'Assessment',
 *     data: { ... },
 *     id: 'abc123',               // required for 'update'
 *     onSuccess: (result) => {},  // called when online save succeeds
 *     onQueued: () => {},         // called when saved to outbox
 *     onError: (err) => {},       // called on non-network error
 *   });
 */
export function useOfflineMutation() {
  const mutate = useCallback(async ({ method, entityName, data, id, onSuccess, onQueued, onError }) => {
    const isOffline = !navigator.onLine;

    if (!isOffline) {
      try {
        let result;
        if (method === 'create') {
          result = await base44.entities[entityName].create(data);
        } else if (method === 'update') {
          result = await base44.entities[entityName].update(id, data);
        }
        if (onSuccess) onSuccess(result);
        return { success: true, result, queued: false };
      } catch (err) {
        // If it's a network-type error, fall through to queue
        const isNetworkError = !navigator.onLine ||
          err?.message?.toLowerCase().includes('network') ||
          err?.message?.toLowerCase().includes('fetch') ||
          err?.message?.toLowerCase().includes('timeout') ||
          err?.name === 'TypeError';

        if (!isNetworkError) {
          if (onError) onError(err);
          return { success: false, error: err, queued: false };
        }
        // Fall through to outbox
      }
    }

    // Queue in IndexedDB outbox
    await addToOutbox({ method, entityName, data, id });
    if (onQueued) onQueued();
    return { success: false, queued: true };
  }, []);

  return { mutate };
}