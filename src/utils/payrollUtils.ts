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

/* ==========================================================================
 * A.9 HORAS EXTRA SEMANALES (> 40 h) COMBINADAS CON LA REGLA DIARIA (> 8 h)
 * --------------------------------------------------------------------------
 * Regla elegida (sin doble conteo, estilo California / FLSA):
 *  1. Por día: las horas por encima de 8 son OT diario.
 *  2. Solo las horas REGULARES (las primeras 8 de cada día) suman hacia 40.
 *  3. Recorriendo la semana en orden cronológico, las horas regulares que
 *     pasan del acumulado de 40 se reclasifican como OT semanal.
 *  4. OT total = OT diario + OT semanal. Una hora nunca se cuenta dos veces.
 * Semana laboral: lunes a domingo (según dateString YYYY-MM-DD).
 * No incluye doble tiempo (>12 h/día) ni la regla del 7.º día.
 * ========================================================================== */

export interface PayrollEntry {
  id: number | string;
  /** YYYY-MM-DD del día de la jornada. */
  dateString: string;
  /** Inicio (ms) para ordenar dentro del mismo día. */
  startMs: number;
  hours: number;
  hourlyRate: number;
  overtimeMultiplier: number;
}

export interface PayrollAllocation {
  id: number | string;
  regularHours: number;
  dailyOvertimeHours: number;
  weeklyOvertimeHours: number;
  overtimeHours: number;
  totalPay: number;
}

export const DAILY_OT_THRESHOLD_HOURS = 8;
export const WEEKLY_OT_THRESHOLD_HOURS = 40;

/** Lunes (YYYY-MM-DD) de la semana de un dateString. */
export const workweekKey = (dateString: string): string => {
  const [y, m, d] = dateString.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  const dow = (dt.getUTCDay() + 6) % 7; // 0 = lunes
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
};

export const calculateWeeklyOvertime = (
  entries: PayrollEntry[],
): PayrollAllocation[] => {
  const sorted = [...entries].sort((a, b) =>
    a.dateString === b.dateString
      ? a.startMs - b.startMs
      : a.dateString < b.dateString
        ? -1
        : 1,
  );

  const dayMinutes = new Map<string, number>();
  const weekRegularMinutes = new Map<string, number>();
  const byId = new Map<number | string, PayrollAllocation>();

  for (const e of sorted) {
    const minutes = Math.max(0, Math.round((e.hours || 0) * 60));
    const usedToday = dayMinutes.get(e.dateString) ?? 0;
    const dailyRegularLeft = Math.max(
      0,
      DAILY_OT_THRESHOLD_HOURS * 60 - usedToday,
    );
    const dailyRegular = Math.min(minutes, dailyRegularLeft);
    const dailyOT = minutes - dailyRegular;
    dayMinutes.set(e.dateString, usedToday + minutes);

    const wk = workweekKey(e.dateString);
    const usedWeek = weekRegularMinutes.get(wk) ?? 0;
    const weeklyRegularLeft = Math.max(
      0,
      WEEKLY_OT_THRESHOLD_HOURS * 60 - usedWeek,
    );
    const regular = Math.min(dailyRegular, weeklyRegularLeft);
    const weeklyOT = dailyRegular - regular;
    weekRegularMinutes.set(wk, usedWeek + regular);

    const otMinutes = dailyOT + weeklyOT;
    const pay =
      (regular / 60) * e.hourlyRate +
      (otMinutes / 60) * e.hourlyRate * e.overtimeMultiplier;

    byId.set(e.id, {
      id: e.id,
      regularHours: regular / 60,
      dailyOvertimeHours: dailyOT / 60,
      weeklyOvertimeHours: weeklyOT / 60,
      overtimeHours: otMinutes / 60,
      totalPay: pay,
    });
  }

  // Mantener el orden original de entrada
  return entries.map((e) => byId.get(e.id)!);
};
