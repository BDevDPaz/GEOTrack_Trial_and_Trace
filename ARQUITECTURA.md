---

# 📋 INVENTARIO ARQUITECTÓNICO COMPLETO
## GEOTrack_Trial_and_Trace | Sistema Event-Driven + Geolocalización

---

## I. DIAGRAMA TEXTUAL DE ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRESENTACIÓN (UI - React Native)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ src/components/                                                              │
│ ├── ui/         (Button, LoadingOverlay, AppBrandTitle, etc.)              │
│ ├── modals/     (DeleteSessionModal, etc.)                                 │
│ └── [screens - no visible en búsqueda, pero routeadas por expo-router]    │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │ (React hooks / Context)
┌──────────────────────────▼──────────────────────────────────────────────────┐
│              ESTADO CANÓNICO + ORQUESTACIÓN (State Management)              │
├─────────────────────────────────────────────────────────────────────────────┤
│ src/core/                                                                    │
│ ├── workTrackerEngine.ts          MOTOR CENTRAL EVENT-DRIVEN               │
│ │   (Dispatch → Queue → Reduce → Execute Effects → Re-dispatch)           │
│ │                                                                           │
│ ├── boot.ts                       INICIALIZACIÓN Y INYECCIÓN              │
│ │   (Inyecta runtime real, inicializa DB, APP_BOOT_STARTED)             │
│ │                                                                           │
│ ├── contracts/types.ts            CATÁLOGO FORMAL DE EVENTOS              │
│ │   (SessionEvent, SystemEvent, ReportEvent, etc.)                       │
│ │                                                                           │
│ ├── state/initialState.ts         ESTADO INICIAL CANÓNICO                 │
│ ├── reducer/index.ts              PURO: Valida + Muta Estado             │
│ ├── effects/                       IMPURO: Infraestructura (async)        │
│ ├── hooks/                         React hooks para subscripción           │
│ ├── selectors/                     Queries de estado                      │
│ │                                                                           │
│ └── runtime/                       ADAPTADORES (Contratos de Infra)       │
│     ├── sessionStoreAdapter.ts     DB SQLite                               │
│     ├── locationAdapter.ts         Geofencing + Location                  │
│     ├── notificationsAdapter.ts    Expo Notifications                     │
│     ├── reportsAdapter.ts          PDF Generation                         │
│     ├── securityAdapter.ts         Admin PIN / Auth                       │
│     └── loggingAdapter.ts          System + Audit Logs                    │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │ (dispatch events)
┌──────────────────────────▼──────────────────────────────────────────────────┐
│                       SERVICIOS Y LÓGICA DOMINIO                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ src/services/                                                                │
│ ├── LocationManager.ts            Geofencing: Auto Check-in/out            │
│ ├── BackgroundTasks.ts            Failsafe + Weekly Report Generation      │
│ ├── Notifications.ts              Scheduling notificaciones                │
│ ├── ReportGenerator.ts            PDF HTML → File System                   │
│ └── __tests__/                    Unit tests                               │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │ (CRUD + queries)
┌──────────────────────────▼──────────────────────────────────────────────────┐
│                        BASE DE DATOS (Persistence)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ src/database/                                                                │
│ └── db.ts                        SQLite (expo-sqlite)                       │
│     ├── work_sessions             Jornadas laborales                        │
│     ├── settings                  Configuración usuario                    │
│     ├── audit_logs                Trazabilidad completa                    │
│     └── system_logs               Registro de errores + eventos            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                    INFRAESTRUCTURA NATIVA Y UTILIDADES                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ src/utils/                                                                   │
│ ├── logger.ts                    Sistema de logs colorizado                │
│ ├── dateUtils.ts                 Manipulación de fechas                    │
│ ├── dayjsSetup.ts                Configuración dayjs                       │
│ ├── geoUtils.ts                  Cálculos geográficos                      │
│ ├── i18n.ts                      Internacionalización (ES/EN)              │
│ └── payrollUtils.ts              Cálculos de nómina                        │
│                                                                              │
│ src/constants/                   Valores literales                          │
│ src/context/                     React Context (si existe)                 │
│ src/feedback/                    Sistema de feedback (toasts/dialogs)      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                        CONFIGURACIÓN Y METADATOS                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ app.json                         Expo config + permisos Android/iOS         │
│ eas.json                         EAS Build config                          │
│ package.json                     Dependencias + scripts                    │
│ tsconfig.json                    TypeScript config                         │
└──────────────────────────────────────────────────────────────────────────────┘

FLUJO DE DATOS:
═════════════════════════════════════════════════════════════════════════════
UI (event trigger) → WorkTrackerEngine.dispatch(event)
                    → eventQueue.push(event)
                    → drainQueue()
                         → processEvent(event)
                         → workTrackerReducer(prevState, event)
                         → executeEffects(event, prevState, nextState, runtime)
                         → [secondaryEvents]
                         → enqueue(secondaryEvents)
→ DB.persist() + Native APIs (Geofencing, Notifications, etc.)
→ Redux-like subscription → UI re-render
```

---

## II. TABLA DE MÓDULOS CON RESPONSABILIDAD

| **Módulo** | **Ubicación** | **Responsabilidad Primaria** | **Dependencias** | **Patrón** |
|---|---|---|---|---|
| **WorkTrackerEngine** | `src/core/workTrackerEngine.ts` | Orquestación central. Despacha eventos FIFO, mantiene único estado canónico, ejecuta ciclo reduce→effects→re-dispatch | DomainEvent, WorkTrackerRuntimeAdapter, Reducer, Effects | **Event Sourcing + Redux** |
| **Boot** | `src/core/boot.ts` | Inicialización idempotente. Inyecta runtime adapters, inicializa DB, dispara APP_BOOT_STARTED | workTrackerEngine, initDatabase, todos los runtime adapters | **Composition Root** |
| **Contracts (Types)** | `src/core/contracts/types.ts` | Define catálogo formal de eventos, estado canónico, registros de dominio, adaptadores | (no deps externas) | **Domain-Driven Design** |
| **Reducer** | `src/core/reducer/index.ts` | Lógica pura. Valida evento + muta estado. SIN I/O, SIN async | DomainEvent, WorkTrackerCanonicalState | **Reducer Pattern** |
| **Effects** | `src/core/effects/` | Lógica impura. Ejecuta I/O (DB, GPS, Notifications). Retorna eventos secundarios | sessionStore, location, notifications, reports, security, logging | **Side Effect Handler** |
| **InitialState** | `src/core/state/initialState.ts` | Define estado inicial limpio del sistema | WorkTrackerCanonicalState interface | **Immutable Data** |
| **SessionStoreAdapter** | `src/core/runtime/sessionStoreAdapter.ts` | Contrato DB. Abstrae operaciones CRUD sobre `work_sessions`, `settings`, `audit_logs` | expo-sqlite (via db.ts) | **Repository + Adapter** |
| **LocationAdapter** | `src/core/runtime/locationAdapter.ts` | Contrato Geofencing. Abstrae start/stop monitoring, region definition | expo-location, expo-task-manager | **Adapter Pattern** |
| **NotificationsAdapter** | `src/core/runtime/notificationsAdapter.ts` | Contrato Notificaciones. Abstrae permisos, scheduling, envío inmediato | expo-notifications | **Adapter Pattern** |
| **ReportsAdapter** | `src/core/runtime/reportsAdapter.ts` | Contrato Reportes. Genera PDF, comparte, envía por email | expo-print, expo-sharing, expo-mail-composer, expo-file-system | **Adapter Pattern** |
| **SecurityAdapter** | `src/core/runtime/securityAdapter.ts` | Contrato Seguridad. Valida PIN admin, maneja state de acceso | (interno) | **Adapter Pattern** |
| **LoggingAdapter** | `src/core/runtime/loggingAdapter.ts` | Contrato Logging. Almacena system + audit logs con colores y categorías | db.ts (system_logs, audit_logs) | **Adapter Pattern** |
| **Database (db.ts)** | `src/database/db.ts` | Inicialización SQLite, transacciones, CRUD helpers, queries agregadas | expo-sqlite, dayjs, logger | **DAO + Transaction Manager** |
| **LocationManager** | `src/services/LocationManager.ts` | Orquestación de geofences. Auto Check-in en ENTRADA, inicia failsafe en SALIDA | locationAdapter, db, Notifications | **State Machine** |
| **BackgroundTasks** | `src/services/BackgroundTasks.ts` | Ejecución periódica (Failsafe 15min, Weekly Report Gen) | BackgroundTask API, db, generateWeeklyReport, locationAdapter | **Scheduled Tasks** |
| **Notifications** | `src/services/Notifications.ts` | Setup permisos, scheduleReminder, cancelAll. Orquestación de notificaciones | notificationsAdapter, getSettings, logger | **Facade** |
| **ReportGenerator** | `src/services/ReportGenerator.ts` | Genera HTML→PDF con datos de sesiones, calcula totales, formatea | db, reportsAdapter, dateUtils, payrollUtils | **Report Builder** |
| **UI Components** | `src/components/ui/` | React Native componentes (Button, LoadingOverlay, AppBrandTitle) | React Reanimated, expo-haptics, theme (useTheme) | **Component** |
| **UI Modals** | `src/components/modals/` | Modales de confirmación (DeleteSessionModal) | Button, useTheme, Animated | **Modal Component** |
| **Logger Util** | `src/utils/logger.ts` | Log con color ANSI + persistencia en DB | db.ts | **Cross-Cutting Concern** |
| **I18n** | `src/utils/i18n.ts` | Traducciones ES/EN, sistema de claves jerárquicas | i18n-js | **Localization** |
| **DateUtils** | `src/utils/dateUtils.ts` | Helpers para format, parse, math de fechas | dayjs | **Utility** |
| **GeoUtils** | `src/utils/geoUtils.ts` | Cálculo Haversine (distancia lat/lng) | (math nativo) | **Utility** |
| **PayrollUtils** | `src/utils/payrollUtils.ts` | Cálculo de horas, salarios, overtime | dayjs | **Utility** |

---

## III. RESPONSABILIDADES POR CAPA

### **A. Presentación (UI)**
- ✅ Renderizar componentes React Native
- ✅ Capturar eventos de usuario (onPress, onSubmit, etc.)
- ✅ Consultar estado canónico (hooks de subscripción)
- ✅ Disparar eventos al engine (`workTrackerEngine.dispatch()`)
- ❌ NO debe contener lógica de dominio
- ❌ NO debe acceder directo a BD

### **B. Orquestación y Estado (Core/Engine)**
- ✅ Mantener **único estado canónico** (WorkTrackerCanonicalState)
- ✅ Procesar eventos **en orden FIFO estricto**
- ✅ Ejecutar secuencia: **Reduce → Effects → Re-dispatch**
- ✅ Aislar errores sin romper el loop
- ✅ Inyectar infraestructura real (runtime adapters)
- ❌ NO debe hacer I/O sincrónico
- ❌ NO debe contener lógica de BD directa

### **C. Dominio (Reducer)**
- ✅ Validación de eventos
- ✅ Transformación de estado (pura, inmutable)
- ✅ Cálculos de negocio
- ❌ NO async, NO I/O

### **D. Efectos (Side Effects)**
- ✅ Ejecutar I/O: DB, GPS, Notifications, etc.
- ✅ Retornar eventos secundarios para re-procesamiento
- ✅ Manejar infraestructura vía adapters
- ❌ NO debe mutar estado directo

### **E. Infraestructura (Adapters)**
- ✅ Abstraer APIs nativas (expo-location, expo-notifications, etc.)
- ✅ Implementar contratos formales
- ✅ Manejo de permisos y ciclo de vida
- ✅ Transformar datos nativo → dominio

### **F. Base de Datos**
- ✅ CRUD con transacciones
- ✅ Esquema: sessions, settings, audit_logs, system_logs
- ✅ WAL mode para concurrencia
- ✅ Foreign keys + integridad referencial
- ❌ NO queries complejas sin índices

### **G. Servicios (Legacy/Puente)**
- ✅ Orquestación de múltiples adapters (LocationManager, BackgroundTasks)
- ✅ Lógica temporal (failsafe, scheduling)
- ⚠️ **RIESGO**: Algunos servicios todavía hacen dispatch directo (LocationManager.ts hace `await Notifications.scheduleNotificationAsync()` sin ir por el engine)

---

## IV. DEPENDENCIAS CRÍTICAS ENTRE MÓDULOS

### **Árbol de Dependencias**

```
workTrackerEngine
  ├── → workTrackerReducer
  │   ├── → contracts/types.ts (DomainEvent, WorkTrackerCanonicalState)
  │   └── → state/initialState.ts
  │
  ├── → executeEffects
  │   ├── → locationAdapter
  │   ├── → sessionStoreAdapter
  │   ├── → notificationsAdapter
  │   ├── → reportsAdapter
  │   ├── → securityAdapter
  │   └── → loggingAdapter
  │
  └── → boot.ts (inyección)
      ├── → database/db.ts (initDatabase)
      ├── → sessionStoreAdapter
      ├── → locationAdapter
      ├── → notificationsAdapter
      ├── → reportsAdapter
      ├── → securityAdapter
      └── → loggingAdapter

UI Components
  ├── → useTheme (React Context)
  ├── → workTrackerEngine.dispatch(event)
  │   └── → eventQueue + FIFO processing
  ├── → React Reanimated
  ├── → expo-haptics
  └── → Button, LoadingOverlay (ui components)

Services (Legacy Bridge)
  ├── LocationManager.ts
  │   ├── → locationAdapter (expo-location, expo-task-manager)
  │   ├── → db.ts (CRUD sessions)
  │   └── ⚠️ → Notifications.scheduleNotificationAsync (DIRECT, sin engine)
  │
  ├── BackgroundTasks.ts
  │   ├── → expo-background-task (scheduled)
  │   ├── → db.ts
  │   ├── → ReportGenerator.generateWeeklyReport()
  │   └── → AsyncStorage (EXIT_TIMESTAMP_KEY)
  │
  ├── Notifications.ts
  │   ├── → notificationsAdapter
  │   ├── → getSettings (db)
  │   └── → logger
  │
  └── ReportGenerator.ts
      ├── → db.ts (getAllAsync sessions)
      ├── → reportsAdapter (generatePdf)
      ├── → dateUtils, payrollUtils
      └── → escapeHtml

Database (db.ts)
  ├── → expo-sqlite
  ├── → dayjs (dateUtils)
  ├── → logger.ts (AUDIT_ACTIONS enum, logAudit)
  └── → setLoggerDB (bidirectional para logs)

Logger (utils/logger.ts)
  ├── → db.ts (system_logs, audit_logs) - CIRCULAR via setLoggerDB
  └── → i18n para mensajes

Utils
  ├── dateUtils → dayjs
  ├── geoUtils → (math nativo)
  ├── payrollUtils → dayjs
  ├── i18n → i18n-js
  └── dayjsSetup → dayjs + localization
```

### **Dependencias Externas (NPM)**

| Librería | Uso | Criticidad |
|---|---|---|
| `expo-location` | Geofencing + background location | 🔴 CRÍTICA |
| `expo-task-manager` | Geofence event callbacks | 🔴 CRÍTICA |
| `expo-background-task` | Failsafe + Weekly report | 🔴 CRÍTICA |
| `expo-sqlite` | Persistencia | 🔴 CRÍTICA |
| `expo-notifications` | Push + scheduled notifications | 🟡 IMPORTANTE |
| `expo-print` | PDF generation | 🟡 IMPORTANTE |
| `expo-file-system` | PDF storage | 🟡 IMPORTANTE |
| `expo-router` | Navigation | 🟡 IMPORTANTE |
| `react-native-reanimated` | Animaciones UI | 🟡 IMPORTANTE |
| `dayjs` | Date/time manipulation | 🟡 IMPORTANTE |
| `react` / `react-native` | Framework | 🔴 CRÍTICA |
| `i18n-js` | Localización | 🟢 OPCIONAL |
| `@react-navigation/*` | Tab navigation | 🟡 IMPORTANTE |

---

## V. FLUJO DE DATOS COMPLETO (CASO DE USO: AUTO CHECK-IN)

```mermaid
Geofence ENTER Event (OS level)
    ↓ (expo-location background callback)
LocationManager.geofenceCallback()
    ↓
  DB: getFirstAsync<WorkSession>
    ↓ (session.status === 'pending_arrival')
  ✓ Validación dominio
    ↓
Transacción DB:
  • UPDATE work_sessions SET status='active', actual_start_time=now
  • INSERT audit_log (AUTO_CHECKIN_GPS)
  • DELETE EXIT_TIMESTAMP_KEY (AsyncStorage)
  • INSERT system_log
    ↓
Notifications.scheduleNotificationAsync()  ⚠️ DIRECTO (NO por engine)
    ↓
  log('VERDE', 'OPERACION_EXITOSA', ...)
    ↓
  system_logs table → append + display
```

**⚠️ CRÍTICO**: Este flujo es PARCIALMENTE event-driven (backend geofence → engine) pero 
luego escapa para hacer I/O directo (notificaciones, BD) sin re-entrar en el engine. 
Ver **Riesgos Arquitectónicos** abajo.

---

## VI. RIESGOS ARQUITECTÓNICOS DETECTADOS

### **🔴 CRÍTICOS**

| ID | Riesgo | Ubicación | Impacto | Remediación |
|---|---|---|---|---|
| **R001** | **Escape de event loop** | LocationManager.ts, BackgroundTasks.ts | Efectos colaterales fuera del engine. Estado canónico no refleja acciones reales. Inconsistencia de estado. | Refactorizar: `locationCallback` → dispatch `SESSION_AUTO_CHECKIN_GPS` al engine. Engine ejecuta effects. |
| **R002** | **Circular dependency DB ↔ Logger** | db.ts ↔ logger.ts (`setLoggerDB`) | Difícil de testear. Riesgo de deadlock en transacciones. | Invertir dependencia: Logger acepta DB como parámetro, nunca lo inyecta. |
| **R003** | **AsyncStorage sin transacción** | BackgroundTasks.ts (`EXIT_TIMESTAMP_KEY`) | Race condition: 15min timer + AsyncStorage state pueden desincronizarse. | Mover EXIT_TIMESTAMP al estado canónico (WorkTrackerCanonicalState.runtime.geofence.lastExitTimestampMs). |
| **R004** | **Geofencing en background: sin cleanup** | LocationManager.ts | Si app crash durante monitoring → task huérfano en OS. | Implementar destructor + TaskManager.unregisterAllTasksAsync() en boot error handler. |
| **R005** | **ReportGenerator HTML hardcoded** | ReportGenerator.ts | Si requiero cambiar diseño PDF → refactor masivo. HTML mezclado con lógica. | Extraer template HTML a archivo separado o usar template engine. |

### **🟡 IMPORTANTES**

| ID | Riesgo | Ubicación | Impacto | Remediación |
|---|---|---|---|---|
| **R006** | **Reducer monolítico (33KB)** | src/core/reducer/index.ts | Difícil de testear, mantener y splitear por dominio. | Dividir en sub-reducers: sessionReducer, permissionsReducer, reportReducer, etc. |
| **R007** | **No hay error boundary en effects** | src/core/effects/ | Si un effect falla → puede romper el engine. | Wrappear cada effect handler en try/catch + retornar evento de error. |
| **R008** | **Types.ts sin validación en runtime** | contracts/types.ts | Event mal formado podría pasar. TypeScript no da garantías en runtime. | Agregar `zod` o `io-ts` para validación de eventos en la entrada al engine. |
| **R009** | **Permisos sin revalidación periódica** | boot.ts + locationAdapter | Si usuario revoca permisos en Settings → app no lo detecta. | Implementar listener de cambios de permisos nativo + dispatch `PERMISSIONS_LOCATION_UPDATED`. |
| **R010** | **No hay dead letter queue para eventos fallidos** | workTrackerEngine.ts | Eventos que fallan en effects → descartados silenciosamente. | Implementar EVENT_FAILED + cola de reintentos con backoff exponencial. |

### **🟢 MEJORABLES**

| ID | Riesgo | Ubicación | Impacto | Remediación |
|---|---|---|---|---|
| **R011** | **Logger colorizado solo en console** | logger.ts | Logs en DB no tienen color → difícil debuggear en audit. | Agregar `color` como campo estructurado en system_logs. |
| **R012** | **DB queries sin índices explícitos** | db.ts | SELECT por `status`, `start_time` sin índices → scans lentos. | Crear índices en `work_sessions(status, start_time)`, `audit_logs(session_id)`. |
| **R013** | **No hay versionamiento de schema SQLite** | db.ts | Difícil evolucionar BD sin perder datos. | Implementar migration system (e.g., `db.pragma_user_version`). |
| **R014** | **Context API vs. Redux** | [disperso en componentes] | Si hay muchas subscribers, React Context → re-renders innecesarios. | Considerar Zustand o Jotai para state management más granular. |
| **R015** | **Audit trail incompleto** | db.ts, services | Algunos eventos (e.g., notificación enviada) no se loguean. | Hacer que TODOS los side effects generen audit_log canonizado. |

---

## VII. PUNTOS CRÍTICOS IDENTIFICADOS

### **A. Motor Central (WorkTrackerEngine)**
```typescript
// ✅ FORTALEZA
- Patrón FIFO puro
- Protección contra recursión infinita
- Inyección de runtime (dependency injection)

// ⚠️ DEBILIDAD
- Sin mecanismo de timeout para events largos
- Sin observabilidad (no expone metrics)
- Sin rate limiting para dispatch concurrentes
```

### **B. Geofencing (LocationManager)**
```typescript
// ✅ FORTALEZA
- Callback preciso para ENTER/EXIT
- 15min failsafe es inteligente

// ⚠️ DEBILIDAD
- Event loop escape (no pasa por engine)
- Sin manejo de region overlap (2 geofences cercanos)
- EXIT lógico vs EXIT físico ambiguo (auto check-out necesita confirmación)
```

### **C. Base de Datos (db.ts)**
```typescript
// ✅ FORTALEZA
- WAL mode (concurrency safe)
- Transacciones ACID
- Soft-delete pattern

// ⚠️ DEBILIDAD
- Sin índices declarados
- Sin schema versioning
- Queries hardcoded (sin query builder)
- Circular dep con logger
```

### **D. Reportes (ReportGenerator)**
```typescript
// ✅ FORTALEZA
- HTML bien estructurado (estilos inlined)
- Cálculos correctos de horas/salarios
- Geofence markers en reporte

// ⚠️ DEBILIDAD
- HTML mezclado con TypeScript (code smell)
- Sin template caching
- Sin rate limiting en PDF generation
```

---

## VIII. TABLA RESUMEN DE PATRONES ARQUITECTÓNICOS

| Patrón | Ubicación | Evaluación |
|---|---|---|
| **Event Sourcing** | workTrackerEngine | ✅ Implementado correctamente; FIFO guarantee |
| **Redux (Reducer)** | src/core/reducer | ⚠️ Monolítico; necesita split por dominio |
| **Repository** | sessionStoreAdapter | ✅ Abstrae DB, testeable |
| **Adapter** | runtime/*.ts | ✅ Desacopla infraestructura nativa |
| **Dependency Injection** | boot.ts | ✅ Composición clara, sin singletons globales |
| **Service Locator** | (NO IDENTIFICADO) | ✅ Bien, evita anti-pattern |
| **State Machine** | LocationManager (geofence states) | ⚠️ Implícito, no documentado |
| **Facade** | Notifications.ts | ✅ Oculta complejidad de expo-notifications |
| **Observer** | useTheme, etc. (hooks) | ✅ React context para temas |
| **DAO** | db.ts CRUD helpers | ✅ Abstracciones CRUD estándar |
| **Transaction Script** | BackgroundTasks.ts failsafe | ⚠️ Lógica procedural; sin abstracción de command |

---

## IX. MATRIZ DE ACOPLAMIENTO

```
                         DB    Location  Notif  Engine  UI   Services
Engine        ────       └─X      X        X      ●      X      X
DB            ────       ●        └─X      X      ←─     X      ←─
Location      ────       X        ●        X      (NO!)  X      ●
Notifications ────       X        X        ●      (NO!)  X      ●
Services      ────       X        ←─       ←─     (?)    X      ●
UI            ────       (NO!)    (NO!)    (NO!)  ←─     ●      (NO!)

Legend:
● = alta acoplamiento (ok si es dentro de su dominio)
X = bajo/nulo acoplamiento (ideal)
← = dependencia (flecha hacia módulo requerido)
(NO!) = acoplamiento NO permitido por arquitectura
(?) = acoplamiento ambiguo, riesgo detectado
```

---

## X. CHECKLIST DE AUDITORÍA

### **Adherencia a Principios**

- [x] **SOLID - Single Responsibility**: Reducers puro, Effects impuro, Adapters para infra
- [❌] **SOLID - Dependency Inversion**: DB ↔ Logger circular; LocationManager escapa del engine
- [⚠️] **SOLID - Interface Segregation**: WorkTrackerRuntimeAdapter muy grueso (6 adapters)
- [x] **DRY**: Reutilización de logger, dateUtils, etc.
- [❌] **KISS**: ReportGenerator con HTML inlined es poco maintainable
- [⚠️] **Testabilidad**: Engine testeable, pero DB ↔ Logger circular dificulta TDD

### **Compliance**

- [x] TypeScript strict mode
- [x] No `any` en contracts críticos
- [x] Constants centralizadas
- [❌] Validación de runtime en eventos (zod/io-ts ausente)
- [⚠️] Error handling inconsistente (try/catch disperso, sin centralization)
- [x] Audit trail presente

---

## XI. RECOMENDACIONES PRIORIZADAS PARA REFACTORIZACIÓN

### **Fase 1: Estabilidad (P0 - INMEDIATO)**

1. **Cerrar escape de event loop** (R001)
   - LocationManager.geofenceCallback → dispatch() al engine
   - BackgroundTasks failsafe → dispatch() al engine
   - Eliminar Notifications.scheduleNotificationAsync() directo

2. **Romper circular dependency DB ↔ Logger** (R002)
   - Logger no inyecta BD; BD pasa logger como parámetro
   - setLoggerDB() → constructor injection

3. **Mover AsyncStorage state → Estado canónico** (R003)
   - EXIT_TIMESTAMP_KEY → WorkTrackerCanonicalState.runtime.geofence.lastExitTimestampMs

### **Fase 2: Mantenibilidad (P1 - 1-2 SPRINTS)**

4. **Split Reducer monolítico** (R006)
   - sessionReducer, permissionsReducer, backgroundReducer, etc.
   - Componer en workTrackerReducer via pattern reducer composition

5. **Validación de eventos en runtime** (R008)
   - Agregar `zod` → parseEvent(event) antes de dispatch
   - Fail-fast en boundary de engine

6. **Índices SQLite** (R012)
   - CREATE INDEX idx_work_sessions_status_start ON work_sessions(status, start_time)
   - CREATE INDEX idx_audit_logs_session ON audit_logs(session_id)

### **Fase 3: Escalabilidad (P2 - ROADMAP)**

7. **Dead Letter Queue para eventos fallidos** (R010)
   - Tabla: `failed_events` con retry_count, last_error
   - Retry mechanism con backoff exponencial

8. **Error boundary en effects** (R007)
   - Cada effect handler con try/catch → EVENT_FAILED

9. **Observabilidad del engine** (R001 extension)
   - Exponer metrics: eventCount, averageProcessingMs, queueDepth
   - Dashboard en admin panel

10. **Versionamiento de schema DB** (R013)
    - Usar PRAGMA user_version + migration table
    - Scripts de migration por version

---

## XII. CONCLUSIÓN

**GEOTrack_Trial_and_Trace** implementa una **arquitectura event-driven sólida** basada en un **motor central (WorkTrackerEngine)** que gestiona estado canónico, reduce transiciones y ejecuta efectos. 

### **Fortalezas:**
- ✅ Separación clara: dominio (reducer) vs. infraestructura (adapters)
- ✅ State management centralizado y predecible
- ✅ Geofencing + background tasks bien integrados
- ✅ Audit trail completo

### **Debilidades Críticas:**
- ❌ Event loop escape en servicios de geofencing
- ❌ Circular dependency DB ↔ Logger
- ❌ Reducer monolítico (33KB)
- ❌ Falta validación runtime de eventos

### **Próximos Pasos:**
1. **INMEDIATO**: Cerrar escapes de event loop
2. **CORTO PLAZO**: Split reducer, agregar validación, romper circular deps
3. **MEDIANO PLAZO**: Dead letter queue, observabilidad, schema versioning

**Recomendación Final**: Realizar refactorización **Fase 1** antes de expandir features críticas de payroll/reporting. Los riesgos detectados impactarán integridad de datos en producción.

---

¿Deseas que profundice en algún módulo específico, genere un inventario de **tests faltantes**, o analice el flujo de un **caso de uso particular**?
