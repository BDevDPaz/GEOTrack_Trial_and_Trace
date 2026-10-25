// Fase C (5): bucle de confirmación de salida. Puro salvo por deps inyectadas.
import {
  evaluateExitStrikes,
  PositionReading,
  ExitStrikeResult,
} from "../utils/geoUtils";

export interface ExitConfirmDeps {
  readPosition: () => Promise<PositionReading | null>;
  sleep: (ms: number) => Promise<void>;
  /** Se llama tras cada lectura (p. ej. para persistir la salida pendiente). */
  onProgress?: (r: ExitStrikeResult) => Promise<void> | void;
}

export interface ExitConfirmOptions {
  radiusM: number;
  requiredReadings: number;
  maxAccuracyM: number;
  minSpacingMs: number;
  hysteresisM: number;
  /** Lecturas extra permitidas además de las N (imprecisas/franja). */
  extraAttempts?: number;
  /** Evento EXIT del SO como primer strike (segundo plano). */
  seedStrikeAtMs?: number | null;
}

/**
 * Toma lecturas espaciadas hasta confirmar N fuera o agotar intentos.
 * Termina antes si una lectura dentro resetea y ya no quedan intentos.
 */
export async function confirmExit(
  initial: PositionReading[],
  opts: ExitConfirmOptions,
  deps: ExitConfirmDeps,
): Promise<ExitStrikeResult & { readings: PositionReading[] }> {
  const readings = [...initial];
  const evalNow = () =>
    evaluateExitStrikes(readings, opts.radiusM, opts.requiredReadings, opts);
  let result = evalNow();
  const maxAttempts =
    Math.max(1, opts.requiredReadings) + (opts.extraAttempts ?? 2);
  let attempts = 0;
  while (!result.confirmed && attempts < maxAttempts) {
    attempts += 1;
    await deps.sleep(opts.minSpacingMs);
    const r = await deps.readPosition().catch(() => null);
    if (r) readings.push(r);
    result = evalNow();
    if (deps.onProgress) await Promise.resolve(deps.onProgress(result)).catch(() => {});
  }
  return { ...result, readings };
}
