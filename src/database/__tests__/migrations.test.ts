jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn() }));
jest.mock("../../utils/logger", () => ({
  log: jest.fn(),
  setLoggerDB: jest.fn(),
}));

import { runMigrations, CURRENT_SCHEMA_VERSION } from "../db";

/** BD falsa mínima: columnas por tabla, user_version y registro de SQL. */
function fakeDb(userVersion: number, cols: Record<string, string[]>) {
  const state = {
    userVersion,
    cols: Object.fromEntries(
      Object.entries(cols).map(([k, v]) => [k, new Set(v)]),
    ),
    sql: [] as string[],
  };
  const db: any = {
    state,
    getFirstAsync: jest.fn(async (q: string) =>
      q.includes("user_version") ? { user_version: state.userVersion } : null,
    ),
    getAllAsync: jest.fn(async (q: string) => {
      const t = /table_info\((\w+)\)/.exec(q)![1];
      return [...(state.cols[t] ?? [])].map((name) => ({ name }));
    }),
    execAsync: jest.fn(async (q: string) => {
      state.sql.push(q);
      const add = /ALTER TABLE (\w+) ADD COLUMN (\w+)/.exec(q);
      if (add) state.cols[add[1]].add(add[2]);
      const uv = /PRAGMA user_version = (\d+)/.exec(q);
      if (uv) state.userVersion = Number(uv[1]);
    }),
    runAsync: jest.fn(),
  };
  return db;
}

const legacy = () => ({
  work_sessions: ["id", "start_time", "status", "target_latitude"],
  settings: ["id", "hourly_rate", "overtime_multiplier"],
  system_logs: ["id", "timestamp"],
});

describe("A.7 migraciones versionadas", () => {
  it("BD legada (v0) sube a la versión actual agregando columnas sin borrar nada", async () => {
    const db = fakeDb(0, legacy());
    await runMigrations(db);
    expect(db.state.userVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.state.cols.work_sessions.has("hourly_rate")).toBe(true);
    expect(db.state.cols.work_sessions.has("overtime_multiplier")).toBe(true);
    expect(db.state.cols.settings.has("distance_warning_meters")).toBe(true);
    expect(db.state.cols.work_sessions.has("target_latitude")).toBe(true);
    expect(db.state.sql.some((q: string) => /\bDROP\s|\bDELETE\s+FROM\b/i.test(q))).toBe(
      false,
    );
  });

  it("es idempotente: en la versión actual no ejecuta nada", async () => {
    const db = fakeDb(0, legacy());
    await runMigrations(db);
    const n = db.state.sql.length;
    await runMigrations(db);
    expect(db.state.sql.length).toBe(n);
  });

  it("si un paso falla hace ROLLBACK y no sube la versión", async () => {
    const db = fakeDb(1, legacy());
    db.execAsync.mockImplementation(async (q: string) => {
      db.state.sql.push(q);
      if (q.startsWith("ALTER")) throw new Error("disk full");
    });
    await expect(runMigrations(db)).rejects.toThrow("disk full");
    expect(db.state.sql).toContain("ROLLBACK");
    expect(db.state.userVersion).toBe(1);
  });

  it("v3 rellena la tarifa de jornadas existentes con la tarifa actual", async () => {
    const db = fakeDb(2, legacy());
    await runMigrations(db);
    const sql = db.state.sql.join("\n");
    expect(sql).toMatch(/UPDATE work_sessions\s+SET hourly_rate = COALESCE/);
    expect(sql).toMatch(/WHERE hourly_rate IS NULL/);
    expect(sql).toMatch(/WHERE overtime_multiplier IS NULL/);
  });

  it("v4 agrega close_reason / is_deleted / parent_session_id / setup_address y ajustes nuevos", async () => {
    const db = fakeDb(3, legacy());
    await runMigrations(db);
    for (const c of ["close_reason", "is_deleted", "parent_session_id", "setup_address"])
      expect(db.state.cols.work_sessions.has(c)).toBe(true);
    for (const c of ["exit_confirm_readings", "lunch_reminder_enabled", "lunch_reminder_time"])
      expect(db.state.cols.settings.has(c)).toBe(true);
    const sql = db.state.sql.join("\n");
    expect(sql).toMatch(/SET is_deleted = 1/);
    expect(sql).toMatch(/Work session soft-deleted/);
    expect(db.state.userVersion).toBe(4);
  });
});
