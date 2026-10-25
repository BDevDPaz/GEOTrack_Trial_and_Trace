import { computeWeeklyPayroll } from "../weeklyPayroll";
import {
  selectComputedSessions,
  selectWeeklyComputedSessions,
  toWeeklyPayrollInput,
} from "../../selectors";
import { buildState, at } from "./testState";

// Semana lunes 2026-10-19: 5×8 h a $20 + sábado 6 h a $30 = 46 h
const shifts = [
  ...[19, 20, 21, 22, 23].map((d) => ({
    startMs: at(2026, 10, d),
    hours: 8,
    rate: 20,
  })),
  { startMs: at(2026, 10, 24), hours: 6, rate: 30 },
];

describe("selectWeeklyComputedSessions (Historial / detalle)", () => {
  const state = buildState(shifts);
  const rows = selectWeeklyComputedSessions(state);

  it("la suma por jornada del Historial == total del reporte (>40 h)", () => {
    const historySum = rows.reduce((a, s) => a + s.computedPay, 0);
    const report = computeWeeklyPayroll(
      selectComputedSessions(state).map(toWeeklyPayrollInput),
      { hourlyRate: 18, overtimeMultiplier: 1.5 },
    );
    expect(historySum).toBeCloseTo(report.totals.pay);
    expect(historySum).toBeCloseTo(800 + 6 * 45);
  });

  it("el monto de la jornada refleja su parte de OT semanal", () => {
    const sat = rows.find((s) => s.id === 6)!;
    expect(sat.weeklyOvertimeHours).toBeCloseTo(6);
    expect(sat.dailyOnlyPay).toBeCloseTo(180);
    expect(sat.computedPay).toBeCloseTo(270);
    expect(sat.appliedHourlyRate).toBe(30);
    expect(rows[0].computedPay).toBeCloseTo(160);
  });

  it("no cambia selectComputedSessions para otros consumidores", () => {
    expect(
      selectComputedSessions(state).find((s) => s.id === 6)!.computedPay,
    ).toBeCloseTo(180);
  });
});
