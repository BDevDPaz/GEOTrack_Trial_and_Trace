/**
 * Calcula la duración efectiva de una sesión en milisegundos.
 * Utiliza dayjs para garantizar precisión ante saltos de DST o timezone cruzados.
 */
export const calculateSessionDuration = (
  startTime: number,
  endTime: number,
  lunchTaken: number, // 1 o 0
  lunchStart?: number,
  lunchEnd?: number,
): number => {
  // Optimizacion: Usar aritmetica nativa para timestamps unix reduce
  // la sobrecarga de instanciar objetos dayjs significativamente.
  let durationMs = endTime - startTime;

  if (lunchTaken) {
    if (lunchStart && lunchEnd) {
      // Diferencia exacta si hay registros de almuerzo
      durationMs -= lunchEnd - lunchStart;
    } else {
      // Restar 1 hora por defecto si solo se marcó "Sí" (3,600,000 ms)
      durationMs -= 3600000;
    }
  }

  return Math.max(0, durationMs);
};

export const calculateSessionDurationWithPause = (
  startTime: number,
  endTime: number,
  lunchTaken: number,
  totalPausedMs: number,
  lunchStart?: number,
  lunchEnd?: number,
): number => {
  let durationMs = calculateSessionDuration(
    startTime,
    endTime,
    lunchTaken,
    lunchStart,
    lunchEnd,
  );
  durationMs -= totalPausedMs;
  return Math.max(0, durationMs);
};

/**
 * Calcula el pago total basado en horas y horas extra.
 * Regla de California: > 8 horas diarias cuentan como Overtime.
 *
 * ✅ Internamente opera en minutos enteros para reducir errores de redondeo.
 */
export const calculatePay = (
  totalHours: number,
  hourlyRate: number,
  overtimeMultiplier: number = 1.5,
): { totalPay: number; regularHours: number; overtimeHours: number } => {
  const totalMinutes = Math.max(0, Math.round(totalHours * 60));

  let regularMinutes = totalMinutes;
  let overtimeMinutes = 0;

  if (totalMinutes > 8 * 60) {
    regularMinutes = 8 * 60;
    overtimeMinutes = totalMinutes - regularMinutes;
  }

  const regularPay = (regularMinutes / 60) * hourlyRate;
  const overtimePay = (overtimeMinutes / 60) * hourlyRate * overtimeMultiplier;

  return {
    totalPay: regularPay + overtimePay,
    regularHours: regularMinutes / 60,
    overtimeHours: overtimeMinutes / 60,
  };
};

/**
 * A.8: tarifa efectiva de una jornada. Usa la tarifa congelada en la jornada
 * si es válida; si no (jornadas antiguas sin dato), la de ajustes.
 */
export const resolveSessionRate = (
  frozen:
    | { hourlyRate?: number | null; overtimeMultiplier?: number | null }
    | null
    | undefined,
  fallback: { hourlyRate: number; overtimeMultiplier: number },
): { hourlyRate: number; overtimeMultiplier: number } => {
  const ok = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  return {
    hourlyRate: ok(frozen?.hourlyRate)
      ? frozen!.hourlyRate!
      : fallback.hourlyRate,
    overtimeMultiplier:
      ok(frozen?.overtimeMultiplier) && frozen!.overtimeMultiplier! > 0
        ? frozen!.overtimeMultiplier!
        : fallback.overtimeMultiplier,
  };
};
