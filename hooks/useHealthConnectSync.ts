import { useEffect, useRef, useCallback } from 'react';
import { useUserStore } from '@/stores/userStore';
import { isHealthConnectAvailable, requestStepPermissions, getTodaySteps } from '@/lib/healthConnect';

const SYNC_INTERVAL_MS = 10 * 60 * 1000;

export function useHealthConnectSync() {
  const setStepsToday = useUserStore((s) => s.setStepsToday);
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
    (async () => {
      if (!isHealthConnectAvailable()) return;
      const granted = await requestStepPermissions();
      if (granted) {
        await syncSteps();
      }
    })();

    intervalRef.current = setInterval(syncSteps, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [syncSteps]);
}
