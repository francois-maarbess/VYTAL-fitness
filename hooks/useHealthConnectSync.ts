import { useEffect, useRef, useCallback } from 'react';
import { useUser } from '@/context/UserContext';
import { isHealthConnectAvailable, requestStepPermissions, getTodaySteps } from '@/lib/healthConnect';

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Auto-syncs daily step count from Health Connect to UserContext.
 * Falls back gracefully when Health Connect is unavailable (iOS, missing package).
 * The manual step override in nutrition.tsx still works — this just auto-fills
 * when the device supports it.
 */
export function useHealthConnectSync() {
  const { setStepsToday } = useUser();
  const synced = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncSteps = useCallback(async () => {
    if (!isHealthConnectAvailable()) return;
    try {
      const data = await getTodaySteps();
      if (data && data.steps > 0) {
        setStepsToday(data.steps);
        synced.current = true;
      }
    } catch {
      // Silently fail — manual input still works
    }
  }, [setStepsToday]);

  useEffect(() => {
    // Request permissions and do initial sync on mount
    (async () => {
      if (!isHealthConnectAvailable()) return;
      const granted = await requestStepPermissions();
      if (granted) {
        await syncSteps();
      }
    })();

    // Periodic sync
    intervalRef.current = setInterval(syncSteps, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [syncSteps]);
}
