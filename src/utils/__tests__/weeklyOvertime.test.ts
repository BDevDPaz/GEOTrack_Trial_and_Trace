import { calculateWeeklyOvertime, workweekKey } from "../payrollUtils";

const day = (d: string, hours: number, id = d, rate = 10) => ({
  id,
  dateString: d,
  startMs: 0,
  hours,
  hourlyRate: rate,
  overtimeMultiplier: 1.5,
});

// 2026-10-19 es lunes
const WEEK = [
  "2026-10-19",
  "2026-10-20",
  "2026-10-21",
  "2026-10-22",
  "2026-10-23",
  "2026-10-24",
  "2026-10-25",
];

describe("A.9 OT semanal > 40 h combinado con diario > 8 h", () => {
  it("workweekKey agrupa lunes-domingo", () => {
    expect(workweekKey("2026-10-25")).toBe("2026-10-19");
    expect(workweekKey("2026-10-19")).toBe("2026-10-19");
    expect(workweekKey("2026-10-26")).toBe("2026-10-26");
  });

  it("5 días de 8 h = 40 regulares, sin OT", () => {
    const r = calculateWeeklyOvertime(WEEK.slice(0, 5).map((d) => day(d, 8)));
    expect(r.reduce((a, x) => a + x.overtimeHours, 0)).toBe(0);
  });

  it("6 días de 8 h: el sexto día es OT semanal completo", () => {
    const r = calculateWeeklyOvertime(WEEK.slice(0, 6).map((d) => day(d, 8)));
    expect(r[5]).toMatchObject({
      regularHours: 0,
      weeklyOvertimeHours: 8,
      dailyOvertimeHours: 0,
    });
    expect(r[5].totalPay).toBeCloseTo(8 * 10 * 1.5);
  });

  it("sin doble conteo: 5 días de 10 h = 10 OT diario, 0 semanal", () => {
    const r = calculateWeeklyOvertime(WEEK.slice(0, 5).map((d) => day(d, 10)));
    const daily = r.reduce((a, x) => a + x.dailyOvertimeHours, 0);
    const weekly = r.reduce((a, x) => a + x.weeklyOvertimeHours, 0);
    expect(daily).toBe(10);
    expect(weekly).toBe(0); // las 40 regulares no pasan de 40
  });

  it("mixto: 4×10 h + sábado 8 h -> 8 diario + 0... y domingo 4 h semanal", () => {
    const entries = [
      ...WEEK.slice(0, 4).map((d) => day(d, 10)),
      day(WEEK[5], 8),
      day(WEEK[6], 4),
    ];
    const r = calculateWeeklyOvertime(entries);
    // regulares: 4×8 = 32, sábado 8 -> 40, domingo 4 -> semanal
    expect(r.reduce((a, x) => a + x.regularHours, 0)).toBe(40);
    expect(r.reduce((a, x) => a + x.dailyOvertimeHours, 0)).toBe(8);
    expect(r[5]).toMatchObject({ weeklyOvertimeHours: 4 });
  });

  it("varias jornadas el mismo día comparten el umbral de 8 h", () => {
    const r = calculateWeeklyOvertime([
      { ...day("2026-10-19", 5, "a"), startMs: 1 },
      { ...day("2026-10-19", 5, "b"), startMs: 2 },
    ]);
    expect(r[0]).toMatchObject({ regularHours: 5, overtimeHours: 0 });
    expect(r[1]).toMatchObject({ regularHours: 3, dailyOvertimeHours: 2 });
  });

  it("cada jornada se paga con su propia tarifa congelada", () => {
    const r = calculateWeeklyOvertime([
      day("2026-10-19", 8, "a", 10),
      day("2026-10-20", 8, "b", 20),
    ]);
    expect(r[0].totalPay).toBe(80);
    expect(r[1].totalPay).toBe(160);
  });

  it("semanas distintas no se mezclan", () => {
    const entries = [
      ...WEEK.slice(0, 5).map((d) => day(d, 8)),
      day("2026-10-26", 8),
    ];
    const r = calculateWeeklyOvertime(entries);
    expect(r[5].overtimeHours).toBe(0);
  });
});
