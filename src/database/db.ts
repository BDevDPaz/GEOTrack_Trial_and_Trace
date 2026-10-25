import * as SQLite from "expo-sqlite";
import dayjs from "../utils/dayjsSetup";
// types removed
import { log, logAudit, setLoggerDB, AUDIT_ACTIONS } from "../utils/logger";

type AppSettings = any;
type WorkSession = any;

const DB_NAME = "ledtracker_v2.db";

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let dbReady = false;

const nowMs = (): number => dayjs().valueOf();

async function openDbOnce(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(DB_NAME);
  return db;
}

async function configureDatabase(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const walResult = await database.getFirstAsync<{ journal_mode?: string }>(
    "PRAGMA journal_mode = WAL",
  );

  await database.execAsync(`
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
  `);

  log("VERDE", "SERVICIOS_ACTIVOS", "INFO", "PRAGMAs SQLite configurados", {
    journal_mode: walResult?.journal_mode ?? "unknown",
    synchronous: "NORMAL",
    foreign_keys: "ON",
  });
}

async function getTableColumns(
  database: SQLite.SQLiteDatabase,
  tableName: string,
): Promise<Set<string>> {
  const rows = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${tableName});`,
  );

  return new Set(rows.map((row) => row.name));
}

async function addColumnIfMissing(
  database: SQLite.SQLiteDatabase,
  existingColumns: Set<string>,
  tableName: string,
  columnName: string,
  definition: string,
): Promise<void> {
  if (existingColumns.has(columnName)) {
    return;
  }

  await database.execAsync(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`,
  );

  existingColumns.add(columnName);
}

async function migrateWorkSessionsSchema(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const columns = await getTableColumns(database, "work_sessions");

  await addColumnIfMissing(
    database,
    columns,
    "work_sessions",
    "total_paused_ms",
    "INTEGER DEFAULT 0",
  );

  await addColumnIfMissing(
    database,
    columns,
    "work_sessions",
    "last_pause_start_ms",
    "INTEGER",
  );
}

async function migrateSystemLogsSchema(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const columns = await getTableColumns(database, "system_logs");

  await addColumnIfMissing(database, columns, "system_logs", "user_id", "TEXT");

  await addColumnIfMissing(
    database,
    columns,
    "system_logs",
    "session_id",
    "INTEGER",
  );

  await addColumnIfMissing(
    database,
    columns,
    "system_logs",
    "from_state",
    "TEXT",
  );

  await addColumnIfMissing(
    database,
    columns,
    "system_logs",
    "to_state",
    "TEXT",
  );

  await addColumnIfMissing(
    database,
    columns,
    "system_logs",
    "event_type",
    "TEXT",
  );

  await addColumnIfMissing(
    database,
    columns,
    "system_logs",
    "location",
    "TEXT",
  );

  await addColumnIfMissing(
    database,
    columns,
    "system_logs",
    "device_state",
    "TEXT",
  );

  await addColumnIfMissing(
    database,
    columns,
    "system_logs",
    "trigger_source",
    "TEXT",
  );

  await addColumnIfMissing(database, columns, "system_logs", "reason", "TEXT");

  await addColumnIfMissing(
    database,
    columns,
    "system_logs",
    "signature",
    "TEXT",
  );

  await addColumnIfMissing(
    database,
    columns,
    "system_logs",
    "event_state",
    "TEXT",
  );

  await addColumnIfMissing(
    database,
    columns,
    "system_logs",
    "sync_status",
    "TEXT DEFAULT 'PENDING'",
  );
}

/**
 * Migraciones versionadas (PRAGMA user_version).
 * Reglas: solo aditivas (ADD COLUMN / UPDATE de relleno), nunca borran datos,
 * cada paso es idempotente y corre en su propia transacción.
 */
export const SCHEMA_MIGRATIONS: {
  version: number;
  description: string;
  up: (database: SQLite.SQLiteDatabase) => Promise<void>;
}[] = [
  {
    version: 1,
    description: "Esquema legado (pausas + columnas extendidas de system_logs)",
    up: async (database) => {
      await migrateWorkSessionsSchema(database);
      await migrateSystemLogsSchema(database);
    },
  },
  {
    version: 2,
    description:
      "Fase A: tarifa congelada por jornada + distancia de aviso al iniciar",
    up: async (database) => {
      const sessionCols = await getTableColumns(database, "work_sessions");
      await addColumnIfMissing(
        database,
        sessionCols,
        "work_sessions",
        "hourly_rate",
        "REAL",
      );
      await addColumnIfMissing(
        database,
        sessionCols,
        "work_sessions",
        "overtime_multiplier",
        "REAL",
      );
      const settingsCols = await getTableColumns(database, "settings");
      await addColumnIfMissing(
        database,
        settingsCols,
        "settings",
        "distance_warning_meters",
        "INTEGER DEFAULT 2000",
      );
    },
  },
  {
    version: 3,
    description:
      "Fase A: rellenar tarifa congelada de jornadas existentes con la tarifa actual",
    up: async (database) => {
      // Decisión aceptada: las jornadas previas quedan con la tarifa vigente
      // al momento de migrar (no existe historial de tarifas anterior).
      await database.execAsync(`
        UPDATE work_sessions
        SET hourly_rate = COALESCE((SELECT hourly_rate FROM settings WHERE id = 1), 0)
        WHERE hourly_rate IS NULL;
        UPDATE work_sessions
        SET overtime_multiplier = COALESCE((SELECT overtime_multiplier FROM settings WHERE id = 1), 1.5)
        WHERE overtime_multiplier IS NULL;
      `);
    },
  },
  {
    version: 4,
    description:
      "Fases B–D: motivo de cierre, borrado lógico explícito, tramos encadenados, dirección inversa y ajustes nuevos",
    up: async (database) => {
      const sessionCols = await getTableColumns(database, "work_sessions");
      const add = (col: string, type: string) =>
        addColumnIfMissing(database, sessionCols, "work_sessions", col, type);
      await add("close_reason", "TEXT");
      await add("is_deleted", "INTEGER DEFAULT 0");
      await add("parent_session_id", "INTEGER");
      await add("setup_address", "TEXT");
      const settingsCols = await getTableColumns(database, "settings");
      const addS = (col: string, type: string) =>
        addColumnIfMissing(database, settingsCols, "settings", col, type);
      await addS("exit_confirm_readings", "INTEGER DEFAULT 3");
      await addS("lunch_reminder_enabled", "INTEGER DEFAULT 0");
      await addS("lunch_reminder_time", "TEXT DEFAULT '12:00'");
      // Relleno conservador: hasta v3 'CLOSED' servía tanto para cerradas como
      // para borradas. Solo se marcan borradas las que tienen la entrada de
      // auditoría "Work session soft-deleted" (heurística: requiere confirmación).
      await database.execAsync(`
        UPDATE work_sessions SET is_deleted = 1
        WHERE COALESCE(is_deleted, 0) = 0
          AND id IN (SELECT session_id FROM audit_logs
                     WHERE details = 'Work session soft-deleted'
                       AND session_id IS NOT NULL);
      `);
    },
  },
  {
    version: 5,
    description: "Item 3: minutos reales de almuerzo",
    up: async (database) => {
      const cols = await getTableColumns(database, "work_sessions");
      await addColumnIfMissing(database, cols, "work_sessions", "lunch_minutes", "INTEGER");
      await database.execAsync(`
        UPDATE work_sessions SET lunch_minutes =
          CAST(ROUND((lunch_end - lunch_start) / 60000.0) AS INTEGER)
        WHERE lunch_taken = 1 AND lunch_minutes IS NULL
          AND COALESCE(lunch_start, 0) > 0 AND lunch_end >= lunch_start;
      `);
    },
  },
];

export const CURRENT_SCHEMA_VERSION =
  SCHEMA_MIGRATIONS[SCHEMA_MIGRATIONS.length - 1].version;

export async function runMigrations(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const row = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version;",
  );
  const current = row?.user_version ?? 0;

  for (const migration of SCHEMA_MIGRATIONS) {
    if (migration.version <= current) continue;
    await database.execAsync("BEGIN IMMEDIATE TRANSACTION");
    try {
      await migration.up(database);
      await database.execAsync(`PRAGMA user_version = ${migration.version};`);
      await database.execAsync("COMMIT");
      log(
        "VERDE",
        "SERVICIOS_ACTIVOS",
        "INFO",
        `Migración DB v${migration.version} aplicada`,
        {
          description: migration.description,
        },
      );
    } catch (error) {
      try {
        await database.execAsync("ROLLBACK");
      } catch {
        // rollback secundario ignorado
      }
      log(
        "ROJO",
        "SISTEMA",
        "ERROR",
        `Migración DB v${migration.version} falló`,
        error,
      );
      throw error;
    }
  }
}

async function runInTransaction<T>(
  work: (database: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const database = await ensureDbReady();

  try {
    await database.execAsync("BEGIN IMMEDIATE TRANSACTION");
    const result = await work(database);
    await database.execAsync("COMMIT");
    return result;
  } catch (error) {
    try {
      await database.execAsync("ROLLBACK");
    } catch {
      // rollback secundario ignorado
    }
    throw error;
  }
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbReady && db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const database = await openDbOnce();

    await configureDatabase(database);

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS work_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time INTEGER NOT NULL,
        actual_start_time INTEGER,
        end_time INTEGER,
        status TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        target_latitude REAL,
        target_longitude REAL,
        setup_latitude REAL,
        setup_longitude REAL,
        address TEXT,
        client_name TEXT,
        location_confirmed INTEGER DEFAULT 0,
        is_manual_edit INTEGER DEFAULT 0,
        manual_note TEXT,
        lunch_taken INTEGER DEFAULT 0,
        lunch_start INTEGER,
        lunch_end INTEGER,
        total_paused_ms INTEGER DEFAULT 0,
        last_pause_start_ms INTEGER,
        date_string TEXT,
        hourly_rate REAL,
        overtime_multiplier REAL
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY NOT NULL,
        employee_name TEXT,
        employer_name TEXT,
        company_email TEXT,
        tolerance_radius INTEGER DEFAULT 200,
        hourly_rate REAL DEFAULT 0,
        language TEXT DEFAULT 'es',
        start_time TEXT DEFAULT '08:00',
        overtime_multiplier REAL DEFAULT 1.5,
        distance_warning_meters INTEGER DEFAULT 2000
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        action_type TEXT,
        details TEXT,
        timestamp INTEGER
      );

      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER,
        timestamp_str TEXT,
        color TEXT,
        categoria TEXT,
        severidad TEXT,
        mensaje TEXT,
        metadata TEXT,
        user_id TEXT,
        session_id INTEGER,
        from_state TEXT,
        to_state TEXT,
        event_type TEXT,
        location TEXT,
        device_state TEXT,
        trigger_source TEXT,
        reason TEXT,
        signature TEXT,
        event_state TEXT,
        sync_status TEXT DEFAULT 'PENDING'
      );
    `);

    await runMigrations(database);

    setLoggerDB(database);

    const result = await database.runAsync(
      `INSERT OR IGNORE INTO settings (
        id, employee_name, employer_name, company_email,
        tolerance_radius, hourly_rate, language, start_time, overtime_multiplier
      ) VALUES (1, 'Empleado Nuevo', 'LEON''S ELECTRICAL DESIGN', '', 200, 25.0, 'es', '07:00', 1.5)`,
    );

    if (result.changes > 0) {
      log(
        "VERDE",
        "OPERACION_EXITOSA",
        "INFO",
        "Base de datos nueva: creando configuración por defecto...",
      );
    }

    dbReady = true;
    log(
      "VERDE",
      "SERVICIOS_ACTIVOS",
      "INFO",
      "DB inicializada de forma segura",
    );

    return database;
  })();

  try {
    return await initPromise;
  } finally {
    if (!dbReady) {
      initPromise = null;
    }
  }
}

export async function ensureDbReady(): Promise<SQLite.SQLiteDatabase> {
  if (!dbReady || !db) return initDatabase();
  return db;
}

export function isDatabaseReady(): boolean {
  return dbReady;
}

export function getDB(): SQLite.SQLiteDatabase {
  if (!dbReady || !db) {
    throw new Error(
      "Base de datos no inicializada. Usa ensureDbReady() primero.",
    );
  }
  return db;
}

// --------------------------------------------------
// CRUD / helpers exportados
// --------------------------------------------------

/**
 * SQL de alta de jornada. Si el motor ya asignó un id (p.ej. Date.now() en
 * la UI), se inserta con ese id para que motor, geocerca (SESSION_<id>) y BD
 * hablen de la misma fila. Sin id → autoincrement (comportamiento previo).
 */
export function buildInsertSessionSql(session: WorkSession): {
  sql: string;
  params: any[];
} {
  const cols = [
    "start_time", "status", "latitude", "longitude",
    "target_latitude", "target_longitude",
    "setup_latitude", "setup_longitude",
    "address", "client_name", "manual_note",
    "location_confirmed", "is_manual_edit", "lunch_taken",
    "total_paused_ms", "last_pause_start_ms", "date_string",
    "hourly_rate", "overtime_multiplier", "parent_session_id",
  ];
  const params: any[] = [
    session.start_time,
    session.status,
    session.latitude,
    session.longitude,
    session.target_latitude ?? null,
    session.target_longitude ?? null,
    session.setup_latitude ?? null,
    session.setup_longitude ?? null,
    session.address,
    session.client_name || "",
    session.manual_note || "",
    session.location_confirmed,
    session.is_manual_edit,
    session.lunch_taken,
    session.total_paused_ms ?? 0,
    session.last_pause_start_ms ?? null,
    session.date_string,
    session.hourly_rate ?? null,
    session.overtime_multiplier ?? null,
    (session as any).parent_session_id ?? null,
  ];
  const id = Number((session as any).id);
  if (Number.isSafeInteger(id) && id > 0) {
    cols.unshift("id");
    params.unshift(id);
  }
  return {
    sql: `INSERT INTO work_sessions (${cols.join(", ")}) VALUES (${cols
      .map(() => "?")
      .join(", ")})`,
    params,
  };
}

export const insertWorkSession = async (session: WorkSession) => {
  try {
    const lastInsertRowId = await runInTransaction(async (database) => {
      const { sql, params } = buildInsertSessionSql(session);
      const result = await database.runAsync(sql, params);

      const sessionId = Number(result.lastInsertRowId);

      await logAudit({
        session_id: sessionId,
        action_type: AUDIT_ACTIONS.MANUAL,
        details: "Work session created",
        timestamp: nowMs(),
      });

      return result.lastInsertRowId;
    });

    return lastInsertRowId;
  } catch (error) {
    log("ROJO", "ERROR_CRITICO", "ERROR", "Error inserting session", error);
    throw error;
  }
};

export const updateSessionEndTime = async (
  id: number,
  endTime: number,
  closeReason: string | null = null,
) => {
  await runInTransaction(async (database) => {
    await database.runAsync(
      `UPDATE work_sessions
       SET end_time = ?, status = 'CLOSED', last_pause_start_ms = NULL,
           close_reason = COALESCE(?, close_reason)
       WHERE id = ?`,
      [endTime, closeReason, id],
    );

    await logAudit({
      session_id: id,
      action_type:
        closeReason === "STALE_12H"
          ? "AUTO_CLOSE_STALE"
          : AUDIT_ACTIONS.AUTO_CHECKOUT,
      details: `Session CLOSED with end_time=${endTime}${closeReason ? ` reason=${closeReason}` : ""}`,
      timestamp: nowMs(),
    });
  });
};

export const updateSessionLunch = async (
  id: number,
  start: number,
  end: number,
  minutes: number,
) => {
  await runInTransaction(async (database) => {
    await database.runAsync(
      `UPDATE work_sessions
       SET lunch_taken = 1, lunch_start = ?, lunch_end = ?, lunch_minutes = ?
       WHERE id = ?`,
      [start, end, minutes, id],
    );

    await logAudit({
      session_id: id,
      action_type: AUDIT_ACTIONS.MANUAL,
      details: `Lunch updated: start=${start}, end=${end}, minutes=${minutes}`,
      timestamp: nowMs(),
    });
  });
};

export const getSettings = async (): Promise<AppSettings | null> => {
  const database = await ensureDbReady();
  return await database.getFirstAsync<AppSettings>(
    "SELECT * FROM settings WHERE id = 1",
  );
};

/**
 * Fase D (11): INSERT OR REPLACE reescribe la fila completa; antes omitía las
 * columnas v4 (salida/almuerzo) y las devolvía a su DEFAULT en cada guardado.
 */
export function buildSaveSettingsSql(settings: AppSettings): {
  sql: string;
  params: any[];
} {
  const readings = Number(settings.exit_confirm_readings);
  return {
    sql: `INSERT OR REPLACE INTO settings (
        id, employee_name, employer_name, company_email,
        tolerance_radius, hourly_rate, language, start_time, overtime_multiplier,
        distance_warning_meters, exit_confirm_readings,
        lunch_reminder_enabled, lunch_reminder_time
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      settings.employee_name,
      settings.employer_name,
      settings.company_email,
      settings.tolerance_radius,
      settings.hourly_rate,
      settings.language,
      settings.start_time,
      settings.overtime_multiplier,
      settings.distance_warning_meters ?? 2000,
      Number.isFinite(readings) && readings >= 1
        ? Math.min(10, Math.round(readings))
        : 3,
      settings.lunch_reminder_enabled ? 1 : 0,
      settings.lunch_reminder_time || "12:00",
    ],
  };
}

export const saveSettings = async (settings: AppSettings) => {
  await runInTransaction(async (database) => {
    const { sql, params } = buildSaveSettingsSql(settings);
    await database.runAsync(sql, params);

    await logAudit({
      session_id: null,
      action_type: AUDIT_ACTIONS.MANUAL,
      details: "Settings updated",
      timestamp: nowMs(),
    });
  });
};

export const deleteWorkSession = async (id: number) => {
  await runInTransaction(async (database) => {
    await database.runAsync(
      `UPDATE work_sessions
       SET status = 'CLOSED', is_deleted = 1
       WHERE id = ?`,
      [id],
    );

    await logAudit({
      session_id: id,
      action_type: AUDIT_ACTIONS.MANUAL,
      details: "Work session soft-deleted",
      timestamp: nowMs(),
    });
  });
};

/**
 * Fase C (8): cancela un trayecto pendiente (sin llegada). Borrado lógico,
 * close_reason = 'CANCELLED' y auditoría CANCEL_TRIP.
 * Portado de LED020326 `handleCancelPending` (allí borraba la fila).
 */
export const cancelPendingSession = async (id: number) => {
  await runInTransaction(async (database) => {
    await database.runAsync(
      `UPDATE work_sessions
       SET status = 'CLOSED', is_deleted = 1, close_reason = 'CANCELLED'
       WHERE id = ? AND actual_start_time IS NULL`,
      [id],
    );
    await logAudit({
      session_id: id,
      action_type: "CANCEL_TRIP",
      details: "Pending trip cancelled before arrival",
      timestamp: nowMs(),
    });
  });
};

/** Fase C (7): vincula el tramo de tránsito con la jornada anterior. */
export const setSessionParent = async (id: number, parentId: number) => {
  await runInTransaction(async (database) => {
    await database.runAsync(
      `UPDATE work_sessions SET parent_session_id = ? WHERE id = ?`,
      [parentId, id],
    );
  });
};

/** Fase D (12): guarda la dirección legible del punto de configuración. */
export const updateSessionSetupAddress = async (
  id: number,
  setupAddress: string,
) => {
  await runInTransaction(async (database) => {
    await database.runAsync(
      `UPDATE work_sessions SET setup_address = ? WHERE id = ?`,
      [setupAddress, id],
    );
  });
};

export const updateWorkSessionManual = async (
  id: number,
  startTime: number,
  endTime: number | null,
  note: string,
) => {
  await runInTransaction(async (database) => {
    await database.runAsync(
      `UPDATE work_sessions
       SET start_time = ?, end_time = ?, manual_note = ?, is_manual_edit = 1
       WHERE id = ?`,
      [startTime, endTime, note, id],
    );

    await logAudit({
      session_id: id,
      action_type: AUDIT_ACTIONS.MANUAL,
      details: `Manual session update: start=${startTime}, end=${endTime}, note=${note}`,
      timestamp: nowMs(),
    });
  });
};

export const checkSessionOverlap = async (
  start: number,
  end: number,
  excludeId: number,
): Promise<boolean> => {
  const database = await ensureDbReady();

  const effectiveEnd = end || Number.MAX_SAFE_INTEGER;

  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM work_sessions
     WHERE id != ?
       AND COALESCE(is_deleted, 0) = 0
       AND COALESCE(end_time, ?) > ?
       AND start_time < ?`,
    [excludeId, Number.MAX_SAFE_INTEGER, start, effectiveEnd],
  );

  return (result?.count ?? 0) > 0;
};

export const insertAuditLog = async (
  sessionId: number,
  action: string,
  details: string,
) => {
  await logAudit({
    session_id: sessionId,
    action_type: action,
    details,
    timestamp: nowMs(),
  });
};

export const getWeeklyStats = async (
  mondayTs: number,
  nowTs: number,
): Promise<number> => {
  const database = await ensureDbReady();

  const result = await database.getFirstAsync<{ total_ms: number }>(
    `SELECT SUM(
        MAX(
          0,
          COALESCE(end_time, ?) - start_time -
          (CASE WHEN lunch_taken = 1 THEN COALESCE(lunch_minutes, 60) * 60000 ELSE 0 END) -
          COALESCE(total_paused_ms, 0)
        )
      ) as total_ms
     FROM work_sessions
     WHERE COALESCE(is_deleted, 0) = 0
       AND start_time >= ?`,
    [nowTs, mondayTs],
  );

  return result?.total_ms || 0;
};

export const getAllAsync = async <T>(
  query: string,
  params: any[] = [],
): Promise<T[]> => {
  const database = await ensureDbReady();
  return await database.getAllAsync<T>(query, params);
};

export const getFirstAsync = async <T>(
  query: string,
  params: any[] = [],
): Promise<T | null> => {
  const database = await ensureDbReady();
  return await database.getFirstAsync<T>(query, params);
};

// aliases usados por auditoría / otras capas
export const createSession = insertWorkSession;
export const closeSession = updateSessionEndTime;
export const deleteSession = deleteWorkSession;

export const confirmSessionArrival = async (
  id: number,
  actualStartTime: number,
) => {
  await runInTransaction(async (database) => {
    await database.runAsync(
      `UPDATE work_sessions
       SET actual_start_time = ?, status = 'ACTIVE_WORK', location_confirmed = 1
       WHERE id = ?`,
      [actualStartTime, id],
    );

    await logAudit({
      session_id: id,
      action_type: "AUTO_CHECKIN_GPS",
      details: `Arrival confirmed at ${actualStartTime}`,
      timestamp: nowMs(),
    });
  });
};

export const updateSessionStatus = async (id: number, status: string) => {
  await runInTransaction(async (database) => {
    await database.runAsync(
      `UPDATE work_sessions SET status = ? WHERE id = ?`,
      [status, id],
    );
  });
};

export const getOpenSession = async (): Promise<WorkSession | null> => {
  const database = await ensureDbReady();
  return await database.getFirstAsync<WorkSession>(
    `SELECT * FROM work_sessions
     WHERE status NOT IN ('CLOSED', 'CLOSED')
     ORDER BY start_time DESC
     LIMIT 1`,
  );
};

/** Fase C (7): persiste el destino de un tramo (antes solo vivía en memoria). */
export const updateSessionDestination = async (
  id: number,
  d: {
    address?: string | null;
    targetLatitude?: number | null;
    targetLongitude?: number | null;
    setupLatitude?: number | null;
    setupLongitude?: number | null;
  },
) => {
  const database = getDB();
  await database.runAsync(
    `UPDATE work_sessions SET
       address = COALESCE(?, address),
       target_latitude = COALESCE(?, target_latitude),
       target_longitude = COALESCE(?, target_longitude),
       setup_latitude = COALESCE(?, setup_latitude),
       setup_longitude = COALESCE(?, setup_longitude)
     WHERE id = ?`,
    [
      d.address ?? null,
      d.targetLatitude ?? null,
      d.targetLongitude ?? null,
      d.setupLatitude ?? null,
      d.setupLongitude ?? null,
      id,
    ],
  );
};
