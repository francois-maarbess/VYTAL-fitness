import { Platform } from 'react-native';

/**
 * Health Connect integration for automatic step count syncing.
 * 
 * SETUP REQUIRED:
 * 1. Install: npx expo install react-native-health-connect
 * 2. Add to app.json under "expo.plugins":
 *    ["react-native-health-connect", { "photosPermission": "Allow VYTAL to read your activity data." }]
 * 3. For Android: ensure minSdkVersion >= 26 in build.gradle
 * 
 * On iOS or when Health Connect is unavailable, this module falls back gracefully
 * and returns null — the app will use manual step input instead.
 */

// Graceful import — module may not be installed yet
let HealthConnect: any = null;
try {
  HealthConnect = require('react-native-health-connect');
} catch {
  // Module not installed — will use manual fallback
}

export interface StepData {
  steps: number;
  date: string; // YYYY-MM-DD
  source: string;
}

/**
 * Check if Health Connect is available on this device.
 */
export function isHealthConnectAvailable(): boolean {
  if (Platform.OS !== 'android') return false;
  if (!HealthConnect) return false;
  try {
    return HealthConnect.isAvailable?.() ?? false;
  } catch {
    return false;
  }
}

/**
 * Request permissions to read step count data.
 */
export async function requestStepPermissions(): Promise<boolean> {
  if (!isHealthConnectAvailable()) return false;
  try {
    const result = await HealthConnect.requestPermission([
      { recordType: 'Steps', accessType: 'read' },
    ]);
    return result?.granted ?? false;
  } catch {
    return false;
  }
}

/**
 * Read today's step count from Health Connect.
 * Returns null if unavailable or on error.
 */
export async function getTodaySteps(): Promise<StepData | null> {
  if (!isHealthConnectAvailable()) return null;
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const result = await HealthConnect.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: endOfDay.toISOString(),
      },
    });

    let totalSteps = 0;
    let sourceName = 'Health Connect';

    if (result?.records) {
      for (const record of result.records) {
        totalSteps += record.count ?? 0;
        if (record.metadata?.dataOrigin?.packageName) {
          sourceName = record.metadata.dataOrigin.packageName;
        }
      }
    }

    const dateStr = now.toISOString().slice(0, 10);
    return { steps: totalSteps, date: dateStr, source: sourceName };
  } catch {
    return null;
  }
}

/**
 * Read step count for a specific date (used for history).
 */
export async function getStepsForDate(dateStr: string): Promise<StepData | null> {
  if (!isHealthConnectAvailable()) return null;
  try {
    const start = new Date(`${dateStr}T00:00:00`);
    const end = new Date(`${dateStr}T23:59:59`);

    const result = await HealthConnect.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });

    let totalSteps = 0;
    if (result?.records) {
      for (const record of result.records) {
        totalSteps += record.count ?? 0;
      }
    }

    return { steps: totalSteps, date: dateStr, source: 'Health Connect' };
  } catch {
    return null;
  }
}
