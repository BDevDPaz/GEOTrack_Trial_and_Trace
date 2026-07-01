---

# 💾 INVENTARIO TÉCNICO COMPLETO: CAPA DE DATOS
## GEOTrack_Trial_and_Trace | SQLite + Persistencia + Data Integrity

---

## I. MODELO CONCEPTUAL DE DATOS

### **Diagrama Entidad-Relación (ER)**

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         WORK_SESSIONS (Jornadas)                           │
├────────────────────────────────────────────────────────────────────────────┤
│ PK │ id: INTEGER PRIMARY KEY AUTOINCREMENT                                │
├────┼────────────────────────────────────────────────────────────────────────┤
│    │ start_time: INTEGER NOT NULL                   [Hora declarada en ms] │
│    │ actual_start_time: INTEGER                     [Hora real entrada GPS]│
│    │ end_time: INTEGER                              [Hora cierre en ms]   │
│    │ status: TEXT NOT NULL                          [pending_arrival|...] │
│    │                                                                        │
│    │ ┌─ UBICACIONES ─────────────────────────────────────────────────────┐ │
│    │ │ latitude: REAL                               [Ubicación usuario]   │ │
│    │ │ longitude: REAL                              [Ubicación usuario]   │ │
│    │ │ target_latitude: REAL                        [Destino objetivo]   │ │
│    │ │ target_longitude: REAL                       [Destino objetivo]   │ │
│    │ │ setup_latitude: REAL                         [Setup inicial]      │ │
│    │ │ setup_longitude: REAL                        [Setup inicial]      │ │
│    │ │ location_confirmed: INTEGER (0|1)           [¿GPS o manual?]     │ │
│    │ └────────────────────────────────────────────────────────────────────┘ │
│    │                                                                        │
│    │ ┌─ DATOS TRABAJO ───────────────────────────────────────────────────┐ │
│    │ │ address: TEXT                                [Dirección sitio]    │ │
│    │ │ client_name: TEXT                            [Cliente/proyecto]  │ │
│    │ │ manual_note: TEXT                            [Notas edición]     │ │
│    │ └────────────────────────────────────────────────────────────────────┘ │
│    │                                                                        │
│    │ ┌─ ALMUERZO ────────────────────────────────────────────────────────┐ │
│    │ │ lunch_taken: INTEGER (0|1)                   [¿Almuerzo?]        │ │
│    │ │ lunch_start: INTEGER                         [Hora inicio ms]    │ │
│    │ │ lunch_end: INTEGER                           [Hora fin ms]       │ │
│    │ └────────────────────────────────────────────────────────────────────┘ │
│    │                                                                        │
│    │ ┌─ METADATA ────────────────────────────────────────────────────────┐ │
│    │ │ is_manual_edit: INTEGER (0|1)                [Editada manualmente]│ │
│    │ │ date_string: TEXT                            [YYYY-MM-DD]        │ │
│    │ └────────────────────────────────────────────────────────────────────┘ │
│ idx│ INDEX (status, id DESC)                         [Queries frecuentes]  │
│ idx│ INDEX (start_time)                              [Reportes]           │
└────┴────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                          SETTINGS (Configuración)                           │
├────────────────────────────────────────────────────────────────────────────┤
│ PK │ id: INTEGER PRIMARY KEY NOT NULL (always 1)                          │
├────┼────────────────────────────────────────────────────────────────────────┤
│    │ employee_name: TEXT                            [Nombre empleado]    │
│    │ employer_name: TEXT                            [Nombre empresa]     │
│    │ company_email: TEXT                            [Email empresa]      │
│    │ tolerance_radius: INTEGER DEFAULT 200          [Radio geofence m]  │
│    │ hourly_rate: REAL DEFAULT 0                    [Tarifa $/hora]     │
│    │ language: TEXT DEFAULT 'es'                    [es | en]           │
│    │ start_time: TEXT DEFAULT '08:00'               [HH:MM notificación]│
│    │ overtime_multiplier: REAL DEFAULT 1.5          [Multiplicador x]   │
└────┴────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                         AUDIT_LOGS (Auditoría)                             │
├────────────────────────────────────────────────────────────────────────────┤
│ PK │ id: INTEGER PRIMARY KEY AUTOINCREMENT                                │
├────┼────────────────────────────────────────────────────────────────────────┤
│ FK │ session_id: INTEGER                            [REFERENCES sessions] │
│    │ action_type: TEXT                              [AUTO_CHECKIN_GPS...]│
│    │ details: TEXT                                  [Descripción libre]  │
│    │ timestamp: INTEGER NOT NULL                    [Timestamp ms]       │
│ idx│ INDEX (session_id, timestamp)                  [Queries por sesión] │
└────┴────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                      SYSTEM_LOGS (Logs de Sistema)                         │
├────────────────────────────────────────────────────────────────────────────┤
│ PK │ id: INTEGER PRIMARY KEY AUTOINCREMENT                                │
├────┼────────────────────────────────────────────────────────────────────────┤
│    │ timestamp: INTEGER NOT NULL                    [Timestamp ms]       │
│    │ timestamp_str: TEXT                            [ISO 8601]           │
│    │ color: TEXT                                    [VERDE|ROJO|...]    │
│    │ categoria: TEXT                                [OPERACION_EXITOSA..│
│    │ severidad: TEXT                                [INFO|WARN|ERROR...]│
│    │ mensaje: TEXT                                  [Mensaje libre]      │
│    │ metadata: TEXT (JSON)                          [Metadata serializada]│
│ idx│ INDEX (timestamp, categoria)                   [Queries rápidas]    │
└────┴────────────────────────────────────────────────────────────────────────┘

RELACIONES:
═══════════════════════════════════════════════════════════════════════════════
work_sessions (1) ──── (∞) audit_logs
                       └─ PK session_id
                       └─ Cascade delete (NO implementado ⚠️)

CONSTRAINTS ACTIVAS:
═══════════════════════════════════════════════════════════════════════════════
✅ PRAGMA foreign_keys = ON                    [Integridad referencial]
✅ PRAGMA synchronous = NORMAL                 [Durabilidad → performance]
✅ PRAGMA journal_mode = WAL                   [Write-Ahead Logging]
```

---

## II. TABLA DE ENTIDADES Y ATRIBUTOS

### **work_sessions (Tabla Principal)**

| Campo | Tipo | Null | Default | Rango/Validación | Purpose |
|---|---|---|---|---|---|
| **id** | INTEGER | ❌ | AUTOINCREMENT | > 0 | PK |
| **start_time** | INTEGER | ❌ | — | Unix ms | Hora declarada (user input) |
| **actual_start_time** | INTEGER | ✅ | NULL | Unix ms | Hora real (GPS enter) |
| **end_time** | INTEGER | ✅ | NULL | Unix ms | Hora cierre (GPS exit + 15min) |
| **status** | TEXT | ❌ | — | 5 valores | **State machine**: pending_arrival → travel → active → completed / deleted |
| **latitude** | REAL | ✅ | NULL | [-90, 90] | Current user location |
| **longitude** | REAL | ✅ | NULL | [-180, 180] | Current user location |
| **target_latitude** | REAL | ✅ | NULL | [-90, 90] | Destination coordinates |
| **target_longitude** | REAL | ✅ | NULL | [-180, 180] | Destination coordinates |
| **setup_latitude** | REAL | ✅ | NULL | [-90, 90] | Initial GPS warmup |
| **setup_longitude** | REAL | ✅ | NULL | [-180, 180] | Initial GPS warmup |
| **address** | TEXT | ✅ | '' | any | Work site address |
| **client_name** | TEXT | ✅ | '' | any | Client/project name |
| **location_confirmed** | INTEGER | ✅ | 0 | 0\|1 | Boolean: GPS confirmed or manual? |
| **is_manual_edit** | INTEGER | ✅ | 0 | 0\|1 | Boolean: edited after creation? |
| **manual_note** | TEXT | ✅ | '' | any | Edit notes/audit |
| **lunch_taken** | INTEGER | ✅ | 0 | 0\|1 | Boolean: almuerzo incluido? |
| **lunch_start** | INTEGER | ✅ | NULL | Unix ms | Lunch begin |
| **lunch_end** | INTEGER | ✅ | NULL | Unix ms | Lunch end |
| **date_string** | TEXT | ✅ | NULL | YYYY-MM-DD | Booking date |

**Status Values** (Enum):
```
pending_arrival    ← User created, waiting for GPS entry
travel             ← User en route to destination
active             ← GPS confirmed arrival, session ongoing
completed          ← Session ended (auto-checkout or manual)
deleted            ← Soft-deleted (never hard-deleted)
```

### **settings (Configuración Global)**

| Campo | Tipo | Null | Default | Purpose |
|---|---|---|---|---|
| **id** | INTEGER | ❌ | 1 | PK (singleton: always 1) |
| **employee_name** | TEXT | ✅ | 'Empleado Nuevo' | User name |
| **employer_name** | TEXT | ✅ | "LEON'S ELECTRICAL DESIGN" | Company |
| **company_email** | TEXT | ✅ | '' | For reports |
| **tolerance_radius** | INTEGER | ✅ | 200 | Geofence radius (meters) |
| **hourly_rate** | REAL | ✅ | 0 | $/hour for payroll |
| **language** | TEXT | ✅ | 'es' | es \| en |
| **start_time** | TEXT | ✅ | '07:00' | HH:MM daily reminder |
| **overtime_multiplier** | REAL | ✅ | 1.5 | Overtime rate factor |

### **audit_logs (Auditoría)**

| Campo | Tipo | Null | Default | Purpose |
|---|---|---|---|---|
| **id** | INTEGER | ❌ | AUTOINCREMENT | PK |
| **session_id** | INTEGER | ✅ | NULL | FK → work_sessions.id |
| **action_type** | TEXT | ❌ | — | Action enum (see below) |
| **details** | TEXT | ✅ | '' | Human-readable description |
| **timestamp** | INTEGER | ❌ | — | Unix ms |

**action_type Values**:
```
AUTO_CHECKIN_GPS           ← Geofence entry detected
AUTO_CHECKOUT_GPS          ← Failsafe 15min expired
MANUAL                     ← User manual edit
GEOFENCE_EXIT              ← Geofence exit detected
SESSION_CREATED            ← New session
SESSION_TRANSIT_STARTED    ← Transit mode
LOCATION                   ← Location change
PDF                        ← Report generated
PAYROLL                    ← Payroll calculation
OVERLAP                    ← Overlap detected
MUTEX                      ← Concurrent exec blocked
```

### **system_logs (Logs del Sistema)**

| Campo | Tipo | Null | Default | Purpose |
|---|---|---|---|---|
| **id** | INTEGER | ❌ | AUTOINCREMENT | PK |
| **timestamp** | INTEGER | ❌ | — | Unix ms |
| **timestamp_str** | TEXT | ✅ | NULL | ISO 8601 string |
| **color** | TEXT | ✅ | NULL | Log level icon (VERDE, ROJO, etc.) |
| **categoria** | TEXT | ✅ | NULL | Log category |
| **severidad** | TEXT | ✅ | NULL | INFO, WARN, ERROR, DEBUG, EVENT |
| **mensaje** | TEXT | ✅ | NULL | Log message |
| **metadata** | TEXT | ✅ | NULL | JSON serialized |

---

## III. FLUJO DE LECTURA/ESCRITURA COMPLETO

### **FLUJO 1: USER CREA SESIÓN**

```
USER ACTION: Taps "Iniciar Jornada" button
    ↓
UI dispatch(SESSION_CREATED, session: {
  declaredStartAtMs: now(),
  destination: { address, clientName, targetLat, targetLng },
  ...
})
    ↓
ENGINE: reduce + effects
    ├─ REDUCE: state.domain.sessions.byId[id] = session
    │
    └─ EFFECTS: handleSessionCreated()
        ├─ runtime.sessionStore.createSession(session)
        │   ↓
        │   sessionStoreAdapter.createSession(session)
        │   │
        │   ├─ mapCanonicalSessionToDb(session)
        │   │  └─ Convierte SessionRecord → DbWorkSessionRow
        │   │     ├─ declaredStartAtMs → start_time
        │   │     ├─ destination.targetLatitude → target_latitude
        │   │     ├─ lifecycle.domainStatus → status
        │   │     └─ ... (20+ field mappings)
        │   │
        │   ├─ DB.insertWorkSession(dbPayload)
        │   │  ↓
        │   │  database/db.ts: insertWorkSession()
        │   │  │
        │   │  └─ db.runAsync(
        │   │      `INSERT INTO work_sessions (
        │   │         start_time, status, latitude, longitude,
        │   │         target_latitude, target_longitude,
        │   │         address, client_name, date_string,
        │   │         ... [14 más campos] ...
        │   │       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ...)`,
        │   │      [now, 'pending_arrival', null, null, lat, lng, ...]
        │   │    )
        │   │    ↓
        │   │    [Native SQLite INSERT]
        │   │    ├─ nextRowId = lastInsertRowId
        │   │    ├─ status: pending_arrival ✓
        │   │    └─ changes: 1
        │   │
        │   └─ logAudit({
        │       session_id: insertedId,
        │       action_type: 'MANUAL',
        │       details: 'Work session created',
        │       timestamp: nowMs()
        │     })
        │     ↓
        │     logger.ts: logAudit()
        │     ├─ dbInstance.runAsync(
        │     │  `INSERT INTO audit_logs (
        │     │     session_id, action_type, details, timestamp
        │     │   ) VALUES (?, ?, ?, ?)`
        │     │ )
        │     └─ [Native SQLite INSERT]
        │
        └─ runtime.location.startMonitoringArrival(lat, lng, radius)
            └─ Location.startGeofencingAsync(GEOFENCE_TASK, [...])
                └─ [Native geofencing task registered]

RESULT:
├─ ✅ work_sessions row inserted (id=42, status='pending_arrival')
├─ ✅ audit_logs row inserted (session_id=42, action='MANUAL')
├─ ✅ GPS geofencing activated
└─ ✅ State canónico actualizado
```

**SQL Trace**:
```sql
-- Executed in transaction
BEGIN IMMEDIATE TRANSACTION;

INSERT INTO work_sessions (
  start_time, status, latitude, longitude,
  target_latitude, target_longitude,
  setup_latitude, setup_longitude,
  address, client_name, manual_note,
  location_confirmed, is_manual_edit, lunch_taken, date_string
) VALUES (
  1717897200000,              -- start_time (now)
  'pending_arrival',          -- status
  NULL, NULL,                 -- captured location (null initially)
  40.7128, -74.0060,         -- target location
  NULL, NULL,                 -- setup location
  '123 Main St, NYC',         -- address
  'ACME Corp',                -- client_name
  '',                         -- manual_note
  0,                          -- location_confirmed
  0,                          -- is_manual_edit
  0,                          -- lunch_taken
  '2024-06-09'                -- date_string
);
-- Returns: lastInsertRowId = 42

INSERT INTO audit_logs (
  session_id, action_type, details, timestamp
) VALUES (
  42,
  'MANUAL',
  'Work session created',
  1717897200000
);

COMMIT;
```

---

### **FLUJO 2: GPS DETECTA ENTRADA (GEOFENCE ENTER)**

```
[Native OS Layer - Background]
Device enters 200m geofence radius
    ↓
TaskManager.defineTask(GEOFENCE_TASK) callback fires
    ├─ data: { eventType: GeofencingEventType.Enter, ... }
    │
    └─ LocationManager.ts handler
        ├─ const db = getDB()
        │
        ├─ const session = await db.getFirstAsync<WorkSession>(
        │   "SELECT * FROM work_sessions ORDER BY id DESC LIMIT 1"
        │ )
        │  ↓
        │  [SQL QUERY] (⚠️ UNINDEXED)
        │  SELECT * FROM work_sessions
        │  WHERE 1=1  -- No WHERE clause!
        │  ORDER BY id DESC
        │  LIMIT 1
        │  ↓
        │  Result: row 42 {
        │    id: 42, start_time: 1717897200000, status: 'pending_arrival',
        │    target_latitude: 40.7128, target_longitude: -74.0060, ...
        │  }
        │
        ├─ IF session && (status === 'pending_arrival' || status === 'travel'):
        │
        └─ await Promise.all([
            // 1. UPDATE status to active
            db.runAsync(
              "UPDATE work_sessions
               SET status = 'active', actual_start_time = ?
               WHERE id = ?",
              [now, session.id]
            ),
            
            // 2. INSERT audit log
            insertAuditLog(
              session.id,
              'AUTO_CHECKIN_GPS',
              `Auto Check-in (GPS) en: ${session.address}`
            ),
            
            // 3. CLEAR exit timestamp
            AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY),
            
            // 4. SEND notification
            Notifications.scheduleNotificationAsync({
              title: '📍 Llegaste al sitio',
              body: 'Auto Check-in (GPS) realizado. ¡Buen trabajo!',
              sound: true,
              trigger: null
            })
          ])

RESULT:
├─ ❌ Engine state NOT updated (escape!)
├─ ✅ work_sessions row updated: status='active', actual_start_time=now
├─ ✅ audit_logs row inserted: action='AUTO_CHECKIN_GPS'
├─ ✅ AsyncStorage cleaned
├─ ✅ User notified
└─ ⚠️ State divergence: DB ahead of engine state
```

**SQL Trace**:
```sql
-- NOT in transaction (⚠️ RISK)
UPDATE work_sessions
SET status = 'active', actual_start_time = 1717897230000
WHERE id = 42;
-- changes: 1

INSERT INTO audit_logs (
  session_id, action_type, details, timestamp
) VALUES (
  42,
  'AUTO_CHECKIN_GPS',
  'Auto Check-in (GPS) en: 123 Main St, NYC',
  1717897230000
);
```

**⚠️ CRITICAL ISSUE**: No transaction. If INSERT audit fails after UPDATE session, inconsistency!

---

### **FLUJO 3: GPS DETECTA SALIDA (GEOFENCE EXIT) → FAILSAFE INIT**

```
[Native OS Layer - Background]
Device exits 200m geofence radius
    ↓
TaskManager callback fires
    ├─ data: { eventType: GeofencingEventType.Exit, ... }
    │
    └─ LocationManager.ts handler
        ├─ const session = await db.getFirstAsync(...)  [Última sesión]
        │
        ├─ IF session.status === 'active':
        │
        └─ await Promise.all([
            // 1. SAVE exit timestamp to volatile storage
            AsyncStorage.setItem(
              EXIT_TIMESTAMP_KEY,
              now.toString()
            ),
            
            // 2. LOG audit
            insertAuditLog(
              session.id,
              'GEOFENCE_EXIT',
              'Salida del radio de trabajo detectada.'
            ),
            
            // 3. NOTIFY user
            Notifications.scheduleNotificationAsync({
              title: '⚠️ Saliste del área de trabajo',
              body: '¿Terminaste tu jornada o vas a otro sitio?',
              data: { action: 'CHECKOUT_DECISION' },
              sound: true,
              priority: MAX,
              vibrate: [0, 500, 200, 500]
            })
          ])

RESULT:
├─ ✅ AsyncStorage: EXIT_TIMESTAMP = 1717897290000
├─ ✅ audit_logs: action='GEOFENCE_EXIT'
├─ ✅ User notified
└─ ⏰ Timer iniciado (15 min failsafe counter)
   └─ NextBackgroundTask en ~15 min checkea:
      timeDiff = now - EXIT_TIMESTAMP_KEY
      IF timeDiff > 900000ms → AUTO CHECKOUT
```

---

### **FLUJO 4: BACKGROUND TASK FAILSAFE (15 MIN EXPIRED)**

```
Every ~15 minutes, OS triggers background task
    ↓
TaskManager.defineTask(APP_BACKGROUND_SERVICES) callback
    │
    └─ BackgroundTasks.ts handler
        ├─ const lastExitStr = await AsyncStorage.getItem(EXIT_TIMESTAMP_KEY)
        │
        ├─ IF lastExitStr exists:
        │   ├─ exitTime = parseInt(lastExitStr, 10)  [Parse from AsyncStorage]
        │   ├─ now = dayjs().valueOf()
        │   ├─ timeDiff = now - exitTime
        │   │
        │   └─ IF timeDiff > 900000ms (15 min):
        │       ├─ const session = await db.getFirstAsync(
        │       │   "SELECT * FROM work_sessions ORDER BY id DESC LIMIT 1"
        │       │ )
        │       │
        │       ├─ IF session?.status === 'active':
        │       │
        │       └─ updateSessionEndTime(session.id, exitTime)
        │           │
        │           └─ DB.updateSessionEndTime(id, endAtMs)
        │               │
        │               └─ db.runAsync(
        │                  `UPDATE work_sessions
        │                   SET end_time = ?, status = 'completed'
        │                   WHERE id = ?`,
        │                  [exitTime, id]  ← Uses exitTime, not now!
        │                )
        │               ├─ changes: 1
        │               │
        │               └─ logAudit({
        │                   session_id: id,
        │                   action_type: 'AUTO_CHECKOUT',
        │                   details: `Session closed with end_time=${exitTime}`,
        │                   timestamp: nowMs()
        │                 })
        │
        ├─ LocationService.stopMonitoring()
        │   └─ Location.stopGeofencingAsync(GEOFENCE_TASK)
        │      Location.stopLocationUpdatesAsync(GEOFENCE_TASK)
        │
        ├─ Notifications.scheduleNotificationAsync({
        │   title: 'Jornada Finalizada 🏁',
        │   body: 'Tu sesión se cerró automáticamente (Auto Check-out).',
        │   sound: true,
        │   trigger: null
        │ })
        │
        └─ AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY)
            └─ Clean up for next cycle

RESULT:
├─ ✅ work_sessions: status='completed', end_time=exitTime (preserved exit time)
├─ ✅ audit_logs: action='AUTO_CHECKOUT'
├─ ✅ Geofencing stopped
├─ ✅ AsyncStorage cleared
└─ ✅ User notified of completion
```

**SQL Trace**:
```sql
UPDATE work_sessions
SET end_time = 1717897290000,  -- ← exitTime (not current time!)
    status = 'completed'
WHERE id = 42;
-- changes: 1

INSERT INTO audit_logs (
  session_id, action_type, details, timestamp
) VALUES (
  42,
  'AUTO_CHECKOUT',
  'Auto Check-out (GPS) por inactividad prolongada fuera del área.',
  1717897770000  -- ← Current time logged for audit
);
```

**Nota**: `end_time` preserva `exitTime` (cuando usuario salió realmente), no `now` (cuando failsafe ejecutó).

---

### **FLUJO 5: REHIDRATACIÓN (BOOT)**

```
APP BOOTS
    ↓
Core/Effects: handleAppBootStarted()
    │
    ├─ const [sessions, settings, auditLogs, systemLogs] = 
    │   await Promise.all([
    │     loadSessionRecordsSnapshot(),
    │     loadSettingsRecordSnapshot(),
    │     loadAuditLogRecordsSnapshot(),
    │     loadSystemLogRecordsSnapshot()
    │   ])
    │
    ├─ loadSessionRecordsSnapshot()
    │  ├─ DB.getAllAsync<DbWorkSessionRow>(
    │  │  `SELECT * FROM work_sessions ORDER BY start_time ASC`
    │  │ )
    │  │ ↓
    │  │ [SQL QUERY]
    │  │ SELECT *
    │  │ FROM work_sessions
    │  │ ORDER BY start_time ASC;
    │  │ ↓
    │  │ Result: [
    │  │   { id: 40, start_time: 1717896000000, status: 'completed', ... },
    │  │   { id: 41, start_time: 1717896600000, status: 'completed', ... },
    │  │   { id: 42, start_time: 1717897200000, status: 'active', ... }  ← Active!
    │  │ ]
    │  │
    │  └─ return rows.map(mapDbSessionToCanonical)
    │     └─ Convierte DbWorkSessionRow → SessionRecord
    │        ├─ start_time → declaredStartAtMs
    │        ├─ status → lifecycle.domainStatus
    │        ├─ lunch_taken & lunch_start/end → lunch.taken + deductedMinutes
    │        └─ ... (20+ field mappings)
    │        ↓
    │        Result: SessionRecord[] [
    │          { id: 40, declaredStartAtMs: ..., lifecycle: { ... }, ... },
    │          { id: 41, declaredStartAtMs: ..., lifecycle: { ... }, ... },
    │          { id: 42, declaredStartAtMs: ..., 
    │                    lifecycle: { domainStatus: 'active', ... }, ... }
    │        ]
    │
    ├─ loadSettingsRecordSnapshot()
    │  ├─ sessionStore.getSettings()
    │  │  └─ DB.getSettings()
    │  │     └─ db.getFirstAsync(
    │  │        `SELECT * FROM settings WHERE id = 1`
    │  │      )
    │  │      ↓
    │  │      Result: {
    │  │        id: 1,
    │  │        employee_name: 'Juan Pérez',
    │  │        hourly_rate: 25.0,
    │  │        tolerance_radius: 200,
    │  │        start_time: '07:00',
    │  │        ...
    │  │      }
    │  │
    │  └─ return mapDbSettingsToCanonical()
    │
    ├─ loadAuditLogRecordsSnapshot()
    │  └─ DB.getAllAsync<DbAuditLogRow>(
    │     `SELECT * FROM audit_logs ORDER BY timestamp ASC, id ASC`
    │    )
    │    ↓
    │    Result: AuditLogRecord[] [...]
    │
    └─ loadSystemLogRecordsSnapshot()
       └─ DB.getAllAsync<DbSystemLogRow>(
          `SELECT * FROM system_logs ORDER BY timestamp ASC, id ASC`
         )
         ↓
         Result: SystemLogRecord[] [...]

AFTER LOADING:
├─ FOR each session:
│  ├─ dispatch(SESSION_CREATED)
│  ├─ IF status === 'travel': dispatch(SESSION_TRANSIT_STARTED)
│  ├─ IF actualStartAtMs && ['active', ...]: dispatch(SESSION_AUTO_CHECKIN_GPS)
│  ├─ IF lunch.taken: dispatch(SESSION_LUNCH_RECORDED)
│  ├─ IF endAtMs: dispatch(SESSION_AUTO_CHECKOUT_GPS or SESSION_CLOSED_MANUAL)
│  └─ IF isDeleted: dispatch(SESSION_DELETED_SOFT)
│
└─ dispatch(APP_REHYDRATION_COMPLETED)
   └─ Engine state fully reconstructed ✓

RESULT:
├─ ✅ State canónico completely rebuilt from DB
├─ ✅ All sessions reloaded in memory
├─ ✅ Settings restored
├─ ✅ Audit trail accessible
└─ ✅ geofencing re-started if open session exists
```

---

## IV. RIESGOS DE INTEGRIDAD DE DATOS

### **🔴 RIESGOS CRÍTICOS**

| ID | Riesgo | Ubicación | Probabilidad | Impacto | Cause |
|---|---|---|---|---|---|
| **INT001** | **No transaction in geofence handler** | LocationManager.ts L40-59, L82-100 | ALTA | Race condition: UPDATE session OK pero INSERT audit FAIL → inconsistency | No `db.runInTransaction()` |
| **INT002** | **No transaction in failsafe** | BackgroundTasks.ts L62-107 | MEDIA | UPDATE session + INSERT audit separados | No `db.runInTransaction()` |
| **INT003** | **AsyncStorage ≠ DB state** | EXIT_TIMESTAMP_KEY | ALTA | AsyncStorage value stale/missing vs. DB session.status | Dual persistence (AsyncStorage + DB) |
| **INT004** | **No FK constraint enforcement** | audit_logs.session_id | MEDIA | Orphan audit logs if session deleted | `PRAGMA foreign_keys` ON pero NO cascade delete |
| **INT005** | **Unindexed SELECT queries** | LocationManager.ts L27, BackgroundTasks.ts L62 | MEDIA | Full table scan: `SELECT * FROM work_sessions ORDER BY id DESC LIMIT 1` | No WHERE clause, no index |
| **INT006** | **Soft-delete never hardened** | sessionStoreAdapter.ts L249 | BAJA | `status='deleted'` never purged → DB grows | Soft-delete only |
| **INT007** | **Status string enum not enforced** | normalizeDomainStatus() L84-95 | BAJA | Invalid status values silently default to 'pending_arrival' | No CHECK constraint |
| **INT008** | **Dual state truth** | DB vs. AsyncStorage | ALTA | EXIT_TIMESTAMP lives in AsyncStorage, not in state canonical | Architecture split |

### **🟡 RIESGOS MODERADOS**

| ID | Riesgo | Ubicación | Probabilidad | Impacto | Cause |
|---|---|---|---|---|---|
| **PER001** | **Promise.all() partial failure** | LocationManager.ts L40 | MEDIA | If INSERT audit fails but UPDATE succeeded → inconsistent | No `allSettled()` + error handling |
| **PER002** | **DB handle leak** | getDB() returns singleton | BAJA | If db.runAsync() hangs → connection not released | No timeout |
| **PER003** | **Date calculation errors** | Lunch deduction L171-175 | BAJA | If lunch_start > lunch_end → negative minutes | Math assumed correct |
| **PER004** | **Stale settings on multi-device** | settings (singleton id=1) | BAJA | If user syncs 2 devices → last write wins | No conflict resolution |
| **PER005** | **Geofence radius mismatch** | Tolerance_radius in DB | MEDIA | If user changes tolerance_radius → old geofence still active | No re-init on settings change |
| **PER006** | **Timezone handling** | date_string = YYYY-MM-DD | MEDIA | If user crosses timezones → date_string inconsistent | No explicit timezone |

### **🟢 RIESGOS MENORES**

| ID | Riesgo | Ubicación | Probabilidad | Impacto |
|---|---|---|---|---|
| **MNR001** | **Circular dependency** | logger.ts ↔ db.ts | BAJA | Logger saves to DB; DB calls logger |
| **MNR002** | **No schema versioning** | initDatabase() | BAJA | Migrations not tracked; ALTER TABLE risky |
| **MNR003** | **VARCHAR unbounded** | address, client_name, details | BAJA | No length check; potential slow queries |
| **MNR004** | **Metadata JSON parsing** | metadata field | BAJA | Unvalidated JSON; parsing errors swallowed |

---

## V. TABLA DE MAPEO: CANONICAL STATE ↔ DB

```typescript
// SessionRecord (Canonical) ↔ DbWorkSessionRow (DB)

SessionRecord {
  id                                    ← id
  declaredStartAtMs                     ← start_time
  actualStartAtMs                       ← actual_start_time
  endAtMs                               ← end_time
  lifecycle: {
    domainStatus                        ← status (text, needs normalization)
    isDeleted                           ← (derived: status === 'deleted')
    isManualEdit                        ← is_manual_edit (0|1 → boolean)
    locationConfirmed                   ← location_confirmed (0|1 → boolean)
  }
  destination: {
    address                             ← address
    clientName                          ← client_name
    targetLatitude                      ← target_latitude
    targetLongitude                     ← target_longitude
    setupLatitude                       ← setup_latitude
    setupLongitude                      ← setup_longitude
  }
  capturedLocation: {
    latitude                            ← latitude
    longitude                           ← longitude
  }
  lunch: {
    taken                               ← lunch_taken (0|1 → boolean)
    startAtMs                           ← lunch_start
    endAtMs                             ← lunch_end
    deductedMinutes                     ← (computed from lunch_end - lunch_start)
  }
  notes: {
    manualNote                          ← manual_note
  }
  bookkeeping: {
    dateString                          ← date_string
  }
}
```

**Conversión Bidireccional**:
```typescript
// Canonical → DB
function mapCanonicalSessionToDb(session: Partial<SessionRecord>): WorkSession {
  return {
    id: session.id,
    start_time: session.declaredStartAtMs ?? Date.now(),
    actual_start_time: session.actualStartAtMs ?? null,
    end_time: session.endAtMs ?? null,
    status: session.lifecycle?.isDeleted ? 'deleted' : session.lifecycle?.domainStatus ?? 'pending_arrival',
    latitude: session.capturedLocation?.latitude ?? null,
    longitude: session.capturedLocation?.longitude ?? null,
    target_latitude: session.destination?.targetLatitude ?? null,
    target_longitude: session.destination?.targetLongitude ?? null,
    setup_latitude: session.destination?.setupLatitude ?? null,
    setup_longitude: session.destination?.setupLongitude ?? null,
    address: session.destination?.address ?? '',
    client_name: session.destination?.clientName ?? '',
    location_confirmed: session.lifecycle?.locationConfirmed ? 1 : 0,
    is_manual_edit: session.lifecycle?.isManualEdit ? 1 : 0,
    manual_note: session.notes?.manualNote ?? '',
    lunch_taken: session.lunch?.taken ? 1 : 0,
    lunch_start: session.lunch?.startAtMs ?? null,
    lunch_end: session.lunch?.endAtMs ?? null,
    date_string: session.bookkeeping?.dateString ?? new Date(...).toISOString().split('T')[0],
  };
}

// DB → Canonical
function mapDbSessionToCanonical(row: DbWorkSessionRow): SessionRecord {
  const domainStatus = normalizeDomainStatus(row.status);
  return {
    id: row.id,
    declaredStartAtMs: row.start_time,
    actualStartAtMs: row.actual_start_time ?? null,
    endAtMs: row.end_time ?? null,
    lifecycle: {
      domainStatus,
      isDeleted: domainStatus === 'deleted',
      isManualEdit: Boolean(row.is_manual_edit),
      locationConfirmed: Boolean(row.location_confirmed),
    },
    destination: {
      address: row.address ?? null,
      clientName: row.client_name ?? null,
      targetLatitude: row.target_latitude ?? null,
      targetLongitude: row.target_longitude ?? null,
      setupLatitude: row.setup_latitude ?? null,
      setupLongitude: row.setup_longitude ?? null,
    },
    capturedLocation: {
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
    },
    lunch: {
      taken: Boolean(row.lunch_taken),
      startAtMs: row.lunch_start ?? null,
      endAtMs: row.lunch_end ?? null,
      deductedMinutes: row.lunch_taken && row.lunch_start && row.lunch_end
        ? Math.max(0, Math.round((row.lunch_end - row.lunch_start) / 60000))
        : row.lunch_taken ? 60 : null,
    },
    notes: {
      manualNote: row.manual_note ?? null,
    },
    bookkeeping: {
      dateString: row.date_string ?? null,
    },
  };
}
```

---

## VI. TRANSACCIONES Y INTEGRIDAD ACID

### **Transacciones Implementadas ✅**

```typescript
// database/db.ts
async function runInTransaction<T>(
  work: (database: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const database = await ensureDbReady();
  
  try {
    await database.execAsync('BEGIN IMMEDIATE TRANSACTION');
    const result = await work(database);
    await database.execAsync('COMMIT');
    return result;
  } catch (error) {
    try {
      await database.execAsync('ROLLBACK');
    } catch {
      // rollback falla ignorado
    }
    throw error;
  }
}

// Usada en:
export const insertWorkSession = async (session: WorkSession) => {
  return await runInTransaction(async (database) => {
    const result = await database.runAsync(
      `INSERT INTO work_sessions (...)
       VALUES (...)`,
      [...]
    );
    const sessionId = Number(result.lastInsertRowId);
    
    await logAudit({
      session_id: sessionId,
      action_type: AUDIT_ACTIONS.MANUAL,
      details: 'Work session created',
      timestamp: nowMs()
    });
    
    return result.lastInsertRowId;
  });
};

export const updateSessionEndTime = async (id: number, endTime: number) => {
  await runInTransaction(async (database) => {
    await database.runAsync(
      `UPDATE work_sessions SET end_time = ?, status = 'completed' WHERE id = ?`,
      [endTime, id]
    );
    
    await logAudit({
      session_id: id,
      action_type: AUDIT_ACTIONS.AUTO_CHECKOUT,
      details: `Session closed with end_time=${endTime}`,
      timestamp: nowMs()
    });
  });
};
```

**Transacciones NO implementadas ❌**:
```typescript
// LocationManager.ts: Geofence handler
await Promise.all([
  db.runAsync("UPDATE work_sessions SET status = 'active', ..."),
  insertAuditLog(...),  ← Separate transaction!
  AsyncStorage.removeItem(...),
  Notifications.scheduleNotificationAsync(...)  ← Can fail
]);
// ❌ NO transaction; race condition possible

// BackgroundTasks.ts: Failsafe
const session = await db.getFirstAsync(...);
await updateSessionEndTime(session.id, exitTime);  ← Transactional
await insertAuditLog(...);  ← Can be separate
await LocationService.stopMonitoring();
// ⚠️ Partial transactional
```

### **PRAGMA Configuración**

```typescript
// database/db.ts: configureDatabase()
await database.getFirstAsync('PRAGMA journal_mode = WAL');
// ✅ Write-Ahead Logging: mejor concurrency

await database.execAsync(`
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
`);
// ✅ synchronous=NORMAL: balance safety↔performance
// ✅ foreign_keys=ON: referential integrity
```

---

## VII. TAMAÑO Y ESCALA ESTIMADA

### **Database Size Estimation**

```
Assumptions:
  • 1 session creada cada 8 horas de trabajo
  • 5 jornadas laborales/semana
  • 50 semanas/año
  • 4 años de datos

Cálculos:
  Sessions: 5 sesiones/semana * 50 semanas * 4 años = 1,000 sesiones
  Audit logs: ~5 logs/sesión avg → 5,000 audit logs
  System logs: ~50 logs/día * 365 * 4 = 73,000 system logs

Per Row Sizes:
  work_sessions: ~400 bytes (19 fields, mostly TEXT/REAL)
  audit_logs: ~200 bytes (4 fields + text)
  system_logs: ~300 bytes (7 fields + JSON metadata)

Total Size:
  Sessions: 1,000 * 400B = 400 KB
  Audit logs: 5,000 * 200B = 1 MB
  System logs: 73,000 * 300B = 22 MB
  Indexes: ~5 MB (estimated)
  WAL log: ~2-5 MB
  ───────────────────────
  TOTAL: ~30-35 MB

SQLite Default Limits:
  ✅ Max database size: 281 terabytes (practical: 140GB)
  ✅ Max table size: 281 terabytes
  ✅ Max row size: 1 GB
  ✅ Max column value: 1 GB
  ✅ Max rows: 2^63 = 9.2 quintillion

Conclusion: ✅ Well within limits for 4 years data
```

### **Query Performance**

```
Current Slow Queries:
├─ getFirstAsync("SELECT * FROM work_sessions ORDER BY id DESC LIMIT 1")
│  ├─ Full table scan: O(n)
│  ├─ Time: ~1-5ms for 1,000 rows
│  └─ Fix: INDEX (id DESC) or status, id
│
├─ getAllAsync("SELECT * FROM work_sessions ORDER BY start_time ASC")
│  ├─ Full table scan + sort: O(n log n)
│  ├─ Time: ~5-20ms
│  └─ Fix: INDEX (start_time ASC)
│
└─ checkSessionOverlap(...) query
   ├─ Complex WHERE with no index
   ├─ Time: ~10-50ms
   └─ Fix: INDEX (status, start_time, end_time)

Recommended Indexes:
  CREATE INDEX idx_work_sessions_status_id 
    ON work_sessions(status, id DESC);
  
  CREATE INDEX idx_work_sessions_start_time 
    ON work_sessions(start_time ASC);
  
  CREATE INDEX idx_audit_logs_session_id 
    ON audit_logs(session_id, timestamp);
```

---

## VIII. DIAGRAMA DE FLUJO PERSISTENCIA COMPLETO

```
┌──────────────────────────────────────────────────────────────────────┐
│                   WRITE PATH: Engine → DB                            │
└──────────────────────────────────────────────────────────────────────┘

Session Created Event
    ↓
Reducer mutates state
    ↓
Effects: handleSessionCreated()
    ├─ sessionStore.createSession(session)
    │   ├─ mapCanonicalSessionToDb(session)
    │   └─ runInTransaction()
    │       ├─ BEGIN TRANSACTION
    │       ├─ INSERT work_sessions
    │       ├─ logAudit() → INSERT audit_logs
    │       └─ COMMIT
    │           ↓ [Escribir a WAL]
    │           ↓ [fsync si PRAGMA sync]
    │           ↓ ✅ Durable
    │
    └─ location.startMonitoringArrival()
        └─ [Native geofence start]

┌──────────────────────────────────────────────────────────────────────┐
│                  GEOFENCE PATH: BG → DB (NO TRANSACTION)             │
└──────────────────────────────────────────────────────────────────────┘

GPS ENTER
    ↓
LocationManager callback
    ├─ Query: SELECT latest session
    │   └─ [Unindexed full scan]
    │
    ├─ Promise.all([
    │   db.runAsync("UPDATE sessions...")  ← Transaction begins?
    │   insertAuditLog(...)                ← Separate transaction
    │   AsyncStorage.setItem()             ← Not transactional
    │   Notifications.schedule()           ← Can fail
    │ ])
    │
    └─ ❌ NO atomic transaction!
       ├─ Race: UPDATE OK, INSERT FAIL → inconsistent
       └─ No rollback mechanism

┌──────────────────────────────────────────────────────────────────────┐
│             READ PATH: Boot Rehydration → Memory                     │
└──────────────────────────────────────────────────────────────────────┘

App Boots
    ↓
handleAppBootStarted()
    ├─ loadSessionRecordsSnapshot()
    │   ├─ Query: SELECT * FROM work_sessions
    │   ├─ [Full table scan, sorted by start_time]
    │   └─ mapDbSessionToCanonical() for each row
    │       └─ state.domain.sessions.byId[id] = session
    │
    ├─ loadAuditLogRecordsSnapshot()
    │   ├─ Query: SELECT * FROM audit_logs ORDER BY timestamp
    │   └─ state.domain.audit.auditLogs = rows
    │
    ├─ loadSystemLogRecordsSnapshot()
    │   ├─ Query: SELECT * FROM system_logs ORDER BY timestamp
    │   └─ state.domain.audit.systemLogs = rows
    │
    └─ dispatch() recreate events
        └─ Engine state fully hydrated ✅

┌──────────────────────────────────────────────────────────────────────┐
│             FAILSAFE PATH: BG Task → DB (PARTIAL TRANSACTION)        │
└──────────────────────────────────────────────────────────────────────┘

Background Task Timer
    ↓
BackgroundTasks callback
    ├─ Check: AsyncStorage.EXIT_TIMESTAMP_KEY
    │   └─ IF timeDiff > 15min:
    │
    ├─ Query: SELECT latest session
    │   └─ [Unindexed]
    │
    ├─ updateSessionEndTime()
    │   └─ runInTransaction()
    │       ├─ UPDATE sessions
    │       ├─ logAudit()
    │       └─ COMMIT ✅ (Transactional)
    │
    ├─ LocationService.stopMonitoring()
    │   └─ [Native cleanup]
    │
    ├─ Notifications.schedule()
    │
    └─ AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY)
        └─ [Cleanup for next cycle]
```

---

## IX. CHECKLIST DE INTEGRIDAD DE DATOS

### **Validaciones Presentes ✅**

- [x] PRAGMA foreign_keys = ON
- [x] PRAGMA synchronous = NORMAL
- [x] PRAGMA journal_mode = WAL
- [x] runInTransaction() for CRUD
- [x] insertWorkSession() transactional
- [x] updateSessionEndTime() transactional
- [x] updateSessionLunch() transactional
- [x] updateWorkSessionManual() transactional
- [x] Soft-delete pattern (never hard-delete)
- [x] Audit trail for all mutations
- [x] Data mapping (canonical ↔ DB)

### **Validaciones Faltantes ❌**

- [ ] CHECK constraint on status enum
- [ ] CHECK constraint on latitude/longitude ranges
- [ ] CHECK constraint on timestamps (start < end)
- [ ] UNIQUE constraint on sessions (no duplicates per day)
- [ ] ON DELETE CASCADE for audit_logs
- [ ] Transaction in geofence handler
- [ ] Transaction in failsafe handler
- [ ] Indexes on frequently queried columns
- [ ] Schema versioning / migration system
- [ ] Data validation on INSERT/UPDATE (zod, io-ts)
- [ ] Circular dependency resolution (logger ↔ db)

---

## X. TABLA RESUMEN: RIESGOS CRÍTICOS

| Riesgo | Severidad | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| **No transaction in geofence handler** | 🔴 CRITICAL | ALTA | Race condition: DB inconsistency | Wrap in runInTransaction() |
| **AsyncStorage dual state** | 🔴 CRITICAL | ALTA | Data divergence: AsyncStorage ≠ DB | Move to state.runtime.geofence |
| **Unindexed SELECT queries** | 🟡 HIGH | MEDIA | Performance degradation | Add indexes (status, start_time) |
| **FK no cascade delete** | 🟡 HIGH | BAJA | Orphan audit logs | Add ON DELETE CASCADE |
| **No status enum validation** | 🟡 HIGH | BAJA | Invalid status silently defaults | Add CHECK constraint |
| **Circular dependency logger↔db** | 🟡 HIGH | BAJA | Hard to debug, difficult testing | Invert dependency |

---

## XI. CONCLUSIÓN EJECUTIVA

### **Fortalezas ✅**

- ✅ SQLite implementación sólida con WAL mode
- ✅ Transacciones en CRUD principales
- ✅ Audit trail completo
- ✅ Soft-delete pattern previene data loss
- ✅ Clean mapping canónico ↔ DB
- ✅ Rehydración correcta en boot

### **Debilidades 🔴**

- 🔴 **CRÍTICO**: Geofence handler sin transaction
- 🔴 **CRÍTICO**: AsyncStorage como dual persistence point
- 🔴 **CRÍTICO**: No coordinated state update (Engine ≠ DB)
- 🟡 **ALTO**: Unindexed queries en paths frecuentes
- 🟡 **ALTO**: FK constraints sin cascade delete
- 🟡 **ALTO**: Status enum sin validación DB-level

### **Roadmap P0 (Inmediato)**

1. **Wrap geofence handler in transaction**
   ```typescript
   // LocationManager.ts
   await runInTransaction(async (db) => {
     await db.runAsync("UPDATE work_sessions...");
     await insertAuditLog(...);  // Now transactional
     await AsyncStorage.removeItem(...);
   });
   ```

2. **Move EXIT_TIMESTAMP to state.runtime.geofence**
   ```typescript
   // core/effects/index.ts
   dispatch({
     type: 'SESSION_EXIT_DETECTED',
     sessionId, exitTimestampMs
   })
   // Engine handles state mutation + persistence
   ```

3. **Add indexes**
   ```sql
   CREATE INDEX idx_work_sessions_status_id 
     ON work_sessions(status, id DESC);
   ```

### **Status**: 🟡 **FUNCTIONAL** pero con serios riesgos de inconsistencia. P0 fixes obligatorios antes de producción.
