import { now } from "../utils/timeProvider";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { log } from "../utils/logger";
import { getDB } from "../database/db";
import { workTrackerEngine } from "../core/workTrackerEngine";
import {
  MAX_ACCEPTABLE_ACCURACY_METERS,
  MAX_ENTRY_SPEED_KMH,
  MAX_EXIT_SPEED_KMH,
  REQUIRED_ENTRY_DWELL_TIME_MS,
  REQUIRED_EXIT_DWELL_TIME_MS,
  GEOFENCE_ANTI_REBOUNCE_MS as ANTI_REBOUNCE_MS
} from "../constants/geolocation";
import { getDistanceFromLatLonInMeters } from "../utils/geoUtils";

type WorkSession = any;

export const GEOFENCE_TASK = "GEOFENCE_TRACKING_TASK";
export const EXIT_TIMESTAMP_KEY = "LAST_GEOFENCE_EXIT_TIMESTAMP";

let lastProcessedEvent: {
  sessionId: number;
  type: Location.GeofencingEventType;
  timestamp: number;
} | null = null;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/**
 * GEOFENCE_TASK Handler
 * Implementa la estrategia de robustez para el Motor de Geolocalización.
 */
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
  if (error) {
    log("ROJO", "ERROR_CRITICO", "ERROR", "geofence event ignored: task error", error);
    return;
  }

  if (!data) {
    log("AMARILLO", "UBICACION", "WARN", "geofence event insufficient metadata: missing data payload");
    return;
  }

  const { eventType, region } = data;

  if (!region || !region.identifier) {
    log("AMARILLO", "UBICACION", "WARN", "geofence event insufficient metadata: missing region identifier");
    return;
  }

  const db = getDB();

  try {
    const session = await db.getFirstAsync<WorkSession>(
      "SELECT * FROM work_sessions WHERE status != 'CLOSED' AND isDeleted = 0 ORDER BY id DESC LIMIT 1"
    );

    if (!session) {
      log("BLANCO", "UBICACION", "DEBUG", "geofence event ignored: no active or pending session");
      return;
    }

    const expectedIdentifier = `SESSION_${session.id}`;
    if (region.identifier !== "WORK_ZONE" && region.identifier !== expectedIdentifier) {
      log("AMARILLO", "UBICACION", "WARN", "stale geofence ignored: region identifier mismatch", {
        received: region.identifier,
        expected: expectedIdentifier,
      });
      return;
    }

    const currentTime = now();

    if (
      lastProcessedEvent &&
      lastProcessedEvent.sessionId === session.id &&
      lastProcessedEvent.type === eventType &&
      currentTime - lastProcessedEvent.timestamp < ANTI_REBOUNCE_MS
    ) {
      return;
    }

    // Capa de obtención y filtrado de ubicación
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude, accuracy, speed } = loc.coords;
    const speedKmh = speed ? speed * 3.6 : 0;

    const auditBase = {
      lat: latitude,
      lon: longitude,
      accuracy,
      speed: speedKmh,
      timestamp: loc.timestamp,
      trigger_source: "GEOFENCE_TASK",
    };

    if (accuracy && accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
      log("AMARILLO", "UBICACION", "WARN", "GEOFENCE_LOCATION_REJECTED", {
        ...auditBase,
        reason: "accuracy_above_threshold",
      });
      return;
    }

    if (eventType === Location.GeofencingEventType.Enter) {
      if (speedKmh > MAX_ENTRY_SPEED_KMH) {
        log("AMARILLO", "UBICACION", "WARN", "GEOFENCE_LOCATION_REJECTED", {
          ...auditBase,
          reason: "speed_above_threshold",
        });
        return;
      }

      log("AZUL", "UBICACION", "INFO", "VALID_GEOFENCE_LOCATION", {
        ...auditBase,
        reason: "accuracy_and_speed_valid",
      });

      // Dwell Time Validator
      await delay(REQUIRED_ENTRY_DWELL_TIME_MS);
      const loc2 = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const dist = getDistanceFromLatLonInMeters(
        loc2.coords.latitude,
        loc2.coords.longitude,
        region.latitude,
        region.longitude
      );

      if (dist > region.radius) {
        log("AMARILLO", "UBICACION", "WARN", "GEOFENCE_LOCATION_REJECTED", {
          event: "ENTRY_CANCELLED",
          reason: "dwell_time_not_met",
          distance: dist,
          radius: region.radius,
        });
        return;
      }

      const canCheckIn = session.status === "GEOFENCECREATED" || session.status === "TRAVEL";
      if (canCheckIn) {
        lastProcessedEvent = {
          sessionId: session.id,
          type: eventType,
          timestamp: now(),
        };
        await workTrackerEngine.dispatch({
          type: "SESSION_AUTO_CHECKIN_GPS",
          sessionId: session.id,
          actualStartAtMs: now(),
        });
      }
    } else if (eventType === Location.GeofencingEventType.Exit) {
      if (speedKmh > MAX_EXIT_SPEED_KMH) {
         log("AMARILLO", "UBICACION", "WARN", "GEOFENCE_LOCATION_REJECTED", {
          ...auditBase,
          reason: "speed_above_threshold",
        });
        // Aún así, un EXIT rápido es sospechoso pero usualmente se procesa por seguridad,
        // pero siguiendo la propuesta lo rechazamos si supera el umbral.
        return;
      }

      log("AZUL", "UBICACION", "INFO", "VALID_GEOFENCE_LOCATION", {
        ...auditBase,
        reason: "accuracy_and_speed_valid",
      });

      // Dwell Time Validator para Exit
      await delay(REQUIRED_EXIT_DWELL_TIME_MS);
      const loc2 = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const dist = getDistanceFromLatLonInMeters(
        loc2.coords.latitude,
        loc2.coords.longitude,
        region.latitude,
        region.longitude
      );

      if (dist <= region.radius) {
        log("AMARILLO", "UBICACION", "WARN", "GEOFENCE_LOCATION_REJECTED", {
          event: "EXIT_CANCELLED",
          reason: "dwell_time_not_met",
          distance: dist,
          radius: region.radius,
        });
        return;
      }

      const canExit = session.status === "ACTIVEWORK";
      if (canExit) {
        lastProcessedEvent = {
          sessionId: session.id,
          type: eventType,
          timestamp: now(),
        };
        await workTrackerEngine.dispatch({
          type: "SESSION_EXIT_DETECTED",
          sessionId: session.id,
          exitTimestampMs: now(),
        });
      }
    }
  } catch (err) {
    log("ROJO", "ERROR_CRITICO", "ERROR", "persistence failure", err);
  }
});

export const LocationService = {
  requestPermissions: async () => {
    try {
      const { status: fgStatus } = await Location.getForegroundPermissionsAsync();
      if (fgStatus !== "granted") await Location.requestForegroundPermissionsAsync();
      const { status: bgStatus } = await Location.getBackgroundPermissionsAsync();
      if (bgStatus !== "granted") await Location.requestBackgroundPermissionsAsync();
      return true;
    } catch {
      return false;
    }
  },

  startMonitoringArrival: async (lat: number, lng: number, radius: number = 200) => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) return false;

      // Overwrite strategy: ensure any previous geofence is stopped
      await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});

      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await Location.startGeofencingAsync(GEOFENCE_TASK, [
        {
          identifier: "WORK_ZONE",
          latitude: lat,
          longitude: lng,
          radius,
          notifyOnEnter: true,
          notifyOnExit: true,
        },
      ]);
      log("VERDE", "UBICACION", "INFO", "geofence monitoring started");
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
