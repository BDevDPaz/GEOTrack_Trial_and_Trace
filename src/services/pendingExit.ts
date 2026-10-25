/**
 * Salida pendiente persistida: si el SO mata la app durante la confirmación
 * en segundo plano, se resuelve al reabrir/volver a primer plano sin perder la
 * jornada. Nunca cierra la jornada: como mucho emite SESSION_EXIT_DETECTED
 * (el usuario decide en PENDING_EXIT_CONFIRMATION).
 */
import { presenceZone, PositionReading } from "../utils/geoUtils";

export const PENDING_EXIT_KEY = "GEOTRACK_PENDING_EXIT";

export interface PendingExit {
  sessionId: number;
  firstExitAtMs: number;
  radiusM: number;
  regionLatitude: number;
  regionLongitude: number;
  strikes: number;
  required: number;
}

export interface PendingExitDeps {
  storage: {
    getItem(k: string): Promise<string | null>;
    setItem(k: string, v: string): Promise<void>;
    removeItem(k: string): Promise<void>;
  };
}

export async function savePendingExit(deps: PendingExitDeps, p: PendingExit) {
  await deps.storage.setItem(PENDING_EXIT_KEY, JSON.stringify(p));
}

export async function clearPendingExit(deps: PendingExitDeps) {
  await deps.storage.removeItem(PENDING_EXIT_KEY);
}

export async function loadPendingExit(deps: PendingExitDeps): Promise<PendingExit | null> {
  try {
    const raw = await deps.storage.getItem(PENDING_EXIT_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p?.sessionId === "number" && typeof p?.firstExitAtMs === "number" ? p : null;
  } catch {
    return null;
  }
}

export type PendingExitOutcome =
  | "NONE"
  | "DISCARDED_STALE"
  | "DISCARDED_SESSION"
  | "DISCARDED_PAUSED"
  | "DISCARDED_INSIDE"
  | "KEPT_UNKNOWN"
  | "EXIT_DISPATCHED";

export interface ResolveDeps extends PendingExitDeps {
  nowMs: number;
  maxAgeMs: number;
  maxAccuracyM: number;
  hysteresisM: number;
  /** Estado de la jornada en BD, o null si no existe / está cerrada o borrada. */
  getSessionStatus(id: number): Promise<string | null>;
  /** Distancia al centro + precisión de una lectura ahora, o null. */
  readPosition(p: PendingExit): Promise<PositionReading | null>;
  dispatchExit(sessionId: number, exitTimestampMs: number): Promise<void>;
}

export async function resolvePendingExit(deps: ResolveDeps): Promise<PendingExitOutcome> {
  const p = await loadPendingExit(deps);
  if (!p) return "NONE";
  if (deps.nowMs - p.firstExitAtMs > deps.maxAgeMs) {
    await clearPendingExit(deps);
    return "DISCARDED_STALE";
  }
  const status = await deps.getSessionStatus(p.sessionId);
  if (status === "PAUSED") {
    await clearPendingExit(deps);
    return "DISCARDED_PAUSED";
  }
  if (status !== "ACTIVE_WORK") {
    await clearPendingExit(deps);
    return "DISCARDED_SESSION";
  }
  const reading = await deps.readPosition(p).catch(() => null);
  const zone = reading
    ? presenceZone(reading, p.radiusM, deps.maxAccuracyM, deps.hysteresisM)
    : "UNKNOWN";
  if (zone === "INSIDE") {
    await clearPendingExit(deps);
    return "DISCARDED_INSIDE";
  }
  if (zone === "UNKNOWN") return "KEPT_UNKNOWN";
  await clearPendingExit(deps);
  await deps.dispatchExit(p.sessionId, p.firstExitAtMs);
  return "EXIT_DISPATCHED";
}
