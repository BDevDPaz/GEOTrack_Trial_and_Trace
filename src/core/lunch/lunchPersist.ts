/** Item 3: qué se persiste del almuerzo (instantes reales + minutos). Puro. */
export interface LunchLike {
  taken: boolean;
  startAtMs: number | null;
  endAtMs: number | null;
  deductedMinutes: number | null;
}

export function resolveLunchPersist(
  lunch: LunchLike,
  fallbackEndMs: number,
): { startAtMs: number; endAtMs: number; minutes: number } {
  const hasInterval =
    typeof lunch.startAtMs === "number" &&
    typeof lunch.endAtMs === "number" &&
    lunch.startAtMs > 0 &&
    lunch.endAtMs >= lunch.startAtMs;
  const explicit =
    typeof lunch.deductedMinutes === "number" && lunch.deductedMinutes > 0
      ? Math.round(lunch.deductedMinutes)
      : null;
  if (hasInterval) {
    const s = lunch.startAtMs as number;
    const e = lunch.endAtMs as number;
    return { startAtMs: s, endAtMs: e, minutes: explicit ?? Math.round((e - s) / 60000) };
  }
  // Solo minutos (modal de cierre): el almuerzo termina en la referencia
  // (hora del registro) y empieza `minutos` antes.
  const minutes = explicit ?? 0;
  return { startAtMs: fallbackEndMs - minutes * 60000, endAtMs: fallbackEndMs, minutes };
}
