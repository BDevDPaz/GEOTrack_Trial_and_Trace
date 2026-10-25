jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn() }));
jest.mock("../../utils/logger", () => ({ log: jest.fn(), setLoggerDB: jest.fn() }));
import { buildInsertSessionSql } from "../db";

const base: any = { start_time: 1, status: "GEOFENCE_CREATED", address: "a", location_confirmed: 0, is_manual_edit: 0, lunch_taken: 0, date_string: "2026-10-24" };

describe("buildInsertSessionSql", () => {
  it("usa el id del motor para que geocerca y BD coincidan", () => {
    const { sql, params } = buildInsertSessionSql({ ...base, id: 1761300000000 });
    expect(sql).toMatch(/^INSERT INTO work_sessions \(id, start_time/);
    expect(params[0]).toBe(1761300000000);
    expect(sql.match(/\?/g)!.length).toBe(params.length);
  });
  it("sin id → autoincrement", () => {
    const { sql } = buildInsertSessionSql(base);
    expect(sql).not.toMatch(/\(id,/);
  });
  it("persiste parent_session_id del tramo encadenado", () => {
    const { sql, params } = buildInsertSessionSql({ ...base, parent_session_id: 7 });
    const cols = sql.slice(sql.indexOf("(") + 1, sql.indexOf(")")).split(", ");
    expect(params[cols.indexOf("parent_session_id")]).toBe(7);
  });
});
