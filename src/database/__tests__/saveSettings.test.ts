jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn() }));
jest.mock("../../utils/logger", () => ({ log: jest.fn(), setLoggerDB: jest.fn() }));
import { buildSaveSettingsSql } from "../db";

describe("buildSaveSettingsSql (Fase D 11)", () => {
  it("incluye columnas v4 para no resetearlas al guardar", () => {
    const { sql, params } = buildSaveSettingsSql({
      employee_name: "a", employer_name: "b", company_email: "c", tolerance_radius: 100,
      hourly_rate: 20, language: "es", start_time: "07:00", overtime_multiplier: 1.5,
      exit_confirm_readings: 4, lunch_reminder_enabled: 1, lunch_reminder_time: "13:30",
    });
    for (const c of ["exit_confirm_readings", "lunch_reminder_enabled", "lunch_reminder_time"]) expect(sql).toContain(c);
    expect((sql.match(/\?/g) || []).length).toBe(params.length);
    expect(params.slice(-3)).toEqual([4, 1, "13:30"]);
  });
  it("valores por defecto conservadores", () => {
    const { params } = buildSaveSettingsSql({});
    expect(params.slice(-3)).toEqual([3, 0, "12:00"]);
  });
});
