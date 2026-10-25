import { buildReportModel, renderReportHtml, renderSessionRow } from "../reportModel";

const H = 3_600_000;
const base = Date.UTC(2026, 9, 20, 15, 0, 0); // martes
const range = { startMs: base - 2 * 24 * H, endMs: base + 3 * 24 * H };
const settings = { hourly_rate: 10, overtime_multiplier: 1.5 };
const s = (id: number, over: any = {}) => ({
  id,
  start_time: base + id * 24 * H - 24 * H,
  actual_start_time: base + id * 24 * H - 24 * H,
  end_time: base + id * 24 * H - 24 * H + 4 * H,
  status: "CLOSED",
  lunch_taken: 0,
  hourly_rate: 10,
  overtime_multiplier: 1.5,
  address: "Calle 1",
  ...over,
});

describe("reportModel (Fase B, 6)", () => {
  it("eliminadas: fila roja, $0 y no suman", () => {
    const m = buildReportModel([s(1), s(2, { is_deleted: 1 })], [], settings, range);
    expect(m.totals.hours).toBeCloseTo(4);
    expect(m.totals.pay).toBeCloseTo(40);
    const del = m.rows.find((r) => r.id === 2)!;
    expect(del.integrity).toBe("DELETED");
    expect(del.pay).toBe(0);
    expect(del.color).toBe("#F8D7DA");
  });
  it("cada jornada lleva su propia auditoría; la global va aparte", () => {
    const logs = [
      { session_id: 1, action_type: "MANUAL", details: "editada", timestamp: base },
      { session_id: null, action_type: "MUTEX", details: "x", timestamp: base },
    ];
    const m = buildReportModel([s(1, { is_manual_edit: 1 })], logs, settings, range);
    expect(m.rows[0].audit).toHaveLength(1);
    expect(m.rows[0].integrity).toBe("EDITED");
    expect(m.globalLogs).toHaveLength(1);
    expect(renderSessionRow(m.rows[0], "es")).toContain("editada");
    expect(renderSessionRow(m.rows[0], "es")).toContain("#FFF3CD");
  });
  it("tramo encadenado: tránsito pagado desde start_time y mostrado aparte", () => {
    const t = s(1, { parent_session_id: 9, actual_start_time: base + H });
    const m = buildReportModel([t], [], settings, range);
    expect(m.rows[0].integrity).toBe("TRANSIT");
    expect(m.rows[0].hours).toBeCloseTo(4);
    expect(m.rows[0].transit).not.toBeNull();
  });
  it("idioma del PDF = idioma de la app, y muestra setup_address", () => {
    const m = buildReportModel([s(1, { setup_address: "Main St 5" })], [], settings, range);
    const ctx = { employeeName: "E", employerName: "C", settingsId: 1, rangeTitle: "R", generatedAt: "now" };
    expect(renderReportHtml(m, { ...ctx, lang: "en" })).toContain("Total Hours");
    expect(renderReportHtml(m, { ...ctx, lang: "es" })).toContain("Horas Totales");
    expect(renderReportHtml(m, { ...ctx, lang: "en" })).toContain("Main St 5");
    expect(renderReportHtml(m, { ...ctx, lang: "es" })).not.toContain("LED TRACKER");
  });
});
