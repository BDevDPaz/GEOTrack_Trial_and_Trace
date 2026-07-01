---

# 📍 INVENTARIO TÉCNICO COMPLETO: GEOLOCALIZACIÓN & BACKGROUND TASKS
## GEOTrack_Trial_and_Trace | GPS + Geofencing + Failsafe + Weekly Reports

---

## I. FLUJO PASO A PASO: ENTRADA/SALIDA DE GEOFENCE

### **FASE 1: SETUP INICIAL (APP STARTUP)**

```
User Launches App
    ↓
App Boots → boot.ts
    ├─ workTrackerEngine.initialize(productionRuntime)
    ├─ initDatabase()
    ├─ dispatch({ type: 'APP_BOOT_STARTED' })
    └─ dispatch({ type: 'APP_REHYDRATION_COMPLETED' })
        ↓
Core/Effects: handleAppBootStarted()
    ├─ runtime.location.requestPermissions()
    │   ├─ Location.requestForegroundPermissionsAsync()
    │   └─ Location.requestBackgroundPermissionsAsync()
    │       → User grant dialog (iOS/Android)
    │
    ├─ Load sessions snapshot from DB
    │   └─ Find session with status = 'pending_arrival' | 'travel'
    │
    └─ IF session exists && has targetLatitude/targetLongitude:
       ├─ dispatch({ type: 'SESSION_AUTO_CHECKIN_GPS', ... })
       │
       ├─ Effects: handleSessionAutoCheckinGps()
       │   └─ runtime.location.startMonitoringArrival(lat, lng, radius)
       │       ↓
       │       LocationAdapter.startMonitoringArrival()
       │       ├─ Location.startGeofencingAsync(GEOFENCE_TASK, [
       │       │   {
       │       │     identifier: 'WORK_ZONE',
       │       │     latitude, longitude,
       │       │     radius: 200m,
       │       │     notifyOnEnter: true,
       │       │     notifyOnExit: true
       │       │   }
       │       │ ])
       │       │
       │       └─ Location.getCurrentPositionAsync()  [Warm-up GPS]
       │           → Triggers native location hardware
       │
       └─ dispatch({ type: 'GEOFENCE_MONITORING_STARTED', ... })
```

#### Registros Críticos
- ✅ TaskManager.defineTask(GEOFENCE_TASK, ...) → Ejecuta al inicializar módulo
- ✅ TaskManager.defineTask(APP_BACKGROUND_SERVICES) → Ejecuta al inicializar módulo
- ✅ BackgroundTasks.register() → Llama a BackgroundTask.registerTaskAsync()

---

### **FASE 2: USER CREA SESIÓN**

```
User Presses "Iniciar Jornada"
    ↓
dispatch({ type: 'SESSION_CREATED', session: { ... } })
    ↓
ENGINE: Queue event
    ↓
REDUCE: 
  ├─ state.domain.sessions.byId[id] = session
  ├─ state.domain.sessions.activeSessionId = id
  └─ engineState → 'ESPERANDO_LLEGADA'
    ↓
EFFECTS: handleSessionCreated()
  ├─ runtime.sessionStore.createSession(session)
  │   └─ DB INSERT INTO work_sessions
  │
  └─ runtime.location.startMonitoringArrival(
       session.destination.targetLatitude,
       session.destination.targetLongitude,
       radius: 200m
     )
     ├─ Location.startGeofencingAsync(GEOFENCE_TASK, [...])
     │   → Registra región circular en OS
     │   → OS comienza tracking background
     │
     └─ Location.getCurrentPositionAsync()  [Warm-up]
```

**Nota**: No espera respuesta de GPS, es async fire-and-forget.

---

### **FASE 3: DEVICE CROSSES GEOFENCE BOUNDARY (ENTRADA)**

```
                         [Native OS Level]
                         ═══════════════════════════════════════
                         Device Location Service detects
                         user position ENTER radius=200m
                              ↓
                         Triggers registered callback:
                         GEOFENCE_TASK
                              ↓
           ┌──────────────────────────────────────────┐
           │  TaskManager.defineTask callback fires   │
           │  async ({ data, error })                │
           └──────────────────────────────────────────┘
                              ↓
                         [App Level - Background]
                              ↓
                    LocationManager.ts handler
                    ├─ Obtiene DB connection
                    ├─ Query: SELECT * FROM work_sessions 
                    │         WHERE status IN ('pending_arrival', 'travel')
                    │         ORDER BY id DESC LIMIT 1
                    │
                    ├─ IF session exists AND 
                    │     (session.status === 'pending_arrival' ||
                    │      session.status === 'travel'):
                    │
                    └─ await Promise.all([
                        // 1. UPDATE DB
                        db.runAsync(
                          "UPDATE work_sessions 
                           SET status='active', actual_start_time=?
                           WHERE id=?",
                          [now, session.id]
                        ),
                        
                        // 2. INSERT AUDIT LOG
                        insertAuditLog(session.id, 'AUTO_CHECKIN_GPS', ...),
                        
                        // 3. CLEAR EXIT TIMESTAMP
                        AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY),
                        
                        // 4. NOTIFY USER
                        Notifications.scheduleNotificationAsync({
                          title: '📍 Llegaste al sitio',
                          body: 'Auto Check-in (GPS) realizado.',
                          trigger: null
                        })
                      ])
                        ↓
                        log('VERDE', 'OPERACION_EXITOSA', ...)
```

**⚠️ PROBLEMA CRÍTICO**: Este flujo **ESCAPA DEL ENGINE**. No dispatch, no reducción. 
Estado canónico potencialmente desincronizado.

---

### **FASE 4: DEVICE CROSSES GEOFENCE BOUNDARY (SALIDA)**

```
                         [Native OS Level]
                         ═══════════════════════════════════════
                         Device Location Service detects
                         user position EXIT radius=200m
                              ↓
                         Triggers GEOFENCE_TASK callback
                              ↓
                    LocationManager.ts handler
                    ├─ Query: SELECT * FROM work_sessions
                    │
                    └─ IF session.status === 'active':
                        ├─ AsyncStorage.setItem(
                        │   EXIT_TIMESTAMP_KEY,
                        │   Date.now().toString()  ← ¡CLAVE!
                        │ )
                        │
                        ├─ insertAuditLog(
                        │   session.id,
                        │   'GEOFENCE_EXIT',
                        │   'Salida del radio de trabajo detectada.'
                        │ )
                        │
                        └─ Notifications.scheduleNotificationAsync({
                             title: '⚠️ Saliste del área de trabajo',
                             body: '¿Terminaste tu jornada o vas a otro sitio?',
                             priority: MAX,
                             vibrate: [0, 500, 200, 500]
                           })
                            ↓
                            log('NARANJA', 'EVENTO_GEOCERCA', 'EVENT', ...)
                            
                        ESPERA 15 MINUTOS ANTES DE AUTO-CHECKOUT
                        (Handled by BackgroundTask failsafe)
```

**EXIT_TIMESTAMP_KEY**: Esta clave es el **puente** entre geofence y failsafe.

---

### **FASE 5: FAILSAFE AUTO CHECKOUT (15 MIN INACTIVITY)**

```
Every ~15 minutes (minimumInterval: 15)
    ↓
BackgroundTask OS scheduler triggers
    ↓
TaskManager.defineTask(APP_BACKGROUND_SERVICES, ...) callback
    ├─ Check: isTaskRunning mutex
    ├─ await ensureDbReady()
    │
    └─ TRY FAILSAFE:
       ├─ lastExitStr = await AsyncStorage.getItem(EXIT_TIMESTAMP_KEY)
       │
       ├─ IF lastExitStr exists:
       │   ├─ exitTime = parseInt(lastExitStr)
       │   ├─ now = dayjs().valueOf()
       │   ├─ timeDiff = now - exitTime
       │   │
       │   └─ IF timeDiff > 15_MINUTES (900_000 ms):
       │       ├─ session = db.getFirstAsync(
       │       │   "SELECT * FROM work_sessions 
       │       │    ORDER BY id DESC LIMIT 1"
       │       │ )
       │       │
       │       ├─ IF session?.status === 'active':
       │       │   ├─ updateSessionEndTime(session.id, exitTime)
       │       │   │   └─ UPDATE work_sessions 
       │       │   │       SET end_time=?, status='completed'
       │       │   │
       │       │   ├─ insertAuditLog(
       │       │   │   session.id,
       │       │   │   'AUTO_CHECKOUT_GPS',
       │       │   │   'Auto Check-out (GPS) por inactividad...'
       │       │   │ )
       │       │   │
       │       │   ├─ LocationService.stopMonitoring()
       │       │   │   └─ Location.stopGeofencingAsync(GEOFENCE_TASK)
       │       │   │       Location.stopLocationUpdatesAsync(GEOFENCE_TASK)
       │       │   │
       │       │   └─ Notifications.scheduleNotificationAsync({
       │       │       title: 'Jornada Finalizada 🏁',
       │       │       body: 'Tu sesión se cerró automáticamente...'
       │       │     })
       │       │       ↓
       │       │       log('AMARILLO', 'ADVERTENCIA', ...)
       │       │
       │       └─ AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY)
       │           (Clean up para siguiente ciclo)
       │
       └─ RETURN BackgroundTask.BackgroundTaskResult.Success
```

**Timing Diagram**:
```
SALIDA (EXIT)            Timer inicia → EXIT_TIMESTAMP = T0
  ├─ T0 + 0 min: Usuario sale, notificación
  ├─ T0 + 5 min: Background task #1 ejecuta (timeDiff=5min < 15min) → nada
  ├─ T0 + 10 min: Background task #2 ejecuta (timeDiff=10min < 15min) → nada
  ├─ T0 + 15 min: Background task #3 ejecuta (timeDiff=15min >= 15min) → AUTO-CHECKOUT ✓
  └─ T0 + 20 min: Background task #4 ejecuta (EXIT_TIMESTAMP_KEY cleared) → nada
```

---

### **FASE 6: WEEKLY REPORT GENERATION**

```
Background Task Loop (Every ~15 min)
    ├─ Check: day of week
    │
    └─ IF (domingo 20:00+) OR (lunes) OR (martes):
       ├─ targetWeek = day === 0 ? current : previous
       │
       ├─ startTs = targetWeek.startOf('isoWeek').valueOf()
       │ endTs = targetWeek.endOf('isoWeek').valueOf()
       │
       ├─ currentWeekId = targetWeek.startOf('isoWeek').format('YYYY-MM-DD')
       │
       ├─ lastReported = await AsyncStorage.getItem(REPORT_STORAGE_KEY)
       │
       └─ IF lastReported !== currentWeekId:
          ├─ pdfUri = await generateWeeklyReport(false, {
          │   start: startTs,
          │   end: endTs
          │ })
          │
          ├─ Notifications.scheduleNotificationAsync({
          │   title: '📄 Reporte Semanal Listo',
          │   body: 'Toca para revisar y enviar tu nómina.',
          │   data: { action: 'GENERATE_REPORT_PROMPT' }
          │ })
          │
          └─ AsyncStorage.setItem(REPORT_STORAGE_KEY, currentWeekId)
             (Previene duplicados)
```

---

## II. TABLA DE COMPONENTES INVOLUCRADOS

| Componente | Ubicación | Responsabilidad | Tipo | Estado |
|---|---|---|---|---|
| **TaskManager.defineTask(GEOFENCE_TASK)** | LocationManager.ts L17 | Handler para eventos geofence ENTER/EXIT | Event Listener | 🔴 ACTIVO SIEMPRE |
| **Location.startGeofencingAsync()** | locationAdapter.ts L58 | Inicia monitoreo de región circular nativa | Expo API | ✅ ACTIVO |
| **Location.stopGeofencingAsync()** | locationAdapter.ts L84 | Detiene monitoreo | Expo API | ✅ ACTIVO |
| **Location.getCurrentPositionAsync()** | locationAdapter.ts L70 | Warm-up del GPS para precisión inicial | Expo API | ✅ ACTIVO |
| **Location.requestForegroundPermissionsAsync()** | locationAdapter.ts L35 | Pide permiso en primer plano | Expo API | ✅ ACTIVO |
| **Location.requestBackgroundPermissionsAsync()** | locationAdapter.ts L40 | Pide permiso en segundo plano (crítico) | Expo API | ✅ ACTIVO |
| **TaskManager.defineTask(APP_BACKGROUND_SERVICES)** | BackgroundTasks.ts L27 | Handler para failsafe + weekly report | Event Listener | 🔴 ACTIVO SIEMPRE |
| **BackgroundTask.registerTaskAsync()** | BackgroundTasks.ts L196 | Registra tarea periódica (~15 min) | Expo API | ✅ ACTIVO |
| **BackgroundTask.getStatusAsync()** | BackgroundTasks.ts L186 | Chequea si background tasks permitidas por OS | Expo API | ✅ ACTIVO |
| **AsyncStorage.setItem(EXIT_TIMESTAMP_KEY)** | LocationManager.ts L83 | Guarda timestamp de salida | Persistencia | ✅ ACTIVO |
| **AsyncStorage.getItem(EXIT_TIMESTAMP_KEY)** | BackgroundTasks.ts L51 | Lee timestamp de salida para failsafe | Persistencia | ✅ ACTIVO |
| **Notifications.scheduleNotificationAsync()** | LocationManager.ts L51, L89 | Notificaciones inmediatas al usuario | Expo API | ✅ ACTIVO |
| **database/db.ts** | DatabaseLayer | CRUD de sesiones y audit logs | SQLite | ✅ ACTIVO |
| **locationAdapter** | core/runtime/locationAdapter.ts | Contrato de infraestructura para location | Adapter | ✅ ACTIVO |

---

## III. MATRIZ DE FLUJOS (POR EVENTO)

### **Flujo A: USER CREACIÓN DE SESIÓN → GEOFENCE START**

```
UI Button: "Iniciar Jornada"
  ↓ dispatch(SESSION_CREATED)
  ↓ Engine processes
  ├─ REDUCE: sessions.byId[id]=session, activeSessionId=id
  ├─ EFFECTS: handleSessionCreated
  │   ├─ runtime.sessionStore.createSession()  [DB]
  │   └─ runtime.location.startMonitoringArrival()  [GPS]
  │       └─ Location.startGeofencingAsync(GEOFENCE_TASK, [...])
  │           └─ OS comienza tracking
  └─ dispatch(GEOFENCE_MONITORING_STARTED)

✅ Estado canónico SINCRONIZADO
✅ DB actualizada
✅ GPS activo
```

### **Flujo B: GPS DETECTA ENTRADA → AUTO CHECKIN**

```
[Native OS detects ENTER]
  ↓ TaskManager callback (GEOFENCE_TASK)
  ↓ LocationManager handler
  ├─ DB query: getFirstAsync(work_sessions)
  ├─ IF status === 'pending_arrival':
  │   ├─ DB UPDATE: status='active', actual_start_time=now
  │   ├─ DB INSERT: audit_log
  │   ├─ AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY)
  │   └─ Notifications.scheduleNotificationAsync()
  │
  ❌ PROBLEMA: NO dispatch → ENGINE
  ❌ Estado canónico NO mutado
  ❌ Views derivadas desincronizadas
```

### **Flujo C: GPS DETECTA SALIDA → INICIA FAILSAFE TIMER**

```
[Native OS detects EXIT]
  ↓ TaskManager callback (GEOFENCE_TASK)
  ↓ LocationManager handler
  ├─ IF status === 'active':
  │   ├─ AsyncStorage.setItem(EXIT_TIMESTAMP_KEY, now)  ← BRIDGE KEY
  │   ├─ DB INSERT: audit_log('GEOFENCE_EXIT')
  │   └─ Notifications.scheduleNotificationAsync()
  │
  ❌ PROBLEMA: NO dispatch → ENGINE
  ❌ Estado canónico.runtime.geofence.lastExitTimestampMs NO actualizado
  ❌ Timer es volátil (AsyncStorage) no parte de estado canonical
```

### **Flujo D: BACKGROUND TASK EJECUTA → FAILSAFE O REPORT**

```
BackgroundTask timer (~15 min interval)
  ↓ TaskManager callback (APP_BACKGROUND_SERVICES)
  ├─ FAILSAFE:
  │   ├─ lastExitStr = AsyncStorage.getItem(EXIT_TIMESTAMP_KEY)
  │   ├─ IF timeDiff > 15min:
  │   │   ├─ DB UPDATE: status='completed', end_time=exitTime
  │   │   ├─ DB INSERT: audit_log
  │   │   ├─ Location.stopGeofencingAsync()
  │   │   └─ Notifications.scheduleNotificationAsync()
  │   └─ AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY)
  │
  └─ WEEKLY REPORT:
      ├─ IF isReportWindow (Sun 20:00+ OR Mon OR Tue):
      │   ├─ generateWeeklyReport()
      │   ├─ Notifications.scheduleNotificationAsync()
      │   └─ AsyncStorage.setItem(REPORT_STORAGE_KEY)
      │
      ❌ PROBLEMA: NO dispatch → ENGINE
      ❌ Cambios de estado no canónicos
```

---

## IV. DEPENDENCIAS CON PERMISOS DEL SISTEMA

### **iOS Permissions Flow**

```
app.json:
├─ infoPlist:
│  ├─ UIBackgroundModes: ["location", "fetch"]
│  │  └─ Declara al sistema que app puede ejecutar en bg
│  │
│  ├─ NSLocationWhenInUseUsageDescription:
│  │  "GEOTrack necesita tu ubicación..."
│  │  └─ Prompt para "While Using"
│  │
│  └─ NSLocationAlwaysAndWhenInUseUsageDescription:
│     "GEOTrack requiere acceso a tu ubicación en segundo plano..."
│     └─ Prompt para "Always" (requerido para geofencing)
│
Boot Sequence:
  ├─ Location.requestForegroundPermissionsAsync()
  │  └─ Asks: "Allow GEOTrack to access your location
  │             while using the app?"
  │     ├─ Yes → status = 'granted'
  │     └─ No → status = 'denied'
  │
  └─ IF fgStatus === 'granted':
     └─ Location.requestBackgroundPermissionsAsync()
        └─ Asks: "Allow GEOTrack to access your location
                   at all times?"
           ├─ Always → status = 'granted'
           │  └─ Geofencing NOW ACTIVE
           ├─ Only While Using → status = 'denied'
           │  └─ Geofencing DISABLED (fallback needed)
           └─ Never → status = 'denied'
```

**iOS State Machine**:
```
┌─────────────────────────────────────────────────────┐
│ User opens Settings → Privacy → Location Services  │
├─────────────────────────────────────────────────────┤
│ App: GEOTrack_Trial_and_Trace                       │
│ └─ Never (🔴)                                       │
│    Foreground: ❌ Denied                           │
│    Background: ❌ Denied                           │
│    Geofencing: ❌ NO                               │
│                                                     │
│ └─ While Using (🟡)                               │
│    Foreground: ✅ Granted                         │
│    Background: ❌ Denied                           │
│    Geofencing: ❌ NO (insufficient)               │
│                                                     │
│ └─ Always (🟢)                                    │
│    Foreground: ✅ Granted                         │
│    Background: ✅ Granted                         │
│    Geofencing: ✅ YES                             │
└─────────────────────────────────────────────────────┘
```

### **Android Permissions Flow**

```
app.json:
├─ android:
│  ├─ permissions: [
│  │  "ACCESS_COARSE_LOCATION",           ← Approx 5km
│  │  "ACCESS_FINE_LOCATION",             ← 1-10m precision
│  │  "ACCESS_BACKGROUND_LOCATION",       ← Background tracking
│  │  "FOREGROUND_SERVICE",               ← Foreground service API
│  │  "FOREGROUND_SERVICE_LOCATION",      ← Location foreground service
│  │  "RECEIVE_BOOT_COMPLETED",           ← Auto-start on boot
│  │  "WAKE_LOCK"                         ← Keep CPU awake
│  │ ]
│  │
│  └─ Exposed in AndroidManifest.xml during build
│
app.json:
├─ expo-location plugin:
│  └─ locationAlwaysAndWhenInUsePermission:
│     "Permite a GEOTrack usar tu ubicación en segundo plano..."
│
Boot Sequence (Android 12+):
  ├─ Location.requestForegroundPermissionsAsync()
  │  └─ Runtime permission dialog:
  │     ┌─────────────────────────────────────────┐
  │     │ GEOTrack needs access to your location  │
  │     │ [Allow all the time] [Allow only while] │
  │     │                       [Don't allow]      │
  │     └─────────────────────────────────────────┘
  │     ├─ "Allow all the time" → fgStatus='granted'
  │     └─ → Leads to background prompt
  │
  └─ IF fgStatus === 'granted':
     └─ Location.requestBackgroundPermissionsAsync()
        └─ Runtime permission dialog:
           ┌──────────────────────────────────────────┐
           │ Allow GEOTrack to access location at     │
           │ all times?                               │
           │ [Exact] [Approximate] [No]              │
           └──────────────────────────────────────────┘
           ├─ "Exact" → bgStatus='granted' (10m precision)
           ├─ "Approximate" → bgStatus='denied' (5km)
           └─ "No" → bgStatus='denied'
```

**Android State Machine**:
```
User Settings → Apps & notifications → App permissions
  ├─ Location (All apps)
  │  ├─ Permission not set
  │  │  └─ Both: ❌ Denied
  │  │
  │  ├─ Allow only while using the app
  │  │  └─ Foreground: ✅, Background: ❌ Denied
  │  │
  │  └─ Allow all the time
  │     ├─ Exact location: ✅ Granted (10m)
  │     │  └─ Geofencing: ✅ YES
  │     │
  │     └─ Approximate location: 🟡 Granted (5km)
  │        └─ Geofencing: 🟡 UNRELIABLE (too coarse)
```

### **Permission Dependency Matrix**

| Feature | iOS Requirement | Android Requirement | Fallback |
|---|---|---|---|
| **Geofencing (ENTER)** | NSLocationAlwaysAndWhenInUseUsageDescription + Always grant | ACCESS_BACKGROUND_LOCATION + "Allow all the time" | Manual check-in button |
| **Geofencing (EXIT)** | Same | Same | User notification to remind |
| **Auto Checkout Failsafe** | Background mode "location" in UIBackgroundModes | RECEIVE_BOOT_COMPLETED + WAKE_LOCK | Manual close |
| **Weekly Report Gen** | Background mode "fetch" | RECEIVE_BOOT_COMPLETED | Manual generation button |
| **GPS Warm-up** | Foreground permission sufficient | ACCESS_FINE_LOCATION | Lower precision |
| **Notifications** | UNUserNotificationCenter configured | NotificationCompat | System notification |

---

## V. MANEJO DE ERRORES Y FALLBACK

### **Error Handling Strategy**

```typescript
// LocationManager.ts: GEOFENCE_TASK Callback
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error en callback de Geocerca', error);
    return;  // ← SKIP PROCESSING, SWALLOW ERROR
  }
  
  try {
    // Main logic
  } catch (err) {
    log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error ejecutando lógica de Geocerca', err);
    // ← NO RETURN, TASK CONTINUES
  }
});

// BackgroundTasks.ts: FAILSAFE_SECTION
try {
  // Failsafe logic
} catch (failsafeError) {
  log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error en Failsafe', failsafeError);
  // ← CONTINUE TO REPORT SECTION
}

// BackgroundTasks.ts: APP_BACKGROUND_SERVICES
try {
  const db = await ensureDbReady();
  // ... failsafe + report
  return BackgroundTask.BackgroundTaskResult.Success;
} catch (criticalError) {
  log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error Crítico General', criticalError);
  return BackgroundTask.BackgroundTaskResult.Failed;  ← OS may retry
} finally {
  isTaskRunning = false;  ← ALWAYS CLEAR MUTEX
}
```

### **Error Categories & Recovery**

| Error Type | Location | Recovery | Impact |
|---|---|---|---|
| **Permission Denied** | requestForegroundPermissionsAsync() | Fallback: manual check-in button | 🟡 DEGRADED |
| **Permission Denied (Background)** | requestBackgroundPermissionsAsync() | Geofencing disabled; show fallback UI | 🟡 DEGRADED |
| **Geofence Start Failed** | Location.startGeofencingAsync() catch | Log error, continue; manual fallback | 🟡 DEGRADED |
| **DB Connection Failed** | ensureDbReady() in background task | Return BackgroundTask.Failed, OS retry | 🔴 SESSION STUCK |
| **GPS Hardware Error** | Location.getCurrentPositionAsync() | Swallow (.catch()), continue | 🟢 OK (warm-up optional) |
| **AsyncStorage Write Failed** | AsyncStorage.setItem(EXIT_TIMESTAMP_KEY) | Failsafe may not trigger; log error | 🔴 CRITICAL |
| **AsyncStorage Read Failed** | AsyncStorage.getItem() in failsafe | Exit timestamp = null, failsafe skipped | 🔴 CRITICAL |
| **Notification Scheduled Failed** | Notifications.scheduleNotificationAsync() | User unaware of status change; log | 🟡 UX IMPACT |
| **Mutex Locked (Concurrent Execution)** | isTaskRunning flag | Task skipped; OS will retry | 🟢 OK (prevents race) |
| **Background Task Restricted** | BackgroundTask.getStatusAsync() | Fallback to manual generation; log | 🟡 DEGRADED |

### **Fallback Mechanisms**

```
GEOFENCE ENTRY FAILED:
  └─ Manual Check-in Button in UI
     └─ dispatch(SESSION_ARRIVAL_CONFIRMED_MANUAL)
        └─ engine processes normally

GEOFENCE EXIT / FAILSAFE FAILED:
  └─ Manual Session Close Button in UI
     └─ dispatch(SESSION_CLOSED_MANUAL)
        └─ engine processes normally

BACKGROUND TASK MISSED:
  └─ User manually triggers (dev mode):
     BackgroundTasks.triggerForTesting()
     └─ Calls: BackgroundTask.triggerTaskWorkerForTestingAsync()

ASYNCSTORAGE LOSS:
  └─ Next failsafe cycle will not trigger (15min missed)
  └─ User manually closes or notifies admin
```

---

## VI. RIESGOS TÉCNICOS CRÍTICOS

### **🔴 RIESGOS BATERÍA (HIGH IMPACT)**

| ID | Riesgo | Ubicación | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|---|
| **BAT001** | **Geofencing siempre activo** | Location.startGeofencingAsync() | ALTA | ~10-15% battery/day | Recomendación: máx 1 geofence activo |
| **BAT002** | **GPS warm-up frecuente** | Location.getCurrentPositionAsync() (cada session) | MEDIA | ~3-5% battery | Cache position; skip if <1h old |
| **BAT003** | **Background task ~15min interval** | BackgroundTask.registerTaskAsync(minimumInterval:15) | ALTA | ~5-8% battery | Aumentar interval a 30-60 min |
| **BAT004** | **WAKE_LOCK siempre activo** | app.json android.permissions | MEDIA | 5-10% battery/day | Solo activar durante geofence monitoring |
| **BAT005** | **Background location sin sleep** | iOS UIBackgroundModes | ALTA | 15-20% battery/day | Use significantLocationChangeMonitoring como fallback |

### **🔴 RIESGOS PRECISIÓN (HIGH IMPACT)**

| ID | Riesgo | Ubicación | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|---|
| **PRC001** | **Geofence false positives** | Radius=200m en áreas urbanas | MEDIA | Auto check-in en ubicación cercana | Aumentar radius a 300-500m; require manual confirmation |
| **PRC002** | **Geofence flickering** | GPS señal débil (tunnels, indoor) | MEDIA | ENTER/EXIT alternado rápido | Hysteresis: require 2x confirmación antes de action |
| **PRC003** | **Approximate location (Android 12+)** | User selects "Approximate" | MEDIA | 5km precision insuficiente | Require "Exact" permission; fallback to manual |
| **PRC004** | **Indoor no signal** | City center, basement | MEDIA | Geofencing no funciona | Provide WiFi-based geofencing fallback (ssid pattern) |
| **PRC005** | **Stale GPS cache** | getCurrentPositionAsync() uses cached | BAJA | Outdated coordinates | Use { maximumAge: 0 } para fresh location |

### **🔴 RIESGOS PERMISOS (HIGH IMPACT)**

| ID | Riesgo | Ubicación | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|---|
| **PRM001** | **Permission revoked at runtime** | User manually changes in Settings | MEDIA | Geofencing suddenly stops | Periodic re-check of permissions; notify user |
| **PRM002** | **iOS "Always" → "While Using"** | User changes in Settings | MEDIA | Background geofencing stops | Detect; prompt user to fix in Settings |
| **PRM003** | **Android "Allow all the time" denied** | User selects "Only while using" | MEDIA | Geofencing disabled | Fallback to manual; show permission banner |
| **PRM004** | **Background task disabled by OS** | User disables in Battery Saver | MEDIA | Failsafe & reports never run | Graceful degradation; manual buttons available |
| **PRM005** | **Permission prompt fatigue** | Asking too many times | MEDIA | User clicks "Never" | Ask once; use rationale; fallback |

### **🔴 RIESGOS OS RESTRICTIONS (HIGH IMPACT)**

| ID | Riesgo | Ubicación | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|---|
| **OSR001** | **iOS: Geofencing max 20 regions** | startGeofencingAsync() | BAJA | Only 1 geofence/session OK | Implement queue; switch geofences on demand |
| **OSR002** | **iOS: Background task killed after ~3 min** | UIBackgroundModes + minimumInterval | MEDIA | Failsafe may not trigger in time | Increase background mode refresh; accept risk |
| **OSR003** | **Android 12+: Background location restricted** | ACCESS_BACKGROUND_LOCATION + Battery Saver | MEDIA | Geofencing paused silently | Detect Battery Saver; notify user |
| **OSR004** | **Android: Geofencing disabled on doze** | Device enters Doze mode (idle 10+ min) | MEDIA | No ENTER/EXIT events | Use DeviceIdleManager API; whitelist app |
| **OSR005** | **Expo limitation: No foreground service** | expo-location + background | MEDIA | Cannot keep high-accuracy GPS | Accept standard-accuracy GPS (~100m) |

### **🔴 RIESGOS CONSISTENCIA (CRITICAL)**

| ID | Riesgo | Ubicación | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|---|
| **CON001** | **State divergence: DB vs Engine** | LocationManager geofence handler | ALTA | DB updated, engine state stale | **REFACTOR**: Dispatch event to engine |
| **CON002** | **AsyncStorage ≠ State canonical** | EXIT_TIMESTAMP_KEY | ALTA | State mutation outside engine | **REFACTOR**: Move to state.runtime.geofence.lastExitTimestampMs |
| **CON003** | **Race: ENTER before CREATED** | Geofence fires before session fully created | BAJA | No session in DB to update | Validate session exists; add timeout |
| **CON004** | **Race: Concurrent geofence callbacks** | Multiple ENTER/EXIT in rapid succession | MEDIA | Duplicate DB updates | Add transaction lock; skip if status already changed |
| **CON005** | **Failsafe timer skipped** | Background task missed 15min window | BAJA | Session stuck in 'active' | Manual close button; audit trail |

### **🟡 RIESGOS PERFORMANCE (MEDIUM IMPACT)**

| ID | Riesgo | Ubicación | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|---|
| **PER001** | **DB query every geofence event** | SELECT FROM work_sessions ORDER BY... | MEDIA | Slow if 1000+ sessions | Index by (status, id); paginate |
| **PER002** | **AsyncStorage not optimized for speed** | setItem/getItem in geofence handler | BAJA | ~50-100ms latency | Cache value in memory for EXIT_TIMESTAMP |
| **PER003** | **Promise.all() blocks on slowest** | Promise.all([db, insertAudit, AsyncStorage, notify]) | MEDIA | If one slow, all block | Use Promise.allSettled() + skip failures |
| **PER004** | **Background task timeout** | iOS 30s, Android variable | MEDIA | Task killed mid-execution | Prioritize: failsafe > report; set timeouts |

---

## VII. TABLA DE ESTADO DE PERMISOS (EN TIEMPO REAL)

```typescript
// state.runtime.permissions (actualizado en boot)
{
  locationForeground: 'granted' | 'denied' | 'unknown',
  locationBackground: 'granted' | 'denied' | 'unknown',
  notifications: 'granted' | 'denied' | 'unknown'
}

// state.runtime.geofence (actualizado por effects)
{
  isMonitoring: boolean,
  taskName: string,
  lastExitTimestampMs: number | null,
  monitoredRegion: {
    identifier: string | null,
    latitude: number | null,
    longitude: number | null,
    radiusMeters: number | null
  }
}

// state.runtime.background.appTask
{
  isRegistered: boolean,
  isRunning: boolean,
  taskName: string
}

// state.domain.sessions[id].lifecycle
{
  domainStatus: 'pending_arrival' | 'travel' | 'active' | 'completed' | 'deleted',
  locationConfirmed: boolean,  ← ¿GPS o manual?
  isManualEdit: boolean
}
```

---

## VIII. DIAGRAMA DE CICLO DE VIDA COMPLETO

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SESSION LIFECYCLE STATE MACHINE                 │
└─────────────────────────────────────────────────────────────────────┘

        [USER CREATES SESSION]
               ↓
        ┌──────────────┐
        │PENDING_ARRIVAL│  ← Waiting for geofence ENTER
        │              │
        │ Timer start  │
        │ GPS monitoring│
        └──────┬───────┘
               │
        ┌──────▼──────────────────────────────────────┐
        │            GEOFENCE ENTER                   │
        │  (GPS detects user in 200m radius)         │
        │  [LocationManager.geofenceCallback fires]  │
        │  • DB: UPDATE status='active'               │
        │  • Notify user ✓                            │
        │  • Start EXIT_TIMESTAMP=null                │
        └──────┬──────────────────────────────────────┘
               │
        ┌──────▼────────┐
        │  ACTIVE       │  ← Session ongoing
        │               │
        │ Timer: +15min │
        │ GPS monitoring│
        │ Exit timer    │
        └──────┬────────┘
               │
        ┌──────▼──────────────────────────────────────┐
        │         GEOFENCE EXIT DETECTED              │
        │  [LocationManager.geofenceCallback fires]  │
        │  • AsyncStorage.setItem(EXIT_TIMESTAMP)    │
        │  • DB: INSERT audit_log                     │
        │  • Notify user ⚠️                           │
        │  • Start 15-min failsafe timer              │
        └──────┬──────────────────────────────────────┘
               │
        ┌──────▼────────────────────────┐
        │ SALIDA_DETECTADA (15MIN WAIT) │  ← Failsafe countdown
        │                                │
        │ Option 1: User re-enters area │
        │  ├─ GEOFENCE ENTER fires      │
        │  ├─ EXIT_TIMESTAMP cleared    │
        │  └─ → ACTIVE (continue)       │
        │                                │
        │ Option 2: Timer expires       │
        │  ├─ Background task checks    │
        │  ├─ timeDiff > 15min          │
        │  └─ → AUTO CHECKOUT (↓)       │
        │                                │
        │ Option 3: User manually closes│
        │  └─ → COMPLETED (↓)           │
        └──────┬───────────────┬────────┘
               │               │
        ┌──────▼──────────────▼─────┐
        │  COMPLETED                │  ← Session ended
        │  (from failsafe or manual)│
        │                            │
        │ • DB: UPDATE status='completed',
        │        end_time=now/exitTime
        │ • Geofencing STOPPED
        │ • EXIT_TIMESTAMP cleared
        │ • Weekly report check runs
        └────────────────────────────┘
```

---

## IX. DIAGRAMA DE TIMING: FAILSAFE GUARD

```
Timeline:
═══════════════════════════════════════════════════════════════════════════

User Jornada Start:     T0 = 08:00:00
                        └─ Session created, geofence active
                        └─ status = 'pending_arrival'

T0 + 30 min:            T0+30 = 08:30:00
                        └─ [GPS ENTER detected]
                        └─ status = 'active'
                        └─ actual_start_time = 08:30:00

T0 + 4 hours:           T0+4h = 12:30:00
                        └─ [GPS EXIT detected]
                        └─ AsyncStorage.EXIT_TIMESTAMP = 12:30:00
                        └─ Notification: "¿Terminaste tu jornada?"

T0 + 4h + 5 min:        12:35:00
                        └─ Background task executes
                        └─ Check: (12:35 - 12:30) = 5 min < 15 min
                        └─ SKIP auto-checkout
                        └─ Continue

                        [User goes to lunch]

T0 + 4h + 10 min:       12:40:00
                        └─ Background task executes
                        └─ Check: (12:40 - 12:30) = 10 min < 15 min
                        └─ SKIP auto-checkout
                        └─ Continue

                        [User returns to work]
                        [GPS ENTER detected again]

T0 + 4h + 13 min:       12:43:00
                        └─ [GPS ENTER fires]
                        └─ EXIT_TIMESTAMP cleared ✓
                        └─ status = 'active' (continues)

T0 + 4h + 18 min:       12:48:00
                        └─ Background task executes
                        └─ Check: EXIT_TIMESTAMP = null
                        └─ SKIP failsafe (already cleared)

                        [User actually leaves, no return]
                        [GPS EXIT detected again]

T0 + 8h + 30 min:       16:30:00
                        └─ [GPS EXIT detected]
                        └─ AsyncStorage.EXIT_TIMESTAMP = 16:30:00

T0 + 8h + 45 min:       16:45:00
                        └─ Background task executes
                        └─ Check: (16:45 - 16:30) = 15 min >= 15 min ✓
                        └─ [AUTO CHECKOUT TRIGGERED]
                        ├─ DB UPDATE: status='completed', 
                        │  end_time=16:30:00
                        ├─ Notification: "Jornada Finalizada 🏁"
                        ├─ Geofencing STOPPED
                        └─ EXIT_TIMESTAMP cleared
```

---

## X. TABLA RESUMEN: CRÍTICAS Y RECOMENDACIONES

| Aspecto | Evaluación | Estado | Recomendación Urgente |
|---|---|---|---|
| **Geofencing Logic** | ⭐⭐⭐⭐☆ | ✅ Funcional | Refactor: dispatch to engine en lugar de direct DB |
| **Failsafe Timer** | ⭐⭐⭐⭐☆ | ✅ Funcional | Mover EXIT_TIMESTAMP a state.runtime.geofence |
| **Permission Handling** | ⭐⭐⭐☆☆ | ⚠️ Incomplete | Agregar permission re-checks periódicos |
| **Background Tasks** | ⭐⭐⭐⭐☆ | ✅ Funcional | Detectar Battery Saver; notify user |
| **Battery Optimization** | ⭐⭐☆☆☆ | 🔴 POOR | Reducir background task interval; geofence smart |
| **Precision/Accuracy** | ⭐⭐⭐☆☆ | ⚠️ Limited | Aumentar geofence radius; hysteresis logic |
| **Error Recovery** | ⭐⭐⭐☆☆ | ⚠️ Partial | Agregar dead-letter queue; manual fallbacks |
| **State Consistency** | ⭐⭐☆☆☆ | 🔴 CRITICAL | Refactor: TODO unificado en engine |

---

## XI. CONCLUSIÓN EJECUTIVA

### **Fortalezas ✅**
- Geofencing implementación sólida con expo-location
- Failsafe timer inteligente (15 min buffer)
- Mutex protection contra ejecución concurrente
- Logging completo + audit trail
- Weekly report generation automático

### **Debilidades 🔴**
- **CRÍTICO**: Geofencing y failsafe escapen del engine → divergencia de estado
- **CRÍTICO**: AsyncStorage (volátil) en lugar de estado canonical
- **ALTO**: Battery drain por geofencing siempre activo + background tasks
- **ALTO**: Sin detection de permission revocation en runtime
- **ALTO**: Sin handling de OS restrictions (doze, battery saver)

### **Roadmap de Fixes**
1. **P0 (Immediatamente)**: Refactor LocationManager handlers → dispatch events
2. **P0**: Mover EXIT_TIMESTAMP → state.runtime.geofence
3. **P1**: Agregar periodic permission checks + user notification
4. **P1**: Detect + handle Battery Saver, Doze mode
5. **P2**: Geofence hysteresis; aumentar radius; smart caching

**Status**: 🟡 **USABLE** pero con riesgos de inconsistencia. Producción requiere P0 fixes.
