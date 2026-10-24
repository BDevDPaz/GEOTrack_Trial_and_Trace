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
import { computeWeeklyPayroll } from "../weeklyPayroll";
import { generateWeeklyReport } from "../../../services/ReportGenerator";
import { selectComputedSessions, toWeeklyPayrollInput } from "../../selectors";
import { createInitialState } from "../../state/initialState";
import { SessionRecord } from "../../contracts/types";

const H = 3600000;
const FALLBACK = { hourlyRate: 20, overtimeMultiplier: 1.5 };
// 2026-10-19 es lunes; mediodía local para evitar bordes de zona horaria
const dayStart = (i: number) => new Date(2026, 9, 19 + i, 7, 0, 0).getTime();
const shift = (i: number, hours: number, rate: number | null = 20) => ({
  id: i + 1,
  startMs: dayStart(i),
  hours,
  hourlyRate: rate,
  overtimeMultiplier: 1.5,
});

describe("computeWeeklyPayroll (cálculo semanal compartido)", () => {
  it("semana de 45 h (5×9 h): 5 h OT diario, 0 semanal, nada contado doble", () => {
    const r = computeWeeklyPayroll(
      [0, 1, 2, 3, 4].map((i) => shift(i, 9)),
      FALLBACK,
    );
    expect(r.totals.hours).toBeCloseTo(45);
    expect(r.totals.regularHours).toBeCloseTo(40);
    expect(r.totals.dailyOvertimeHours).toBeCloseTo(5);
    expect(r.totals.weeklyOvertimeHours).toBeCloseTo(0);
    expect(r.totals.pay).toBeCloseTo(40 * 20 + 5 * 30);
  });

  it("semana de 45 h (5×8 + 5 h el sábado): 5 h OT semanal", () => {
    const r = computeWeeklyPayroll(
      [...[0, 1, 2, 3, 4].map((i) => shift(i, 8)), shift(5, 5)],
      FALLBACK,
    );
    expect(r.totals.regularHours).toBeCloseTo(40);
    expect(r.totals.weeklyOvertimeHours).toBeCloseTo(5);
    expect(r.byId.get(6)!.weeklyOvertimeHours).toBeCloseTo(5);
    expect(r.totals.pay).toBeCloseTo(40 * 20 + 5 * 30);
  });

  it("tarifas mixtas: cada jornada se paga con su tarifa congelada", () => {
    const r = computeWeeklyPayroll(
      [
        ...[0, 1, 2, 3, 4].map((i) => shift(i, 8, 20)),
        shift(5, 4, 30), // OT semanal a 30×1.5
        shift(6, 2, null), // sin tarifa congelada → ajustes (20), OT semanal
      ],
      FALLBACK,
    );
    expect(r.byId.get(6)!.totalPay).toBeCloseTo(4 * 45);
    expect(r.byId.get(7)!.hourlyRate).toBe(20);
    expect(r.byId.get(7)!.totalPay).toBeCloseTo(2 * 30);
    expect(r.totals.pay).toBeCloseTo(800 + 180 + 60);
  });

  it("exactamente 40 h: sin OT", () => {
    const r = computeWeeklyPayroll(
      [0, 1, 2, 3, 4].map((i) => shift(i, 8)),
      FALLBACK,
    );
    expect(r.totals.overtimeHours).toBe(0);
    expect(r.totals.pay).toBeCloseTo(800);
  });

  it("menos de 40 h: sin OT", () => {
    const r = computeWeeklyPayroll(
      [0, 1, 2].map((i) => shift(i, 7.5)),
      FALLBACK,
    );
    expect(r.totals.overtimeHours).toBe(0);
    expect(r.totals.pay).toBeCloseTo(22.5 * 20);
  });
});

describe("pantalla de reporte vs PDF: mismo total", () => {
  // 5×9 h + sábado 6 h = 51 h, con tarifas mixtas
  const plan: { day: number; hours: number; rate: number }[] = [
    { day: 0, hours: 9, rate: 20 },
    { day: 1, hours: 9, rate: 20 },
    { day: 2, hours: 9, rate: 25 },
    { day: 3, hours: 9, rate: 25 },
    { day: 4, hours: 9, rate: 25 },
    { day: 5, hours: 6, rate: 30 },
  ];

  it("el total en pantalla es igual al 'Pago Estimado' del PDF", async () => {
    // --- Datos del PDF (filas de SQLite) ---
    (db.getSettings as jest.Mock).mockResolvedValue({
      id: 1,
      hourly_rate: 18,
      overtime_multiplier: 1.5,
    });
    (db.getAllAsync as jest.Mock).mockImplementation(async (sql: string) =>
      sql.includes("work_sessions")
        ? plan.map((p, i) => ({
            id: i + 1,
            start_time: dayStart(p.day),
            actual_start_time: dayStart(p.day),
            end_time: dayStart(p.day) + p.hours * H,
            lunch_taken: 0,
            hourly_rate: p.rate,
            overtime_multiplier: 1.5,
            status: "CLOSED",
          }))
        : [],
    );
    let html = "";
    (Print.printToFileAsync as jest.Mock).mockImplementation(async (o: any) => {
      html = o.html;
      return { uri: "file://r.pdf" };
    });
    await generateWeeklyReport(false, {
      start: dayStart(0),
      end: dayStart(6) + 24 * H,
    });
    const m = html.match(
      /color: #D4AF37;">\$([\d.]+)<\/div>\s*<div class="stat-desc">Pago Estimado/,
    );
    expect(m).not.toBeNull();
    const pdfTotal = Number(m![1]);

    // --- Datos de la pantalla (estado canónico) ---
    const state = createInitialState();
    state.domain.settings.hourlyRate = 18;
    state.domain.settings.overtimeMultiplier = 1.5;
    plan.forEach((p, i) => {
      const id = i + 1;
      const s = {
        id,
        declaredStartAtMs: dayStart(p.day),
        actualStartAtMs: dayStart(p.day),
        endAtMs: dayStart(p.day) + p.hours * H,
        lifecycle: {
          domainStatus: "CLOSED",
          isDeleted: false,
          isManualEdit: false,
          locationConfirmed: true,
          totalPausedMs: 0,
          lastPauseStartMs: null,
        },
        destination: {} as any,
        capturedLocation: {} as any,
        lunch: {
          taken: false,
          startAtMs: null,
          endAtMs: null,
          deductedMinutes: null,
        },
        notes: { manualNote: null },
        bookkeeping: { dateString: "" },
        pay: { hourlyRate: p.rate, overtimeMultiplier: 1.5 },
      } as unknown as SessionRecord;
      (state.domain.sessions.byId as any)[id] = s;
      (state.domain.sessions.order as any).push(id);
    });
    const screen = computeWeeklyPayroll(
      selectComputedSessions(state).map(toWeeklyPayrollInput),
      { hourlyRate: 18, overtimeMultiplier: 1.5 },
    );

    // 51 h: 40 reg + 5 OT diario + 6 OT semanal (sábado)
    const expected =
      2 * 8 * 20 + 3 * 8 * 25 + (2 * 20 + 3 * 25) * 1.5 + 6 * 30 * 1.5;
    expect(screen.totals.pay).toBeCloseTo(expected);
    expect(screen.totals.pay.toFixed(2)).toBe(pdfTotal.toFixed(2));
  });
});
