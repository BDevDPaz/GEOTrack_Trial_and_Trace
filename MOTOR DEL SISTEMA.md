---

# 🧠 INVENTARIO TÉCNICO COMPLETO: MOTOR DEL SISTEMA (src/core/)
## GEOTrack_Trial_and_Trace | WorkTrackerEngine

---

## I. DIAGRAMA DE FLUJO COMPLETO DEL ENGINE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FLUJO DE EJECUCIÓN                               │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────────┐
     │   UI COMPONENT   │
     │   dispatch()     │
     └────────┬─────────┘
              │
              ▼
     ┌──────────────────────────────────┐
     │  workTrackerEngine.dispatch()     │
     │  (público)                        │
     └────────┬─────────────────────────┘
              │
              ▼
     ┌──────────────────────────────────┐
     │   eventQueue.push(event)          │
     │   (cola FIFO)                    │
     └────────┬─────────────────────────┘
              │
              ▼
     ┌──────────────────────────────────┐
     │   drainQueue()                    │
     │   (serializa FIFO)               │
     │   isDrainingQueue flag           │
     └────────┬─────────────────────────┘
              │
              ▼
     ┌──────────────────────────────────┐
     │   while (eventQueue.length > 0)   │
     │   shift event                    │
     └────────┬─────────────────────────┘
              │
              ▼
     ┌──────────────────────────────────┐
     │   processEvent(event)             │
     │   (privado)                       │
     └────────┬─────────────────────────┘
              │
              ├─────────────────────────────────────────┐
              │                                         │
              ▼                                         │
     ┌──────────────────────────┐                       │
     │  prevState = getState()  │                       │
     └────────┬─────────────────┘                       │
              │                                         │
              ▼                                         │
     ┌──────────────────────────────────────┐           │
     │   PASO 1: VALIDACIÓN (Reducer)      │           │
     │   validateEvent(state, event)       │           │
     │   • Validación pura (SIN I/O)       │           │
     │   • Lanza error si es inválido      │           │
     │   • Si falla → error propagado      │           │
     └────────┬─────────────────────────────┘           │
              │                                         │
              ▼                                         │
     ┌──────────────────────────────────────┐           │
     │   PASO 2: REDUCCIÓN (Reducer)       │           │
     │   nextState = reduce(state, event)   │           │
     │   • Transformación de estado PURA   │           │
     │   • SIN I/O, SIN async              │           │
     │   • Inmutable (spread operator)     │           │
     │   • withDerivedViews(nextState)     │           │
     └────────┬─────────────────────────────┘           │
              │                                         │
              ▼                                         │
     ┌──────────────────────────────────────┐           │
     │   this.state = nextState            │           │
     │   (COMMIT del nuevo estado)         │           │
     └────────┬─────────────────────────────┘           │
              │                                         │
              ▼                                         │
     ┌──────────────────────────────────────┐           │
     │   PASO 3: SIDE EFFECTS (Impuro)      │           │
     │   IF runtimeAdapter exists:         │           │
     │     secondaryEvents = await         │           │
     │       executeEffects(                │           │
     │         event,                       │           │
     │         prevState,                   │           │
     │         nextState,                   │           │
     │         runtime                      │           │
     │       )                              │           │
     │   • Manejo de I/O                   │           │
     │   • Manejo de errores (try/catch)   │           │
     │   • Retorna eventos secundarios     │           │
     │   • Con retry mechanism              │           │
     └────────┬─────────────────────────────┘           │
              │                                         │
              ▼                                         │
     ┌──────────────────────────────────────┐           │
     │   IF secondaryEvents existe:        │           │
     │     eventQueue.push(...events)      │           │
     │   (Re-enqueueing)                   │           │
     └────────┬─────────────────────────────┘           │
              │                                         │
              │◄─────────────────────────────────────────┘
              │
              ▼
     ┌──────────────────────────────────────┐
     │   Continuar loop while               │
     │   (siguiente evento)                 │
     └──────────────────────────────────────┘

ERROR HANDLING:
═══════════════════════════════════════════════════════════════════════════════
    Si ocurre ERROR en validation o reduce:
    ├─ Salva prevState (no cambia state actual)
    ├─ Log console.error()
    ├─ Si es EVENT_RETRY_REQUESTED o SYSTEM_ERROR_RECORDED → skip (anti-recursión)
    ├─ Enqueue: SYSTEM_ERROR_RECORDED + SYSTEM_LOG_APPENDED
    └─ El motor continúa operativo (resilencia)

    Si ocurre ERROR en effects:
    ├─ Try/catch en executeEffects()
    ├─ Retorna: [SYSTEM_ERROR_RECORDED, EVENT_RETRY_REQUESTED (si aplica)]
    ├─ Retry automático hasta MAX_RETRY_ATTEMPTS (3)
    └─ Dead letter si excede reintentos
```

---

## II. TABLA DE RESPONSABILIDADES POR ARCHIVO

| **Archivo** | **Líneas** | **Responsabilidad Primaria** | **Patrón** | **Estado** |
|---|---|---|---|---|
| **workTrackerEngine.ts** | 246 | Motor central FIFO. Dispatch, queue, drainQueue, processEvent. Singleton global. | Event Sourcing + Scheduler | ✅ CRÍTICO |
| **reducer/index.ts** | 1,211 | Lógica pura: validación + reducción. 40+ event types. withDerivedViews. | Redux Reducer | ✅ CRÍTICO |
| **effects/index.ts** | 1,527 | Side effects: I/O, logging, notifications, DB persistence. Retry queue. | Side Effect Handler | ✅ CRÍTICO |
| **contracts/types.ts** | 361 | Catálogo formal: tipos, interfaces, contratos runtime adapters. | Domain-Driven Design | ✅ CRÍTICO |
| **state/initialState.ts** | 102 | Estado inicial limpio, valores por defecto. | Immutable Factory | ✅ SOPORTA |
| **hooks/useWorkTracker.ts** | 50 | Hook React: subscripción al engine, dispatch, state binding. | React Hook | ✅ UI BRIDGE |
| **selectors/index.ts** | 127 | Queries derivadas: selectActiveSession, selectEngineState, selectComputedSessions. | Selector Pattern | ✅ SOPORTA |

---

## III. DESCRIPCIÓN DETALLADA DE CADA MÓDULO

### **A. workTrackerEngine.ts (246 líneas)**

#### Responsabilidad Única
Orquestación del flujo de eventos FIFO con estado canónico centralizado.

#### Estructura Interna
```typescript
class WorkTrackerEngine {
  private state: WorkTrackerCanonicalState              // Única fuente de verdad
  private runtimeAdapter: WorkTrackerRuntimeAdapter | null
  private isDrainingQueue: boolean                      // Flag anti-concurrencia
  private readonly eventQueue: DomainEvent[]            // Cola FIFO
  private hasWarnedMissingRuntime: boolean             // Una sola advertencia
  
  // API Pública
  public initialize(runtime: WorkTrackerRuntimeAdapter)
  public getState(): WorkTrackerCanonicalState
  public isInitialized(): boolean
  public resetState(): void
  public async dispatch(event: DomainEvent): Promise<void>
  
  // Métodos Privados
  private async drainQueue(): Promise<void>
  private async processEvent(event: DomainEvent): Promise<void>
}

export const workTrackerEngine = new WorkTrackerEngine()  // Singleton
```

#### Flujo Crítico: `dispatch()` → `drainQueue()` → `processEvent()`

```typescript
dispatch(event) {
  eventQueue.push(event)
  await drainQueue()  // → loop while queue.length > 0
}

drainQueue() {
  if (isDrainingQueue) return  // ← PROTECCIÓN: evita concurrencia
  isDrainingQueue = true
  
  try {
    while (eventQueue.length > 0) {
      const event = eventQueue.shift()
      await processEvent(event)
    }
  } finally {
    isDrainingQueue = false  // ← SIEMPRE ejecuta
  }
}

processEvent(event) {
  prevState = this.state
  
  try {
    nextState = workTrackerReducer(prevState, event)
    this.state = nextState  // ← COMMIT INMEDIATO
    
    if (runtimeAdapter) {
      secondaryEvents = await executeEffects(
        event, prevState, nextState, runtimeAdapter
      )
      
      if (secondaryEvents.length > 0) {
        eventQueue.push(...secondaryEvents)  // ← RE-ENQUEUEING
      }
    }
  } catch (error) {
    // ← ERROR RESILIENCE
    if (!isAlreadyErrorPath(event.type)) {
      enqueue(SYSTEM_ERROR_RECORDED)
      enqueue(SYSTEM_LOG_APPENDED)
    }
  }
}
```

#### Garantías y Propiedades
- ✅ **FIFO Ordering**: Eventos procesados en orden exacto
- ✅ **Serialización**: Solo un evento a la vez (`isDrainingQueue`)
- ✅ **Inyección**: Runtime adapters inyectados, no singletons globales
- ✅ **Error Isolation**: Fallos no rompen el loop
- ✅ **Idempotencia**: `getState()` siempre retorna snapshot actual
- ✅ **Nested Dispatch Safety**: Si un effect llama `dispatch()`, enqueue automático

#### Riesgos y Limitaciones
- ⚠️ **Sin timeout**: Si un effect cuelga → bloquea resto de eventos
- ⚠️ **Sin observabilidad**: No expone metrics (queue depth, processing time)
- ⚠️ **Memory leak potencial**: Si eventQueue crece sin límite

---

### **B. reducer/index.ts (1,211 líneas)**

#### Responsabilidad Única
Transformación pura de estado: validación + reducción. **CERO I/O**.

#### Estructura Interna
```typescript
// 1. HELPERS INTERNOS (puro)
function buildSessionRecordFromEvent()
function deriveEngineState()      // ← DERIVACIÓN de vistas
function withDerivedViews()       // ← Actualiza views en CADA transición
function ensureSessionExists()
function cloneSessionsState()     // ← Shallow clone para inmutabilidad
function normalizeFeedbackPayload()
function normalizeSystemErrorToLog()

// 2. VALIDACIÓN PURA
function validateEvent(state, event) {
  switch (event.type) {
    case 'SESSION_CREATED':
      if (state.domain.sessions.activeSessionId) throw Error(...)
    case 'SESSION_EDITED_MANUAL':
      if (!event.note.trim()) throw Error(...)
    case 'REPORT_RANGE_SELECTED':
      if (startAtMs > endAtMs) throw Error(...)
    // ... 20+ validaciones
  }
}

// 3. REDUCCIÓN (40+ event types)
function reduce(state, event) {
  switch (event.type) {
    case 'SESSION_CREATED':
      return {state, domain.sessions updated, views updated}
    case 'SESSION_AUTO_CHECKIN_GPS':
      return {actualStartAtMs set, locationConfirmed true, exitTimestamp cleared}
    case 'SESSION_EXIT_DETECTED':
      return {lastExitTimestampMs set, engineState → 'SALIDA_DETECTADA'}
    // ... 40+ cases
  }
}

// 4. FUNCIÓN EXPORTADA
export function workTrackerReducer(state, event) {
  validateEvent(state, event)
  return reduce(state, event)
}
```

#### Invariantes Garantizadas
| Invariante | Descripción | Validación |
|---|---|---|
| **Single Active Session** | Solo una sesión puede estar `activeSessionId` | validateEvent() |
| **Session Existence** | No puedo actualizar una sesión que no existe | ensureSessionExists() |
| **Immutability** | Estado original nunca mutado | spread operator |
| **Derived Views Always Current** | views.currentOperationalState derivado en CADA reduce | withDerivedViews() |
| **No Overlapping Times** | Si edito sesión, chequeo overlaps | (DB responsable, no reducer) |

#### Event Type Coverage (40+ tipos)

**Boot/System (10)**
```
APP_BOOT_STARTED, APP_REHYDRATION_COMPLETED, DB_READY,
PERMISSIONS_LOCATION_UPDATED, PERMISSIONS_NOTIFICATIONS_UPDATED,
GEOFENCE_MONITORING_STARTED, GEOFENCE_MONITORING_STOPPED,
BACKGROUND_TASK_REGISTERED, BACKGROUND_TASK_UNREGISTERED, ...
```

**Session Lifecycle (15+)**
```
SESSION_CREATED, SESSION_DESTINATION_SET, SESSION_TRANSIT_STARTED,
SESSION_ARRIVAL_CONFIRMED_MANUAL, SESSION_AUTO_CHECKIN_GPS,
SESSION_EXIT_DETECTED, SESSION_EXIT_RESOLVED_CONTINUE,
SESSION_AUTO_CHECKOUT_GPS, SESSION_CLOSED_MANUAL,
SESSION_LUNCH_RECORDED, SESSION_NOTE_ADDED, SESSION_EDITED_MANUAL,
SESSION_DELETED_SOFT, SESSION_OVERLAP_DETECTED
```

**Reports (6)**
```
REPORT_RANGE_SELECTED, REPORT_GENERATION_STARTED,
REPORT_GENERATION_SUCCEEDED, REPORT_GENERATION_FAILED,
REPORT_SHARE_REQUESTED, REPORT_EMAIL_REQUESTED,
REPORT_MARKED_AS_WEEKLY_DELIVERED
```

**Security/Feedback (8)**
```
ADMIN_ACCESS_VALIDATION_STARTED, ADMIN_ACCESS_GRANTED,
ADMIN_ACCESS_DENIED, ADMIN_ACCESS_LOCKED,
FEEDBACK_ENQUEUED, FEEDBACK_DISMISSED,
SYSTEM_LOG_APPENDED, AUDIT_LOG_APPENDED
```

#### Derivación de Vistas (Función Clave)

```typescript
function deriveEngineState(state): EngineState {
  const activeSessionId = state.domain.sessions.activeSessionId
  if (!activeSessionId) return 'NO_INICIADA'
  
  const activeSession = state.domain.sessions.byId[String(activeSessionId)]
  if (!activeSession || activeSession.lifecycle.isDeleted) return 'NO_INICIADA'
  
  const { domainStatus } = activeSession.lifecycle
  const { lastExitTimestampMs } = state.runtime.geofence
  
  // Lógica de derivación (pura)
  if (domainStatus === 'travel') return 'EN_TRASLADO'
  if (domainStatus === 'pending_arrival') return 'ESPERANDO_LLEGADA'
  if (domainStatus === 'active') {
    if (lastExitTimestampMs) return 'SALIDA_DETECTADA'  // ← Derived from TWO fields!
    return 'ACTIVA'
  }
  return 'CERRADA'
}

function withDerivedViews(state) {
  return {
    ...state,
    views: {
      ...state.views,
      currentOperationalState: {
        engineState: deriveEngineState(state)
      }
    }
  }
}
```

**✅ VENTAJA**: El `engineState` NUNCA se guarda en BD, siempre derivado. Evita inconsistencia.

#### Problemas Detectados

| Problema | Ubicación | Gravedad | Causa |
|---|---|---|---|
| **Monolito de 1,211 líneas** | Todo en index.ts | 🟡 MEDIA | Sin split por dominio |
| **Shallow clone ineficiente** | cloneSessionsState() | 🟡 MEDIA | Copia entera sessions.byId cada operación |
| **No validación runtime** | validateEvent() | 🔴 ALTA | Validaciones solo en TS (tipos erasables) |
| **Derivación en cada reduce** | withDerivedViews() | 🟡 MEDIA | Overhead si reduce se llama frecuente |

---

### **C. effects/index.ts (1,527 líneas)**

#### Responsabilidad Única
Ejecutar **side effects**: I/O, logging, DB persistence, notifications. Manejar errores y reintentos.

#### Estructura Interna
```typescript
// 1. RETRY QUEUE (en memoria)
const retryQueue: RetryRequestedEvent[] = []
const retryQueueKeys = Set<string>
function buildRetryKey(event)
function enqueueRetry(event)
function dequeueRetry(key)

// 2. EFFECT HANDLERS (por evento type)
async function handleAppBootStarted() → Promise<DomainEvent[]>
async function handleSessionCreated()
async function handleSessionAutoCheckinGps()
async function handleReportGenerationStarted()
async function handleAdminAccessValidationStarted()
// ... 20+ handlers

// 3. ROUTER DISPATCHER
const handlers: Record<string, InternalEffectHandler> = {
  'APP_BOOT_STARTED': handleAppBootStarted,
  'SESSION_CREATED': handleSessionCreated,
  // ...
}

// 4. FUNCIÓN EXPORTADA
export async function executeEffects(
  event, prevState, nextState, runtime
): Promise<DomainEvent[]>
```

#### Garantías de Effects

| Garantía | Implementación |
|---|---|
| **No muta estado** | Recibe `nextState` RO. Retorna `DomainEvent[]` para mutación. |
| **Manejo de errores** | Try/catch envolvente. Emite SYSTEM_ERROR_RECORDED. |
| **Retry automático** | Reintentos hasta 3 veces con `buildRetryKey()`. |
| **Bootstrap idempotente** | Rehidrata DB en `handleAppBootStarted()`. Si `isBootRehydrating` → skip otros effects. |
| **Secondary events** | Puede encolar eventos adicionales para re-procesamiento. |

#### Flujo de Retry

```typescript
executeEffects(event, ...) {
  try {
    secondaryEvents = await handler(event, ...)
    removeRetryKey(buildRetryKey(event))  // ← SUCCESS
    return secondaryEvents
  } catch (error) {
    output = [SYSTEM_ERROR_RECORDED]
    
    currentRetryCount = event.retryCount ?? 0
    nextRetryCount = currentRetryCount + 1
    
    if (isRetryableBaseEvent(event) && nextRetryCount <= MAX_RETRY_ATTEMPTS) {
      retryEvent = {
        type: 'EVENT_RETRY_REQUESTED',
        originalEvent: event,
        retryCount: nextRetryCount
      }
      enqueueRetry(retryEvent)
      output.unshift(retryEvent)  // ← Re-enqueue al inicio
    }
    
    return output
  }
}
```

**Eventos NO-Retryable**:
```
APP_REHYDRATION_COMPLETED, DB_READY, SYSTEM_ERROR_RECORDED,
FEEDBACK_ENQUEUED, FEEDBACK_DISMISSED, ...
```

#### Handlers Críticos

**1. handleAppBootStarted()** (líneas 405-594)
```typescript
// Rehidratación masiva desde BD
const [sessions, settings, auditLogs, systemLogs] = 
  await Promise.all([
    loadSessionRecordsSnapshot(),
    loadSettingsRecordSnapshot(),
    loadAuditLogRecordsSnapshot(),
    loadSystemLogRecordsSnapshot()
  ])

// Reconstituye eventos del snapshot
for (const session of sessions) {
  events.push(buildSessionCreatedEventFromSnapshot(session))
  
  if (session.lifecycle.domainStatus === 'travel') {
    events.push({ type: 'SESSION_TRANSIT_STARTED', sessionId: session.id })
  }
  
  if (session.actualStartAtMs && ['active', ...].includes(...)) {
    if (session.lifecycle.locationConfirmed) {
      events.push({ type: 'SESSION_AUTO_CHECKIN_GPS', ... })
    } else {
      events.push({ type: 'SESSION_ARRIVAL_CONFIRMED_MANUAL', ... })
    }
  }
  
  // ... más eventos
}

// Reinicia geofencing si hay sesión abierta
if (openOperationalSession) {
  await runtime.location.startMonitoringArrival(...)
  events.push({ type: 'GEOFENCE_MONITORING_STARTED', ... })
}
```

**2. handleSessionCreated()** (líneas 601-664)
```typescript
// Crea sesión en DB
await runtime.sessionStore.createSession(createdSession)

// Inicia geofencing
if (latitude && longitude) {
  await runtime.location.startMonitoringArrival(...)
  events.push({ type: 'GEOFENCE_MONITORING_STARTED', ... })
}

// Logging
events.push({ type: 'AUDIT_LOG_APPENDED', ... })
events.push({ type: 'SYSTEM_LOG_APPENDED', ... })
```

**3. handleSessionAutoCheckoutGps()** (líneas 891-940)
```typescript
// Cierra sesión en DB
await runtime.sessionStore.closeSession(session.id, event.endAtMs)

// Detiene geofencing
await runtime.location.stopMonitoring()

// Logging y notificación
await runtime.logging.appendAuditLog(...)
await runtime.notifications.notifyImmediate(...)

// Eventos secundarios
events.push({ type: 'GEOFENCE_MONITORING_STOPPED' })
events.push({ type: 'SYSTEM_LOG_APPENDED', ... })
```

#### Problemas Detectados

| Problema | Ubicación | Gravedad | Impacto |
|---|---|---|---|
| **Gran archivo (1,527 líneas)** | effects/index.ts | 🟡 MEDIA | Difícil de navegar, mantener |
| **Sin backoff exponencial** | enqueueRetry() | 🟡 MEDIA | Reintentos inmediatos, puede sobrecargar |
| **Retry queue en memoria** | retryQueue global | 🟡 MEDIA | Perdida si app crash durante retry |
| **Sin timeout en effects** | handlers no tienen timeout | 🔴 ALTA | Si effect cuelga → bloquea resto |
| **Inicio duplicado en bootstrap** | handleAppBootStarted + handleSessionCreated | 🟡 MEDIA | Ambos llaman startMonitoringArrival |
| **No idempotencia garantizada** | Algunos handlers pueden ejecutarse 2x | 🟡 MEDIA | Si retry ocurre después de commit DB |

---

### **D. contracts/types.ts (361 líneas)**

#### Responsabilidad Única
Catálogo formal de todos los tipos: eventos, estado, adaptadores.

#### Estructura Jerárquica

```typescript
// 1. REGISTROS DOMINIO (Entidades primarias)
interface SessionRecord
interface AppSettingsRecord
interface AuditLogRecord
interface SystemLogRecord
interface FeedbackPayload

// 2. ESTADO CANÓNICO (Único snapshot global)
interface WorkTrackerCanonicalState {
  meta: {
    schemaVersion
    timezone
    locale
    bootState: { isRehydrating, lastHydratedAtMs }
  }
  domain: {
    sessions: { byId, order, activeSessionId }
    settings: AppSettingsRecord
    audit: { auditLogs[], systemLogs[] }
  }
  runtime: {
    permissions: { locationForeground, locationBackground, notifications }
    geofence: { isMonitoring, taskName, lastExitTimestampMs, monitoredRegion }
    background: { appTask, weeklyReport }
    notifications: { defaultChannelReady, lastScheduledReminderTime }
    security: { adminAccess }
    transient: { pendingFeedback, draftNotesBySessionId, exportIntent }
  }
  views: {
    currentOperationalState: { engineState }
    selectedSession: { selectedSessionId }
    history: { activeFilter }
    report: { selectedRange }
  }
}

// 3. CATÁLOGO DE EVENTOS (Union types)
type SessionEvent = 
  | { type: 'SESSION_CREATED'; session: ... }
  | { type: 'SESSION_TRANSIT_STARTED'; sessionId: number }
  | { type: 'SESSION_AUTO_CHECKIN_GPS'; sessionId: number; actualStartAtMs: number }
  | ... (15+ variants)

type SystemEvent =
  | { type: 'APP_BOOT_STARTED' }
  | { type: 'PERMISSIONS_LOCATION_UPDATED'; foreground, background }
  | { type: 'GEOFENCE_MONITORING_STARTED'; taskName; identifier; latitude; longitude; radiusMeters }
  | ... (10+ variants)

type ReportEvent = ... (6 variants)
type SecurityAndFeedbackEvent = ... (8 variants)
type LogEvent = ... (2 variants)
type RehydrationEvent = ... (3 variants)

// 4. COMPOSICIÓN DE EVENTOS
type BaseDomainEvent = SessionEvent | SystemEvent | ReportEvent | ...
type RetryEvent = { type: 'EVENT_RETRY_REQUESTED'; originalEvent: BaseDomainEvent; retryCount; reason }
type DomainEvent = BaseDomainEvent | RetryEvent

// 5. ADAPTADORES (Contratos de Infraestructura)
interface WorkTrackerRuntimeAdapter {
  sessionStore: any
  location: any
  notifications: any
  reports: any
  security: any
  logging: any
}

type EffectHandler = (
  event: DomainEvent,
  prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
) => Promise<DomainEvent[]>
```

#### Visualización de Estado Canónico

```
WorkTrackerCanonicalState
├── meta
│   ├── schemaVersion: 1
│   ├── timezone: "America/Los_Angeles"
│   ├── locale: "es" | "en"
│   └── bootState
│       ├── isRehydrating: boolean
│       └── lastHydratedAtMs: number | null
│
├── domain (PERSISTIDO EN BD)
│   ├── sessions
│   │   ├── byId: { [sessionId]: SessionRecord }
│   │   ├── order: number[] (IDs en orden)
│   │   └── activeSessionId: number | null
│   ├── settings: AppSettingsRecord
│   └── audit
│       ├── auditLogs: AuditLogRecord[]
│       └── systemLogs: SystemLogRecord[]
│
├── runtime (ESTADO OPERATIVO VOLÁTIL)
│   ├── permissions (estado de grants del SO)
│   ├── geofence (estado de monitoreo GPS)
│   │   └── lastExitTimestampMs ← CLAVE PARA FAILSAFE
│   ├── background (tareas en bg)
│   ├── notifications (canales)
│   ├── security (admin PIN unlock)
│   └── transient (feedback queue, drafts)
│
└── views (ESTADO DE UI DERIVADO)
    ├── currentOperationalState.engineState
    ├── selectedSession.selectedSessionId
    ├── history.activeFilter
    └── report.selectedRange
```

#### Tamaño del Estado

```
WorkTrackerCanonicalState est. ~5-50 KB en memoria
├── Parte volátil (runtime): ~1 KB
├── Parte persistida (domain.sessions): ~40 KB (100 sesiones × 400 bytes)
└── Parte UI (views): ~100 bytes
```

---

### **E. state/initialState.ts (102 líneas)**

#### Responsabilidad
Crear estado inicial limpio con valores por defecto.

```typescript
export const createInitialState = (): WorkTrackerCanonicalState => ({
  meta: { schemaVersion: 1, timezone: 'America/Los_Angeles', locale: 'es', bootState: { ... } },
  domain: {
    sessions: { byId: {}, order: [], activeSessionId: null },
    settings: { employeeName: 'Empleado Nuevo', hourlyRate: 25.0, ... },
    audit: { auditLogs: [], systemLogs: [] }
  },
  runtime: {
    permissions: { locationForeground: 'unknown', ... },
    geofence: { isMonitoring: false, lastExitTimestampMs: null, ... },
    background: { appTask: { isRegistered: false, ... }, ... },
    security: { adminAccess: { isUnlocked: false, ... } },
    transient: { pendingFeedback: [], draftNotesBySessionId: {}, ... }
  },
  views: {
    currentOperationalState: { engineState: 'NO_INICIADA' },
    selectedSession: { selectedSessionId: null },
    history: { activeFilter: 'Todos' },
    report: { selectedRange: { startAtMs: null, ... } }
  }
})
```

---

### **F. hooks/useWorkTracker.ts (50 líneas)**

#### Responsabilidad
Puente React: subscripción al engine, state binding, dispatch wrapper.

```typescript
export const useWorkTracker = () => {
  const [state, setState] = useState<WorkTrackerCanonicalState>(
    workTrackerEngine.getState()  // ← Estado inicial del engine
  )
  
  useEffect(() => {
    // Listener (implementación removida en código, pero debería existir)
    const listener = (newState) => setState(newState)
    // workTrackerEngine.subscribe(listener)  ← MISSING!
    
    // Cleanup
    return () => {
      // workTrackerEngine.unsubscribe(listener)  ← MISSING!
    }
  }, [])
  
  const dispatch = useCallback((event: DomainEvent) => {
    workTrackerEngine.dispatch(event)
  }, [])
  
  return { state, dispatch }
}
```

**⚠️ PROBLEMA CRÍTICO**: El hook es inútil sin un sistema de subscripción. La UI no recibe actualizaciones de estado.

#### Solución Propuesta

```typescript
// Engine debería exponer:
class WorkTrackerEngine {
  private listeners: Set<(state: WorkTrackerCanonicalState) => void> = new Set()
  
  public subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  
  private notifyListeners() {
    this.listeners.forEach(l => l(this.state))
  }
  
  private async processEvent(event) {
    // ... reduce, execute effects
    this.notifyListeners()  // ← Después de cada cambio
  }
}

// Hook
export const useWorkTracker = () => {
  const [state, setState] = useState(workTrackerEngine.getState())
  
  useEffect(() => {
    const unsubscribe = workTrackerEngine.subscribe(setState)
    return unsubscribe
  }, [])
  
  // ...
}
```

---

### **G. selectors/index.ts (127 líneas)**

#### Responsabilidad
Queries derivadas del estado canónico.

| Selector | Descripción |
|---|---|
| `selectActiveSession()` | Retorna sesión activa o null |
| `selectEngineState()` | Deriva visual state operativo (NO_INICIADA, EN_TRASLADO, ACTIVA, etc.) |
| `selectSystemHealth()` | Checks: isGpsActive, isGpsError, isSyncing |
| `selectComputedSessions()` | Calcula horas y salarios de cada sesión |
| `selectPendingFeedback()` | Toasts/dialogs encolados |
| `selectIsAdminUnlocked()` | Check si admin zone está desbloqueada |

#### Implementación Clave: selectEngineState

```typescript
export const selectEngineState = (state): string => {
  const activeSession = selectActiveSession(state)
  if (!activeSession) return 'NO_INICIADA'
  
  const { domainStatus } = activeSession.lifecycle
  const { lastExitTimestampMs } = state.runtime.geofence
  
  if (domainStatus === 'travel') return 'EN_TRASLADO'
  if (domainStatus === 'pending_arrival') return 'ESPERANDO_LLEGADA'
  
  if (domainStatus === 'active') {
    if (lastExitTimestampMs) return 'SALIDA_DETECTADA'
    return 'ACTIVA'
  }
  
  return 'CERRADA'
}
```

**VENTAJA**: `engineState` **derivado dinámicamente**, nunca estático en BD.

---

## IV. MATRIZ DE FLUJOS (EVENTO → REDUCER → EFFECTS)

### **Caso de Uso 1: USER CREA SESIÓN**

```
TRIGGER: User presses "Iniciar Jornada" button
├─ dispatch({ type: 'SESSION_CREATED', session: {...} })
│
├─ ENGINE: enqueue event
├─ VALIDATE: no activeSession ✓
├─ REDUCE: state.domain.sessions.byId[id] = session, activeSessionId = id
│         state.views.selectedSession = id
│         engineState derivado → 'ESPERANDO_LLEGADA'
│
├─ EFFECTS[SESSION_CREATED]:
│  ├─ await runtime.sessionStore.createSession(session)  [DB INSERT]
│  ├─ await runtime.location.startMonitoringArrival(lat, lng, radius)  [GPS START]
│  ├─ → GEOFENCE_MONITORING_STARTED event
│  ├─ → AUDIT_LOG_APPENDED event
│  └─ → SYSTEM_LOG_APPENDED event
│
└─ SECONDARY EVENTS re-enqueueing:
   ├─ process GEOFENCE_MONITORING_STARTED
   ├─ process AUDIT_LOG_APPENDED (→ DB INSERT)
   └─ process SYSTEM_LOG_APPENDED (→ DB INSERT + FEEDBACK)
```

### **Caso de Uso 2: GPS DETECTA ENTRADA (GEOFENCE ENTER)**

```
TRIGGER: Native Background Location API detects ENTER event
├─ [LocationManager.geofenceCallback() ejecuta]  ← PROBLEMA: ESCAPA DEL ENGINE!
├─ Obtiene sesión de DB
├─ UPDATE work_sessions SET status='active', actual_start_time=now()
├─ INSERT audit_log
├─ Notifications.scheduleNotificationAsync()
│
DEBERÍA SER:
├─ dispatch({ type: 'SESSION_AUTO_CHECKIN_GPS', sessionId, actualStartAtMs })
├─ ENGINE: enqueue + process
├─ REDUCE: state.domain.sessions[id].actualStartAtMs = actualStartAtMs
│         state.domain.sessions[id].lifecycle.locationConfirmed = true
│         state.runtime.geofence.lastExitTimestampMs = null
│         engineState → 'ACTIVA'
├─ EFFECTS[SESSION_AUTO_CHECKIN_GPS]:
│  ├─ await runtime.location.clearLastExitTimestamp()
│  ├─ await runtime.logging.appendAuditLog(...)
│  ├─ await runtime.notifications.notifyImmediate(...)
│  └─ → SYSTEM_LOG_APPENDED event
```

### **Caso de Uso 3: FAILSAFE (15 min sin geofence re-entry)**

```
TRIGGER: Background task timer expires
├─ [BackgroundTasks.failsafeCheck() ejecuta]
├─ Checks AsyncStorage.EXIT_TIMESTAMP_KEY
├─ IF (now - exitTime) > 15 min:
│  ├─ DB: UPDATE sessions SET status='completed', end_time=now()
│  ├─ Notifications.scheduleNotificationAsync()
│
DEBERÍA SER:
├─ dispatch({ type: 'SESSION_AUTO_CHECKOUT_GPS', sessionId, endAtMs })
├─ ENGINE: process
├─ REDUCE: state.domain.sessions[id].endAtMs = endAtMs
│         state.domain.sessions[id].lifecycle.domainStatus = 'completed'
│         state.domain.sessions.activeSessionId = null
├─ EFFECTS[SESSION_AUTO_CHECKOUT_GPS]:
│  ├─ await runtime.sessionStore.closeSession(id, endAtMs)
│  ├─ await runtime.location.stopMonitoring()
│  ├─ await runtime.notifications.notifyImmediate(...)
│  └─ → GEOFENCE_MONITORING_STOPPED, SYSTEM_LOG_APPENDED
```

---

## V. RIESGOS TÉCNICOS CRÍTICOS

### **🔴 RIESGOS CONCURRENCIA**

| ID | Riesgo | Ubicación | Probabilidad | Impacto |
|---|---|---|---|---|
| **C001** | **Race condition: isDrainingQueue** | workTrackerEngine.drainQueue() | BAJA | Si dispatch() llamado desde efecto while drenando |
| **C002** | **Múltiples geofences activos** | LocationManager + Effects | MEDIA | Si SESSION_CREATED + GEOFENCE_MONITORING_STARTED sin cleanup |
| **C003** | **AsyncStorage state desincronizado** | BackgroundTasks + AsyncStorage | MEDIA | EXIT_TIMESTAMP_KEY no atómico vs. state canónico |
| **C004** | **Retry queue loss on crash** | effects/index.ts retryQueue | ALTA | Si app crash durante retry, evento perdido |

### **🔴 RIESGOS CONSISTENCIA**

| ID | Riesgo | Ubicación | Probabilidad | Impacto |
|---|---|---|---|---|
| **S001** | **State + DB out of sync** | Effects fallidos parciales | MEDIA | Si sessionStore.createSession() OK pero logging.appendAuditLog() FAIL |
| **S002** | **Transacción BD interrumpida** | db.ts runInTransaction() | BAJA | Si connection lost durante ROLLBACK |
| **S003** | **Geofence region overlap** | Multiple sessions monitoring | MEDIA | 2 geofences cercanos → conflicting ENTER/EXIT |
| **S004** | **Soft-delete não verdadero** | reducer SESSION_DELETED_SOFT | BAJA | Nunca hace hard-delete, BD crece indefinidamente |

### **🔴 RIESGOS RENDIMIENTO**

| ID | Riesgo | Ubicación | Probabilidad | Impacto |
|---|---|---|---|---|
| **P001** | **Gran evento queue acumulación** | eventQueue sin limit | MEDIA | Si effects lentos → queue grows → memory leak |
| **P002** | **Shallow clone ineficiente** | cloneSessionsState() | BAJA | Copiar byId completo cada mutation (O(n)) |
| **P003** | **withDerivedViews() overhead** | cada reduce | BAJA | Derivar engineState en CADA evento |
| **P004** | **Timeout sin effects** | handlers async | ALTA | Si location.startMonitoring() cuelga → bloquea loop |

### **🔴 RIESGOS SEGURIDAD**

| ID | Riesgo | Ubicación | Probabilidad | Impacto |
|---|---|---|---|---|
| **Sec001** | **Admin PIN hardcoded** | securityAdapter | MEDIA | Si no sincronizado con backend |
| **Sec002** | **Logs contienen datos sensibles** | system/audit logs | BAJA | Si logs accesibles, leak de ubicaciones |
| **Sec003** | **No validación runtime de eventos** | reducer validateEvent | MEDIA | TS tipos erasables; runtime puede violar tipos |

---

## VI. TABLA RESUMEN: DEPENDENCIAS INTERNAS

```
workTrackerEngine
  ├─ → workTrackerReducer (reducer/index.ts)
  │   ├─ → DomainEvent, WorkTrackerCanonicalState (contracts/types)
  │   └─ → createInitialState (state/initialState.ts)
  │
  ├─ → executeEffects (effects/index.ts)
  │   ├─ → DomainEvent, WorkTrackerCanonicalState (contracts/types)
  │   ├─ → runtime adapters (boot.ts inyecta)
  │   ├─ → sessionStoreAdapter (load snapshots)
  │   └─ → buildReportPayload (payrollUtils)
  │
  └─ → boot.ts (inyección)
      ├─ → All runtime adapters
      ├─ → initDatabase()
      └─ → workTrackerEngine.initialize()

useWorkTracker (hook)
  ├─ → workTrackerEngine.getState()
  ├─ → workTrackerEngine.dispatch()
  └─ → useState, useEffect, useCallback (React)

selectors/index.ts
  ├─ → WorkTrackerCanonicalState (contracts/types)
  └─ → payrollUtils (calculateSessionDuration, calculatePay)
```

---

## VII. CHECKLIST DE ARQUITECTURA

### **Principios SOLID**

- [x] **S - Single Responsibility**: Engine (FIFO), Reducer (puro), Effects (I/O)
- [❌] **O - Open/Closed**: Reducer monolítico, difícil extensión por tipo de evento
- [⚠️] **L - Liskov Substitution**: WorkTrackerRuntimeAdapter muy grueso (6 métodos)
- [x] **I - Interface Segregation**: Contratos bien separados
- [x] **D - Dependency Inversion**: inyección en boot.ts, no singletons globales

### **Propiedades Event-Driven**

- [x] **FIFO Ordering**: Garantizado por `isDrainingQueue` flag
- [x] **Determinism**: Mismo evento + estado = mismo resultado (reducer puro)
- [x] **Event Sourcing**: Todos los cambios son eventos, replayable
- [⚠️] **Eventual Consistency**: DB se sincroniza en effects, no atómico con estado
- [❌] **Event Store**: No hay persistencia de eventos, solo snapshots en BD

### **Resilencia**

- [x] **Error Isolation**: try/catch en processEvent y effects
- [x] **Retry Mechanism**: Reintentos automáticos hasta 3 intentos
- [❌] **Dead Letter Queue**: No existe, eventos perdidos si 3 reintentos fallan
- [⚠️] **Observabilidad**: Sin logs estructurados, sin metrics
- [❌] **Circuit Breaker**: Sin protección si adapter falla persistentemente

---

## VIII. RECOMENDACIONES DE REFACTORIZACIÓN

### **Fase 1: FIX (Inmediato)**

1. **Implementar subscripción en useWorkTracker**
   ```typescript
   private listeners = new Set<Listener>()
   public subscribe(listener): () => void { ... }
   private notifyListeners() { listeners.forEach(l => l(this.state)) }
   ```

2. **Validación runtime de eventos (Zod)**
   ```typescript
   const eventSchema = z.union([
     z.object({ type: z.literal('SESSION_CREATED'), session: sessionSchema }),
     // ...
   ])
   export async function executeEffects(...) {
     const validated = eventSchema.parse(event)  // ← throws si inválido
   }
   ```

3. **Añadir timeout a effects**
   ```typescript
   async function executeWithTimeout(handler, event, ...args) {
     return Promise.race([
       handler(event, ...args),
       new Promise((_, r) => setTimeout(() => r(new TimeoutError()), 30000))
     ])
   }
   ```

### **Fase 2: REFACTOR (1-2 sprints)**

4. **Split reducer por dominio**
   ```typescript
   export function workTrackerReducer(state, event) {
     return compose(
       sessionReducer,
       permissionsReducer,
       geofenceReducer,
       reportReducer,
       feedbackReducer
     )(state, event)
   }
   ```

5. **Split effects por dominio**
   ```typescript
   effects/
   ├── session.effects.ts
   ├── geofence.effects.ts
   ├── report.effects.ts
   ├── logging.effects.ts
   └── index.ts (composite)
   ```

6. **Dead Letter Queue para retry**
   ```typescript
   const deadLetterQueue = new Map<string, FailedEvent>()
   if (retryCount > MAX_RETRY_ATTEMPTS) {
     deadLetterQueue.set(buildRetryKey(event), {
       event, error, retryCount, timestamp
     })
   }
   ```

### **Fase 3: OPTIMIZE (Roadmap)**

7. **Event Store (persistencia de eventos)**
   ```typescript
   // En lugar de snapshots, almacenar todos los eventos
   const eventLog: DomainEvent[] = []
   
   async function processEvent(event) {
     // ... reduce, effects
     await db.insertEvent(event)  // ← Append-only log
   }
   ```

8. **Immer.js para mutaciones más simples**
   ```typescript
   import produce from 'immer'
   
   const nextState = produce(state, draft => {
     draft.domain.sessions.byId[sessionId].actualStartAtMs = now
     draft.runtime.geofence.lastExitTimestampMs = null
   })
   ```

---

## IX. CONCLUSIÓN EJECUTIVA

| Aspecto | Evaluación | Comentario |
|---|---|---|
| **Arquitectura Core** | ⭐⭐⭐⭐⭐ | Motor FIFO puro, Redux-like reducer, effects handlers bien separados |
| **Confiabilidad** | ⭐⭐⭐⭐☆ | Error handling OK, pero sin dead letter queue ni timeout |
| **Mantenibilidad** | ⭐⭐⭐☆☆ | Archivos muy grandes (reducer 1.2k líneas, effects 1.5k líneas) |
| **Escalabilidad** | ⭐⭐⭐☆☆ | Sin índices en eventos, estado crecer ilimitado |
| **Testabilidad** | ⭐⭐⭐⭐☆ | Reducer puro es testeable. Effects con mocks de runtime. Hook requiere fix. |
| **OVERALL** | ⭐⭐⭐⭐☆ | **Solid foundation**, production-ready con fixes de P1 |

**Status**: 🟢 **USABLE** con mitigaciones críticas de concurrencia y consistency.
