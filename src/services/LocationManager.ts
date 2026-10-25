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
  GEOFENCE_ANTI_REBOUNCE_MS as ANTI_REBOUNCE_MS,
  IMPOSSIBLE_SPEED_KMH,
  MAX_INSTANT_LOCATION_JUMP_METERS,
  EXIT_CONFIRM_DEFAULT_READINGS,
  EXIT_CONFIRM_FAST_SPACING_MS,
  PENDING_EXIT_MAX_AGE_MS,
  PRESENCE_HYSTERESIS_METERS,
} from "../constants/geolocation";
import { confirmExit } from "./exitConfirmation";
import {
  savePendingExit,
  clearPendingExit,
  resolvePendingExit,
  PendingExit,
  PendingExitOutcome,
} from "./pendingExit";
import { getDistanceFromLatLonInMeters } from "../utils/geoUtils";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { locationAdapter } from "../core/runtime/locationAdapter";

type WorkSession = any;
type ValidationStatus = "VALID" | "INVALID" | "SUSPICIOUS";

interface ValidationResult {
  status: ValidationStatus;
  reason: string;
  metadata?: any;
}

export const GEOFENCE_TASK = "GEOFENCE_TRACKING_TASK";
export const EXIT_TIMESTAMP_KEY = "LAST_GEOFENCE_EXIT_TIMESTAMP";
const LAST_LOC_KEY = "LAST_VALID_LOCATION";

let lastProcessedEvent: {
  sessionId: number;
  type: Location.GeofencingEventType;
  timestamp: number;
} | null = null;

const delay = (ms: number) =>
  new Promise<void>((res) => setTimeout(res, ms));

/**
 * Validador de Eventos Geográficos
 */
async function validateGeofenceEvent(
  eventType: Location.GeofencingEventType,
  region: any,
  session: WorkSession,
  loc: Location.LocationObject,
): Promise<ValidationResult> {
  const { accuracy, speed, latitude, longitude } = loc.coords;
  const speedKmh = speed ? speed * 3.6 : 0;

  // 1. Validador de Precisión
  if (accuracy && accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
    return {
      status: "INVALID",
      reason: "INVALID_ACCURACY",
      metadata: { accuracy },
    };
  }

  // 2. Validador de Coherencia Espacial / Anti-Spoof
  const lastLocStr = await AsyncStorage.getItem(LAST_LOC_KEY);
  if (lastLocStr) {
    const lastLoc = JSON.parse(lastLocStr);
    const distFromLast = getDistanceFromLatLonInMeters(
      latitude,
      longitude,
      lastLoc.latitude,
      lastLoc.longitude,
    );
    if (distFromLast > MAX_INSTANT_LOCATION_JUMP_METERS) {
      return {
        status: "SUSPICIOUS",
        reason: "LOCATION_JUMP_DETECTED",
        metadata: { jump: distFromLast },
      };
    }
  }

  if (speedKmh > IMPOSSIBLE_SPEED_KMH) {
    return {
      status: "INVALID",
      reason: "IMPOSSIBLE_SPEED",
      metadata: { speed: speedKmh },
    };
  }

  // 3. Validador de Estado Actual
  if (eventType === Location.GeofencingEventType.Enter) {
    if (session.status !== "GEOFENCE_CREATED" && session.status !== "TRAVEL") {
      return {
        status: "INVALID",
        reason: "INVALID_STATE_FOR_ENTRY",
        metadata: { state: session.status },
      };
    }
    if (speedKmh > MAX_ENTRY_SPEED_KMH) {
      return {
        status: "INVALID",
        reason: "INVALID_SPEED",
        metadata: { speed: speedKmh },
      };
    }
  } else if (eventType === Location.GeofencingEventType.Exit) {
    if (session.status !== "ACTIVE_WORK") {
      return {
        status: "INVALID",
        reason: "INVALID_STATE_FOR_EXIT",
        metadata: { state: session.status },
      };
    }
    if (speedKmh > MAX_EXIT_SPEED_KMH) {
      return {
        status: "SUSPICIOUS",
        reason: "INVALID_SPEED",
        metadata: { speed: speedKmh },
      };
    }
  }

  // 4. Validador de Dwell Time
  const dwellTimeRequired =
    eventType === Location.GeofencingEventType.Enter
      ? REQUIRED_ENTRY_DWELL_TIME_MS
      : REQUIRED_EXIT_DWELL_TIME_MS;
  await delay(dwellTimeRequired);

  const locConfirm = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  const distConfirm = getDistanceFromLatLonInMeters(
    locConfirm.coords.latitude,
    locConfirm.coords.longitude,
    region.latitude,
    region.longitude,
  );

  if (
    eventType === Location.GeofencingEventType.Enter &&
    distConfirm > region.radius
  ) {
    return {
      status: "INVALID",
      reason: "DWELL_TIME_NOT_MET",
      metadata: { distance: distConfirm, radius: region.radius },
    };
  }
  if (
    eventType === Location.GeofencingEventType.Exit &&
    distConfirm <= region.radius
  ) {
    return {
      status: "INVALID",
      reason: "DWELL_TIME_NOT_MET",
      metadata: { distance: distConfirm, radius: region.radius },
    };
  }

  return { status: "VALID", reason: "ALL_VALIDATORS_PASSED" };
}

async function readExitConfirmReadings(db: any): Promise<number> {
  try {
    const row = await db.getFirstAsync(
      "SELECT exit_confirm_readings FROM settings WHERE id = 1",
    );
    const n = Number(row?.exit_confirm_readings);
    return Number.isFinite(n) && n >= 1 ? Math.min(10, Math.floor(n)) : EXIT_CONFIRM_DEFAULT_READINGS;
  } catch {
    return EXIT_CONFIRM_DEFAULT_READINGS;
  }
}

/**
 * GEOFENCE_TASK Handler
 */
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }: any) => {
  if (error) {
    log(
      "ROJO",
      "ERROR_CRITICO",
      "ERROR",
      "geofence event ignored: task error",
      error,
    );
    return;
  }

  if (!data) return;
  const { eventType, region } = data;
  if (!region?.identifier) return;

  const db = getDB();

  try {
    const session = await db.getFirstAsync<WorkSession>(
      "SELECT * FROM work_sessions WHERE status != 'CLOSED' ORDER BY id DESC LIMIT 1",
    );

    if (!session) {
      log(
        "BLANCO",
        "UBICACION",
        "DEBUG",
        "geofence event ignored: no active or pending session",
      );
      return;
    }

    const expectedIdentifier = `SESSION_${session.id}`;
    if (
      region.identifier !== "WORK_ZONE" &&
      region.identifier !== expectedIdentifier
    ) {
      log("AMARILLO", "UBICACION", "WARN", "GEOFENCE_STALE_EVENT_REJECTED", {
        received: region.identifier,
        expected: expectedIdentifier,
        session_id: session.id,
        reason: "STALE_IDENTIFIER",
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
      log(
        "BLANCO",
        "UBICACION",
        "DEBUG",
        "geofence event ignored: anti-rebounce active",
      );
      return;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // Ejecutar Sistema de Validación
    const result = await validateGeofenceEvent(eventType, region, session, loc);

    const auditBase = {
      session_id: session.id,
      event_type:
        eventType === Location.GeofencingEventType.Enter ? "ENTRY" : "EXIT",
      trigger_source: "GEOFENCE_TASK",
      from_state: session.status,
      to_state: session.status, // Fallback if invalid
      reason: result.reason,
      metadata: {
        ...result.metadata,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
      },
    };

    if (result.status === "INVALID") {
      log(
        "AMARILLO",
        "UBICACION",
        "WARN",
        "EVENT_REJECTED",
        auditBase.metadata,
        auditBase.session_id,
        "EVENT_REJECTED",
        auditBase.trigger_source,
        auditBase.reason,
        auditBase.from_state,
        auditBase.to_state,
      );
      return;
    }

    if (result.status === "SUSPICIOUS") {
      log(
        "NARANJA",
        "UBICACION",
        "WARN",
        "EVENT_MARKED_SUSPICIOUS",
        auditBase.metadata,
        auditBase.session_id,
        "EVENT_MARKED_SUSPICIOUS",
        auditBase.trigger_source,
        auditBase.reason,
        auditBase.from_state,
        auditBase.to_state,
      );
      // Por ahora, permitimos que eventos sospechosos procedan pero marcados
    }

    if (result.status === "VALID" || result.status === "SUSPICIOUS") {
      // Persistir última ubicación válida para jump detection
      await AsyncStorage.setItem(
        LAST_LOC_KEY,
        JSON.stringify({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
        }),
      );

      log(
        "AZUL",
        "UBICACION",
        "INFO",
        "EVENT_VALIDATED",
        { ...auditBase.metadata, validation_result: result.status },
        auditBase.session_id,
        "EVENT_VALIDATED",
        auditBase.trigger_source,
        auditBase.reason,
        auditBase.from_state,
        eventType === Location.GeofencingEventType.Enter
          ? "ACTIVE_WORK"
          : "PENDING_EXIT_CONFIRMATION",
      );

      if (eventType === Location.GeofencingEventType.Enter) {
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
      } else {
        lastProcessedEvent = {
          sessionId: session.id,
          type: eventType,
          timestamp: now(),
        };
        // Fase C (5): la pausa no dispara confirmación de salida.
        if (session.status === "PAUSED") {
          log("BLANCO", "UBICACION", "DEBUG", "exit ignored: session paused", {
            session_id: session.id,
          });
          return;
        }
        const firstExitAtMs = currentTime;
        const required = await readExitConfirmReadings(db);
        const toReading = (l: any) => ({
          distanceM: getDistanceFromLatLonInMeters(
            l.coords.latitude,
            l.coords.longitude,
            region.latitude,
            region.longitude,
          ),
          accuracyM: l.coords.accuracy,
          timestampMs: l.timestamp ?? now(),
        });
        // El evento EXIT del SO es el 1er strike; se persiste por si el SO
        // mata la app antes de confirmar (se resuelve al reabrir).
        const pendingDeps = { storage: AsyncStorage };
        const pending: PendingExit = {
          sessionId: session.id,
          firstExitAtMs,
          radiusM: region.radius,
          regionLatitude: region.latitude,
          regionLongitude: region.longitude,
          strikes: 1,
          required,
        };
        await savePendingExit(pendingDeps, pending).catch(() => {});
        const confirmation = await confirmExit(
          [{ ...toReading(loc), timestampMs: firstExitAtMs }],
          {
            radiusM: region.radius,
            requiredReadings: required,
            maxAccuracyM: MAX_ACCEPTABLE_ACCURACY_METERS,
            minSpacingMs: EXIT_CONFIRM_FAST_SPACING_MS,
            hysteresisM: PRESENCE_HYSTERESIS_METERS,
            seedStrikeAtMs: firstExitAtMs,
          },
          {
            sleep: delay,
            readPosition: async () =>
              toReading(
                await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.High,
                }),
              ),
            onProgress: (r) =>
              savePendingExit(pendingDeps, { ...pending, strikes: r.strikes }),
          },
        );
        await clearPendingExit(pendingDeps).catch(() => {});
        if (!confirmation.confirmed) {
          log(
            "AMARILLO",
            "UBICACION",
            "WARN",
            "EXIT_NOT_CONFIRMED",
            { strikes: confirmation.strikes, required },
            session.id,
            "EVENT_REJECTED",
            "GEOFENCE_TASK",
            "EXIT_STRIKES_NOT_MET",
          );
          return;
        }
        await workTrackerEngine.dispatch({
          type: "SESSION_EXIT_DETECTED",
          sessionId: session.id,
          // Hora de la primera salida, no la de la confirmación.
          exitTimestampMs: confirmation.firstOutsideAtMs ?? firstExitAtMs,
        });
      }
    }
  } catch (err) {
    log("ROJO", "ERROR_CRITICO", "ERROR", "geofence task failure", err);
  }
});

export const LocationService = {
  requestPermissions: async () => {
    try {
      const { status: fgStatus } =
        await Location.getForegroundPermissionsAsync();
      if (fgStatus !== "granted")
        await Location.requestForegroundPermissionsAsync();
      const { status: bgStatus } =
        await Location.getBackgroundPermissionsAsync();
      if (bgStatus !== "granted")
        await Location.requestBackgroundPermissionsAsync();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Ruta única de geocerca (A.6): delega en el adaptador de runtime, que es
   * el único lugar que llama a Location.startGeofencingAsync y valida
   * coordenadas, radio, permisos y servicios.
   */
  startMonitoringArrival: async (
    lat: number,
    lng: number,
    radius: number = 200,
  ) => locationAdapter.startMonitoringArrival("WORK_ZONE", lat, lng, radius),

  stopMonitoring: async () => {
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});
    } catch {}
  },
};


/**
 * Resuelve una salida pendiente (app matada antes de confirmar). Se llama al
 * arrancar y al volver a primer plano. Nunca cierra la jornada.
 */
export async function resolvePendingExitOnResume(): Promise<PendingExitOutcome> {
  try {
    const db = await getDB();
    const outcome = await resolvePendingExit({
      storage: AsyncStorage,
      nowMs: now(),
      maxAgeMs: PENDING_EXIT_MAX_AGE_MS,
      maxAccuracyM: MAX_ACCEPTABLE_ACCURACY_METERS,
      hysteresisM: PRESENCE_HYSTERESIS_METERS,
      getSessionStatus: async (id) => {
        const row: any = await db.getFirstAsync(
          "SELECT status FROM work_sessions WHERE id = ?",
          [id],
        );
        return row?.status ?? null;
      },
      readPosition: async (p) => {
        const l = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        return {
          distanceM: getDistanceFromLatLonInMeters(
            l.coords.latitude,
            l.coords.longitude,
            p.regionLatitude,
            p.regionLongitude,
          ),
          accuracyM: l.coords.accuracy ?? undefined,
          timestampMs: l.timestamp ?? now(),
        } as any;
      },
      dispatchExit: async (sessionId, exitTimestampMs) => {
        await workTrackerEngine.dispatch({
          type: "SESSION_EXIT_DETECTED",
          sessionId,
          exitTimestampMs,
        });
      },
    });
    if (outcome !== "NONE") {
      log("BLANCO", "UBICACION", "DEBUG", "pending exit resolved", { outcome });
    }
    return outcome;
  } catch (e) {
    log("AMARILLO", "UBICACION", "WARN", "pending exit resolve failed", {
      error: String(e),
    });
    return "NONE";
  }
}
