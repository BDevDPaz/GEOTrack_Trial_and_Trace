import { now } from "../utils/timeProvider";
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { log } from '../utils/logger';
import { getDB } from '../database/db';
import { workTrackerEngine } from '../core/workTrackerEngine';

type WorkSession = any;

export const GEOFENCE_TASK = 'GEOFENCE_TRACKING_TASK';
export const EXIT_TIMESTAMP_KEY = 'LAST_GEOFENCE_EXIT_TIMESTAMP';

const ANTI_REBOUNCE_MS = 5000;
let lastProcessedEvent: {
    sessionId: number;
    type: Location.GeofencingEventType;
    timestamp: number;
} | null = null;

/**
 * GEOFENCE_TASK Handler
 * Implementa la estrategia de "Overwrite geofence strategy" (GEO-007)
 * para asegurar que solo la geocerca de la sesión actual genere eventos.
 */
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
  if (error) {
    log('ROJO', 'ERROR_CRITICO', 'ERROR', 'geofence event ignored: task error', error);
    return;
  }

  if (!data) {
    log('AMARILLO', 'UBICACION', 'WARN', 'geofence event insufficient metadata: missing data payload');
    return;
  }

  const { eventType, region } = data;

  if (!region || !region.identifier) {
    log('AMARILLO', 'UBICACION', 'WARN', 'geofence event insufficient metadata: missing region identifier');
    return;
  }

  const db = getDB();

  try {
    const session = await db.getFirstAsync<WorkSession>(
      "SELECT * FROM work_sessions WHERE status != 'completed' AND isDeleted = 0 ORDER BY id DESC LIMIT 1"
    );

    if (!session) {
      log('BLANCO', 'UBICACION', 'DEBUG', 'geofence event ignored: no active or pending session');
      return;
    }

    const expectedIdentifier = `SESSION_${session.id}`;
    if (region.identifier !== 'WORK_ZONE' && region.identifier !== expectedIdentifier) {
        log('AMARILLO', 'UBICACION', 'WARN', 'stale geofence ignored: region identifier mismatch', {
            received: region.identifier,
            expected: expectedIdentifier
        });
        return;
    }

    const currentTime = now();

    if (lastProcessedEvent &&
        lastProcessedEvent.sessionId === session.id &&
        lastProcessedEvent.type === eventType &&
        (currentTime - lastProcessedEvent.timestamp) < ANTI_REBOUNCE_MS) {
        return;
    }

    if (eventType === Location.GeofencingEventType.Enter) {
      // Record accuracy for GEO-006 compliance
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      log('NARANJA', 'EVENTO_GEOCERCA', 'EVENT', 'geofence enter detected', {
          sessionId: session.id,
          accuracy: loc.coords.accuracy
      });

      if (loc.coords.accuracy && loc.coords.accuracy > 100) {
          log('AMARILLO', 'UBICACION', 'WARN', 'low confidence GPS ignored', { accuracy: loc.coords.accuracy });
          return;
      }

      const canCheckIn = session.status === 'pending_arrival' || session.status === 'travel';

      if (canCheckIn) {
        lastProcessedEvent = { sessionId: session.id, type: eventType, timestamp: currentTime };
        await workTrackerEngine.dispatch({
            type: 'SESSION_AUTO_CHECKIN_GPS',
            sessionId: session.id,
            actualStartAtMs: currentTime
        });
      }
    }
    else if (eventType === Location.GeofencingEventType.Exit) {
      log('NARANJA', 'EVENTO_GEOCERCA', 'EVENT', 'geofence exit detected', { sessionId: session.id });

      const canExit = session.status === 'active';
      if (canExit) {
        lastProcessedEvent = { sessionId: session.id, type: eventType, timestamp: currentTime };
        await workTrackerEngine.dispatch({
            type: 'SESSION_EXIT_DETECTED',
            sessionId: session.id,
            exitTimestampMs: currentTime
        });
      }
    }
  } catch (err) {
    log('ROJO', 'ERROR_CRITICO', 'ERROR', 'persistence failure', err);
  }
});

export const LocationService = {
  requestPermissions: async () => {
    try {
        const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
        if (fgStatus !== 'granted') await Location.requestForegroundPermissionsAsync();
        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') await Location.requestBackgroundPermissionsAsync();
        return true;
    } catch {
        return false;
    }
  },

  startMonitoringArrival: async (lat: number, lng: number, radius: number = 200) => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) return false;

      // GPS Warm-up for GEO-005 compliance
      await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      await Location.startGeofencingAsync(GEOFENCE_TASK, [{
          identifier: 'WORK_ZONE',
          latitude: lat,
          longitude: lng,
          radius,
          notifyOnEnter: true,
          notifyOnExit: true,
      }]);
      log('VERDE', 'UBICACION', 'INFO', 'geofence monitoring started');
      return true;
    } catch {
      return false;
    }
  },

  stopMonitoring: async () => {
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});
    } catch {}
  },
};
