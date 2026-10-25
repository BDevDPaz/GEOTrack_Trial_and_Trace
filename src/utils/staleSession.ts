/**
 * Fase B (4): cierre de jornadas huérfanas.
 *
 * Idea portada de LEDTracker 270126 (`db.ts`, insertWorkSession): si una
 * jornada lleva más de 12 h abierta se cierra en inicio + 12 h y queda
 * marcada para revisión. Diferencias con la fuente:
 *  - No se marca como edición manual: usa close_reason = 'STALE_12H'.
 *  - Nunca se cierra con "ahora" (inflaría horas): el fin es el menor entre
 *    inicio + 12 h, la última salida registrada, el inicio de la pausa en
 *    curso y el inicio de la jornada siguiente (sin solapamiento).
 *  - Se evalúa al rehidratar y en la tarea de fondo, no solo al crear otra.
 */
export const STALE_SESSION_MAX_MS = 12 * 60 * 60 * 1000;

export type CloseReason =
  | "MANUAL"
  | "GPS"
  | "FAILSAFE_15M"
  | "STALE_12H"
  | "CANCELLED";

export interface StaleCheckInput {
  status: string;
  isDeleted?: boolean;
  startAtMs: number;
  endAtMs: number | null;
  lastPauseStartMs?: number | null;
  lastExitTimestampMs?: number | null;
  nextSessionStartMs?: number | null;
}

export function computeStaleClose(
  input: StaleCheckInput,
  nowMs: number,
  maxMs: number = STALE_SESSION_MAX_MS,
): { endAtMs: number; reason: "STALE_12H" } | null {
  if (input.isDeleted) return null;
  if (input.status === "CLOSED" || input.endAtMs != null) return null;
  if (!Number.isFinite(input.startAtMs) || input.startAtMs <= 0) return null;
  if (nowMs - input.startAtMs <= maxMs) return null;

  const candidates = [input.startAtMs + maxMs];
  const after = (v: number | null | undefined): v is number =>
    typeof v === "number" && Number.isFinite(v) && v > input.startAtMs;
  if (after(input.lastExitTimestampMs)) candidates.push(input.lastExitTimestampMs);
  if (input.status === "PAUSED" && after(input.lastPauseStartMs))
    candidates.push(input.lastPauseStartMs);
  if (after(input.nextSessionStartMs)) candidates.push(input.nextSessionStartMs);

  return { endAtMs: Math.min(...candidates), reason: "STALE_12H" };
}
