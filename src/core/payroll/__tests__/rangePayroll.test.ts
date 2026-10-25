jest.mock("expo-print", () => ({ printToFileAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({ shareAsync: jest.fn() }));
jest.mock("expo-mail-composer", () => ({}));
jest.mock("../../../utils/logger", () => ({ log: jest.fn() }));
jest.mock("../../../database/db", () => ({
  getSettings: jest.fn(),
  getAllAsync: jest.fn(),
}));

import * as Print from "expo-print";
import * as db from "../../../database/db";
import { computeRangePayroll } from "../weeklyPayroll";
import { generateWeeklyReport } from "../../../services/ReportGenerator";
import {
  selectComputedSessions,
  selectWeeklyComputedSessions,
  toWeeklyPayrollInput,
} from "../../selectors";
import { buildState, toDbRows, at } from "./testState";

// 2026-05-01 es viernes; semana laboral lunes 2026-04-27 → domingo 05-03
const shifts = [
  ...[27, 28, 29, 30].map((d) => ({
    startMs: at(2026, 4, d),
    hours: 7.5,
    rate: 20,
  })), // 30 h abril
  { startMs: at(2026, 5, 1), hours: 8, rate: 20 },
  { startMs: at(2026, 5, 2), hours: 7, rate: 20 }, // 15 h mayo
];
const MAY = {
  startMs: new Date(2026, 4, 1, 0, 0, 0).getTime(),
  endMs: new Date(2026, 4, 31, 23, 59, 59).getTime(),
};
const FALLBACK = { hourlyRate: 18, overtimeMultiplier: 1.5 };

describe("rango que corta una semana (Mes en Curso)", () => {
  it("30 h a fin de abril + 15 h a inicio de mayo → 5 h OT semanal en mayo", () => {
    const state = buildState(shifts);
    const r = computeRangePayroll(
      selectComputedSessions(state).map(toWeeklyPayrollInput),
      FALLBACK,
      MAY,
    );
    expect(r.rows.map((x) => x.id)).toEqual([5, 6]);
    expect(r.totals.hours).toBeCloseTo(15);
    expect(r.totals.regularHours).toBeCloseTo(10);
    expect(r.totals.weeklyOvertimeHours).toBeCloseTo(5);
    expect(r.totals.pay).toBeCloseTo(10 * 20 + 5 * 30);
  });

  it("pantalla == PDF == suma del Historial en el rango", async () => {
    (db.getSettings as jest.Mock).mockResolvedValue({
      id: 1,
      hourly_rate: 18,
      overtime_multiplier: 1.5,
    });
    // La BD respeta el filtro de fechas de la consulta
    (db.getAllAsync as jest.Mock).mockImplementation(
      async (sql: string, [from, to]: number[]) =>
        sql.includes("work_sessions")
          ? toDbRows(shifts).filter(
              (r) => r.start_time >= from && r.start_time <= to,
            )
          : [],
    );
    let html = "";
    (Print.printToFileAsync as jest.Mock).mockImplementation(async (o: any) => {
      html = o.html;
      return { uri: "file://r.pdf" };
    });
    await generateWeeklyReport(false, { start: MAY.startMs, end: MAY.endMs });
    const m = html.match(
      /color: #D4AF37;">\$([\d.]+)<\/div>\s*<div class="stat-desc">Pago Estimado/,
    );
    expect(m).not.toBeNull();
    // El PDF no lista jornadas de abril
    expect((html.match(/<tr/g) || []).length).toBe(1 + 2);

    const state = buildState(shifts);
    const screen = computeRangePayroll(
      selectComputedSessions(state).map(toWeeklyPayrollInput),
      FALLBACK,
      MAY,
    );
    const historyMay = selectWeeklyComputedSessions(state)
      .filter((s) => (s.actualStartAtMs || s.declaredStartAtMs) >= MAY.startMs)
      .reduce((a, s) => a + s.computedPay, 0);

    expect(m![1]).toBe(screen.totals.pay.toFixed(2));
    expect(historyMay).toBeCloseTo(screen.totals.pay);
    expect(screen.totals.pay).toBeCloseTo(350);
  });
});
