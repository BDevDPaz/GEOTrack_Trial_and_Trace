import { computeStaleClose } from "../utils/staleSession";

/**
 * Fase B (4): revisión de jornadas huérfanas desde la tarea de fondo.
 * La tarea puede correr sin que el motor esté rehidratado; si el motor
 * conoce la sesión se despacha el evento (persiste el efecto), si no se
 * persiste directamente en SQLite.
 */
export interface StaleGuardDeps {
  getOpenSessions(): Promise<
    {
      id: number;
      status: string;
      start_time: number;
      actual_start_time: number | null;
      end_time: number | null;
      last_pause_start_ms?: number | null;
    }[]
  >;
  getNextSessionStart(id: number, startMs: number): Promise<number | null>;
  lastExitTimestampMs: number | null;
  engineKnows(id: number): boolean;
  dispatchStale(id: number, endAtMs: number): Promise<void>;
  persistStale(id: number, endAtMs: number): Promise<void>;
}

export async function closeStaleSessions(
  deps: StaleGuardDeps,
  nowMs: number,
): Promise<number[]> {
  const closed: number[] = [];
  for (const row of await deps.getOpenSessions()) {
    const startAtMs = row.actual_start_time ?? row.start_time;
    const decision = computeStaleClose(
      {
        status: row.status,
        startAtMs,
        endAtMs: row.end_time,
        lastPauseStartMs: row.last_pause_start_ms ?? null,
        lastExitTimestampMs: deps.lastExitTimestampMs,
        nextSessionStartMs: await deps.getNextSessionStart(row.id, row.start_time),
      },
      nowMs,
    );
    if (!decision) continue;
    if (deps.engineKnows(row.id)) await deps.dispatchStale(row.id, decision.endAtMs);
    else await deps.persistStale(row.id, decision.endAtMs);
    closed.push(row.id);
  }
  return closed;
}
