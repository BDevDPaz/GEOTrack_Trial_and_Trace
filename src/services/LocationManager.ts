import { now } from "../utils/timeProvider";
// --- src/services/LocationManager.ts ---
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { log } from '../utils/logger';
import { getDB } from '../database/db';
import { workTrackerEngine } from '../core/workTrackerEngine';

// types removed
type WorkSession = any;

export const GEOFENCE_TASK = 'GEOFENCE_TRACKING_TASK';
export const EXIT_TIMESTAMP_KEY = 'LAST_GEOFENCE_EXIT_TIMESTAMP';

/**
 * TAREA DE FONDO: GEOFENCE
 * Se comunica exclusivamente con el engine para notificar eventos detectados.
 * No realiza escrituras directas a DB ni envía notificaciones.
 */
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
  if (error) {
    log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error en callback de Geocerca', error);
    return;
  }

  const { eventType } = data;
  const db = getDB();

  try {
    const session = await db.getFirstAsync<WorkSession>(
      "SELECT * FROM work_sessions ORDER BY id DESC LIMIT 1"
    );

    if (!session) return;

    // 🟦 ENTRADA (AUTO CHECK-IN)
    if (eventType === Location.GeofencingEventType.Enter) {
      log('NARANJA', 'EVENTO_GEOCERCA', 'EVENT', 'Geocerca: ENTRADA detectada. Notificando al engine...');

      if (session.status === 'pending_arrival' || session.status === 'travel') {
        const currentTime = now();

        await workTrackerEngine.dispatch({
            type: 'SESSION_AUTO_CHECKIN_GPS',
            sessionId: session.id,
            actualStartAtMs: currentTime
        });
      }
    }

    // 🟥 SALIDA (Inicia el cronómetro en el core)
    else if (eventType === Location.GeofencingEventType.Exit) {
      log(
        'NARANJA',
        'EVENTO_GEOCERCA',
        'EVENT',
        'Geocerca: SALIDA detectada. Notificando al engine...'
      );

      if (session.status === 'active') {
        const currentTime = now();

        await workTrackerEngine.dispatch({
            type: 'SESSION_EXIT_DETECTED',
            sessionId: session.id,
            exitTimestampMs: currentTime
        });
      }
    }
  } catch (err) {
    log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error comunicando evento de Geocerca al engine', err);
  }
});

export const LocationService = {
  requestPermissions: async () => {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') return false;

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    return bgStatus === 'granted';
  },

  startMonitoringArrival: async (
    lat: number,
    lng: number,
    radius: number = 200
  ) => {
    try {
      await Location.startGeofencingAsync(GEOFENCE_TASK, [
        {
          identifier: 'WORK_ZONE',
          latitude: lat,
          longitude: lng,
          radius,
          notifyOnEnter: true,
          notifyOnExit: true,
        },
      ]);

      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch((err) => {
        log('AMARILLO', 'UBICACION', 'WARN', 'GPS Warm-up falló (silencioso)', err);
      });

      log(
        'VERDE',
        'SERVICIOS_ACTIVOS',
        'INFO',
        `Monitoreando llegada al sitio de trabajo (Radio: ${radius}m)`
      );

      return true;
    } catch (e) {
      log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error iniciando geocerca', e);
      return false;
    }
  },

  stopMonitoring: async () => {
    try {
      await Promise.all([
        Location.stopGeofencingAsync(GEOFENCE_TASK).catch((err) => {
           log('AMARILLO', 'UBICACION', 'WARN', 'Fallo al detener Geofencing (ya detenido?)', err);
        }),
        Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch((err) => {
           log('AMARILLO', 'UBICACION', 'WARN', 'Fallo al detener Location Updates', err);
        }),
      ]);

      log('ROJO', 'MONITOREO_DETENIDO', 'ERROR', 'Monitoreo y rastreo detenidos.');
    } catch (e) {
      log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error general deteniendo monitoreo', e);
    }
  },
};
