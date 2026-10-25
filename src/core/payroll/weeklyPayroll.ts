/**
 * Cálculo semanal de nómina COMPARTIDO por la pantalla de reporte y el PDF
 * (ReportGenerator). Un solo lugar decide las horas regulares, el OT diario
 * (>8 h) y el OT semanal (>40 h, semanas lunes-domingo) sin doble conteo,
 * pagando cada jornada con su tarifa congelada (A.8) o la de ajustes.
 * Así la pantalla y el PDF dan siempre el mismo total para los mismos datos.
 */
import dayjs from "../../utils/dayjsSetup";
import {
  calculateWeeklyOvertime,
  resolveSessionRate,
  PayrollAllocation,
} from "../../utils/payrollUtils";

export interface WeeklyPayrollInput {
  id: number | string;
  /** Inicio efectivo de la jornada (ms). Define el día y la semana. */
  startMs: number;
  /** Horas trabajadas netas (sin almuerzo ni pausas). */
  hours: number;
  /** Tarifa congelada en la jornada (puede faltar en jornadas antiguas). */
  hourlyRate?: number | null;
  overtimeMultiplier?: number | null;
}

export interface WeeklyPayrollRow extends PayrollAllocation {
  hours: number;
  hourlyRate: number;
  overtimeMultiplier: number;
}

export interface WeeklyPayrollResult {
  rows: WeeklyPayrollRow[];
  byId: Map<number | string, WeeklyPayrollRow>;
  totals: {
    hours: number;
    regularHours: number;
    dailyOvertimeHours: number;
    weeklyOvertimeHours: number;
    overtimeHours: number;
    pay: number;
  };
}

const sumRows = (rows: WeeklyPayrollRow[]) =>
  rows.reduce(
    (t, r) => ({
      hours: t.hours + r.hours,
      regularHours: t.regularHours + r.regularHours,
      dailyOvertimeHours: t.dailyOvertimeHours + r.dailyOvertimeHours,
      weeklyOvertimeHours: t.weeklyOvertimeHours + r.weeklyOvertimeHours,
      overtimeHours: t.overtimeHours + r.overtimeHours,
      pay: t.pay + r.totalPay,
    }),
    {
      hours: 0,
      regularHours: 0,
      dailyOvertimeHours: 0,
      weeklyOvertimeHours: 0,
      overtimeHours: 0,
      pay: 0,
    },
  );

export const computeWeeklyPayroll = (
  sessions: WeeklyPayrollInput[],
  fallback: { hourlyRate: number; overtimeMultiplier: number },
): WeeklyPayrollResult => {
  const entries = sessions.map((s) => {
    const rate = resolveSessionRate(
      { hourlyRate: s.hourlyRate, overtimeMultiplier: s.overtimeMultiplier },
      fallback,
    );
    return {
      id: s.id,
      dateString: dayjs(s.startMs).format("YYYY-MM-DD"),
      startMs: s.startMs,
      hours: Math.max(0, s.hours || 0),
      hourlyRate: rate.hourlyRate,
      overtimeMultiplier: rate.overtimeMultiplier,
    };
  });

  const allocations = calculateWeeklyOvertime(entries);
  const rows: WeeklyPayrollRow[] = allocations.map((a, i) => ({
    ...a,
    hours: entries[i].hours,
    hourlyRate: entries[i].hourlyRate,
    overtimeMultiplier: entries[i].overtimeMultiplier,
  }));

  const totals = sumRows(rows);
  return { rows, byId: new Map(rows.map((r) => [r.id, r])), totals };
};

/** Lunes 00:00 (local) de la semana laboral que contiene `ms`. */
export const workweekStartMs = (ms: number): number =>
  dayjs(ms).startOf("isoWeek").valueOf();

/**
 * Igual que computeWeeklyPayroll, pero para un rango [startMs, endMs]:
 * usa como contexto TODAS las jornadas desde el lunes de la semana de
 * startMs (para saber las horas ya acumuladas en esa semana), y solo
 * devuelve/suma las jornadas cuyo inicio cae dentro del rango.
 * `sessions` puede traer jornadas fuera del rango; se filtran aquí.
 */
export const computeRangePayroll = (
  sessions: WeeklyPayrollInput[],
  fallback: { hourlyRate: number; overtimeMultiplier: number },
  range: { startMs: number; endMs: number },
): WeeklyPayrollResult => {
  const ctxStart = workweekStartMs(range.startMs);
  const context = sessions.filter(
    (s) => s.startMs >= ctxStart && s.startMs <= range.endMs,
  );
  const full = computeWeeklyPayroll(context, fallback);
  const inRange = new Set(
    context.filter((s) => s.startMs >= range.startMs).map((s) => s.id),
  );
  const rows = full.rows.filter((r) => inRange.has(r.id));
  return {
    rows,
    byId: new Map(rows.map((r) => [r.id, r])),
    totals: sumRows(rows),
  };
};
