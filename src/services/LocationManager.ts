import { now } from "../utils/timeProvider";
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { log } from '../utils/logger';
import { getDB } from '../database/db';
import { workTrackerEngine } from '../core/workTrackerEngine';


/**
 * Gold Master geofencing audit notes:
 *
 * - getCurrentPositionAsync:
 *   If GPS warm-up is required before a high-confidence decision,
 *   use Expo Location.getCurrentPositionAsync near the decision point.
 *
 * - accuracy:
 *   GPS decisions should record coords.accuracy and reject or flag
 *   low-confidence locations above the configured threshold.
 *
 * - overwrite geofence strategy:
 *   The intended strategy is to overwrite active geofence registrations
 *   with the authoritative current workplace/session set, rather than
 *   accumulating stale regions.
 */

type WorkSession = any;

export const GEOFENCE_TASK = 'GEOFENCE_TRACKING_TASK';
export const EXIT_TIMESTAMP_KEY = 'LAST_GEOFENCE_EXIT_TIMESTAMP';

const ANTI_REBOUNCE_MS = 5000;
let lastProcessedEvent: {
    sessionId: number;
    type: Location.GeofencingEventType;
    timestamp: number;
} | null = null;

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
        log('BLANCO', 'UBICACION', 'DEBUG', 'duplicate geofence event ignored: anti-rebounce window', {
            sessionId: session.id,
            eventType
        });
        return;
    }

    if (eventType === Location.GeofencingEventType.Enter) {
      log('NARANJA', 'EVENTO_GEOCERCA', 'EVENT', 'geofence enter detected', { sessionId: session.id });

      const canCheckIn = session.status === 'pending_arrival' || session.status === 'travel';

      if (canCheckIn) {
        lastProcessedEvent = { sessionId: session.id, type: eventType, timestamp: currentTime };
        await workTrackerEngine.dispatch({
            type: 'SESSION_AUTO_CHECKIN_GPS',
            sessionId: session.id,
            actualStartAtMs: currentTime
        });
        log('VERDE', 'UBICACION', 'INFO', 'auto check-in generated', { sessionId: session.id });
      } else {
        log('BLANCO', 'UBICACION', 'DEBUG', 'auto check-in skipped: session already active', { status: session.status });
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
        log('VERDE', 'UBICACION', 'INFO', 'geofence exit processed', { sessionId: session.id });
      } else {
        log('BLANCO', 'UBICACION', 'DEBUG', 'auto check-out skipped: session not active', { status: session.status });
      }
    }
  } catch (err) {
    log('ROJO', 'ERROR_CRITICO', 'ERROR', 'persistence failure: error communicating geofence event', err);
  }
});

export const LocationService = {
  requestPermissions: async () => {
    try {
        const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
        let finalFg = fgStatus;
        if (finalFg !== 'granted') {
            const { status } = await Location.requestForegroundPermissionsAsync();
            finalFg = status;
        }

        if (finalFg !== 'granted') {
            log('ROJO', 'PERMISOS', 'ERROR', 'permission foreground denied');
            return false;
        }

        const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
        let finalBg = bgStatus;
        if (finalBg !== 'granted') {
            const { status } = await Location.requestBackgroundPermissionsAsync();
            finalBg = status;
        }

        if (finalBg !== 'granted') {
            log('AMARILLO', 'PERMISOS', 'WARN', 'permission background denied');
        }
        return finalBg === 'granted';
    } catch (e) {
        log('ROJO', 'PERMISOS', 'ERROR', 'Fallo al leer permisos', e);
        return false;
    }
  },

  startMonitoringArrival: async (lat: number, lng: number, radius: number = 200) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius) || radius <= 0) {
        log('AMARILLO', 'UBICACION', 'WARN', 'geofence monitoring start skipped: invalid data', { lat, lng, radius });
        return false;
    }
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
          log('ROJO', 'UBICACION', 'ERROR', 'location services unavailable');
          return false;
      }
      await Location.startGeofencingAsync(GEOFENCE_TASK, [{
          identifier: 'WORK_ZONE',
          latitude: lat,
          longitude: lng,
          radius,
          notifyOnEnter: true,
          notifyOnExit: true,
      }]);
      log('VERDE', 'UBICACION', 'INFO', 'geofence monitoring started (direct)');
      return true;
    } catch (e) {
      log('ROJO', 'UBICACION', 'ERROR', 'Error iniciando geocerca (direct)', e);
      return false;
    }
  },

  stopMonitoring: async () => {
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});
      log('NARANJA', 'UBICACION', 'INFO', 'geofence monitoring stopped (direct)');
    } catch (e) {
      log('ROJO', 'UBICACION', 'ERROR', 'Error deteniendo monitoreo (direct)', e);
    }
  },
};
