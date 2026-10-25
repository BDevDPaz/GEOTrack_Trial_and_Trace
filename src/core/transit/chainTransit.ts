/**
 * Fase C (7): tránsito encadenado. Puro.
 * Idea de LEDTracker 270126 (LocationManager.createTransitSession), adaptada
 * al motor por eventos: en vez de mutar la BD, se construye un único evento
 * SESSION_TRANSIT_CHAINED que el reducer aplica y el efecto persiste.
 */
import type { DomainEvent, SessionRecord } from "../contracts/types";
import { chainedTransitStartMs } from "../../utils/dateUtils";
import { toDateString } from "../../utils/timeProvider";

export const CHAINABLE_STATUSES = ["ACTIVE_WORK", "PENDING_EXIT_CONFIRMATION"];

export function canChainTransit(s: SessionRecord | undefined | null): boolean {
  return (
    !!s && !s.lifecycle.isDeleted && CHAINABLE_STATUSES.includes(s.lifecycle.domainStatus)
  );
}

export function buildChainedTransitEvent(
  current: SessionRecord,
  opts: { nowMs: number; lastExitTimestampMs: number | null; newId: number },
): Extract<DomainEvent, { type: "SESSION_TRANSIT_CHAINED" }> | null {
  if (!canChainTransit(current)) return null;
  const startFloor = current.actualStartAtMs ?? current.declaredStartAtMs;
  const exit = opts.lastExitTimestampMs;
  // Fin = última salida detectada (si es coherente) o ahora.
  const endAtMs =
    exit != null && exit >= startFloor && exit <= opts.nowMs ? exit : opts.nowMs;
  const start = chainedTransitStartMs(endAtMs, opts.nowMs);
  const newSession: SessionRecord = {
    id: opts.newId,
    declaredStartAtMs: start,
    actualStartAtMs: null,
    endAtMs: null,
    parentSessionId: current.id,
    lifecycle: {
      domainStatus: "TRAVEL",
      isDeleted: false,
      isManualEdit: false,
      locationConfirmed: false,
      totalPausedMs: 0,
      lastPauseStartMs: null,
      closeReason: null,
    },
    destination: {
      address: null,
      clientName: current.destination.clientName,
      targetLatitude: null,
      targetLongitude: null,
      setupLatitude: null,
      setupLongitude: null,
    },
    capturedLocation: { latitude: null, longitude: null },
    lunch: { taken: false, startAtMs: null, endAtMs: null, deductedMinutes: null },
    notes: { manualNote: null },
    bookkeeping: { dateString: toDateString(start) },
    pay: current.pay ? { ...current.pay } : undefined,
  };
  return { type: "SESSION_TRANSIT_CHAINED", sessionId: current.id, endAtMs, newSession };
}

/** Almuerzo una sola vez por día: ¿otra jornada del mismo día ya lo tiene? */
export function lunchAlreadyTakenOnDay(
  sessions: SessionRecord[],
  dateString: string | null | undefined,
  excludeId: number,
): boolean {
  if (!dateString) return false;
  return sessions.some(
    (s) =>
      s.id !== excludeId &&
      !s.lifecycle.isDeleted &&
      s.bookkeeping.dateString === dateString &&
      s.lunch.taken &&
      (s.lunch.deductedMinutes ?? 0) > 0,
  );
}

/**
 * Inicio pagable. Un tramo encadenado se paga desde su inicio declarado
 * (incluye el tránsito); el resto, desde la llegada real si existe.
 */
export function effectiveStartMs(s: {
  actualStartAtMs: number | null;
  declaredStartAtMs: number;
  parentSessionId?: number | null;
}): number {
  if (s.parentSessionId != null) return s.declaredStartAtMs;
  return s.actualStartAtMs || s.declaredStartAtMs;
}
