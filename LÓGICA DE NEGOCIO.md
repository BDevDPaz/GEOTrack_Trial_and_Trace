---

# 📊 INVENTARIO TÉCNICO COMPLETO: LÓGICA DE NEGOCIO
## GEOTrack_Trial_and_Trace | Payroll + Date + Geo Calculations

---

## I. LISTA DE FUNCIONES CLAVE

### **payrollUtils.ts**

| Función | Líneas | Input | Output | Responsabilidad |
|---|---|---|---|---|
| **calculateSessionDuration** | 8-33 | `startTime, endTime, lunchTaken, lunchStart?, lunchEnd?` | `number (ms)` | Calcula duración neta de jornada (resta almuerzo) |
| **calculatePay** | 41-64 | `totalHours, hourlyRate, overtimeMultiplier?` | `{ totalPay, regularHours, overtimeHours }` | Calcula salario con overtime (California rule: >8h) |

### **dateUtils.ts**

| Función | Líneas | Input | Output | Responsabilidad |
|---|---|---|---|---|
| **formatTime** | 7-12 | `timestamp (ms) \| null` | `string` | Formatea timestamp a HH:MM AM/PM |
| **formatDate** | 17-21 | `timestamp (ms) \| null` | `string` | Formatea timestamp a "ddd, D MMM YYYY" |
| **formatDuration** | 27-35 | `ms (number)` | `string` | Convierte ms a "Xh Ym" |

### **geoUtils.ts**

| Función | Líneas | Input | Output | Responsabilidad |
|---|---|---|---|---|
| **getDistanceFromLatLonInMeters** | 7-26 | `lat1, lon1, lat2, lon2 (degrees)` | `number (meters)` | Calcula distancia Haversine entre 2 puntos |
| **deg2rad** | 28-30 | `deg (number)` | `number (radians)` | Convierte grados a radianes |

### **ReportGenerator.ts**

| Función | Líneas | Input | Output | Responsabilidad |
|---|---|---|---|---|
| **generateWeeklyReport** | 20-287 | `shouldShare?, customRange?` | `string (PDF URI) \| null` | Genera PDF semanal con todas las sesiones y cálculos |
| **sendReportByEmail** | 289-302 | `pdfUri, settings` | `void` | Envía PDF por email (iOS Mail) |
| **formatCurrency** | 16-18 | `amount (number)` | `string` | Formatea número a "$X.XX" |

---

## II. FLUJO DE CÁLCULO COMPLETO

### **PASO 1: Duración de Sesión**

```
SESSION DATA FROM DB:
├─ start_time:        1717897200000  (declared, Unix ms)
├─ actual_start_time:  1717897230000  (actual GPS entry)
├─ end_time:          1717920600000  (GPS exit + 15min)
├─ lunch_taken:       1               (boolean as 0|1)
├─ lunch_start:       1717908000000  (almuerzo inicio)
└─ lunch_end:         1717911600000  (almuerzo fin: 1 hora)

                ↓ calculateSessionDuration()

PSEUDOCÓDIGO:
  start = dayjs(actual_start_time)  = 08:30 AM
  end = dayjs(end_time)             = 16:30 PM (8 horas)
  
  durationMs = end.diff(start, 'ms')
             = 8 * 3600 * 1000
             = 28,800,000 ms
  
  IF lunch_taken = 1:
    lStart = dayjs(lunch_start)      = 12:00 PM
    lEnd = dayjs(lunch_end)          = 13:00 PM
    
    lunchDurationMs = lEnd.diff(lStart, 'ms')
                    = 1 * 3600 * 1000
                    = 3,600,000 ms
    
    durationMs -= lunchDurationMs
               = 28,800,000 - 3,600,000
               = 25,200,000 ms
  
  RETURN Math.max(0, 25,200,000)
       ↓
     25,200,000 ms = 7 horas netas
```

**Mapeo de tiempo**:
```
Timeline:
08:30 ────────────────── 16:30  [8 horas totales]
08:30 ──────────── 12:00 [3.5 horas trabajo]
                   [ALMUERZO 1h]
13:00 ────────── 16:30   [3.5 horas trabajo]
                          ───────────────────
                          TOTAL: 7 horas netas
```

---

### **PASO 2: Cálculo de Pago (Overtime California Rule)**

```
INPUT:
  totalHours:          7 (from calculateSessionDuration)
  hourlyRate:          $25.00
  overtimeMultiplier:  1.5 (default)

                ↓ calculatePay()

PSEUDOCÓDIGO:
  totalMinutes = Math.round(7 * 60) = 420 min
  
  IF totalMinutes > 480 min (8 hours):
    regularMinutes = 480
    overtimeMinutes = totalMinutes - 480
  ELSE:
    regularMinutes = 420
    overtimeMinutes = 0
  
  // En este caso, NO hay overtime (7h < 8h)
  regularMinutes = 420
  overtimeMinutes = 0
  
  regularPay = (420 / 60) * $25.00
             = 7 * $25.00
             = $175.00
  
  overtimePay = (0 / 60) * $25.00 * 1.5
              = $0.00
  
  RETURN {
    totalPay: $175.00,
    regularHours: 7,
    overtimeHours: 0
  }
```

**Casos de uso**:
```
CASO 1: 7 horas (sin overtime)
├─ regularMinutes = 420
├─ overtimeMinutes = 0
└─ Pay = 7 × $25 = $175.00

CASO 2: 8 horas (sin overtime)
├─ regularMinutes = 480
├─ overtimeMinutes = 0
└─ Pay = 8 × $25 = $200.00

CASO 3: 9 horas (1 hour overtime)
├─ regularMinutes = 480  (8h)
├─ overtimeMinutes = 60  (1h)
└─ Pay = (8 × $25) + (1 × $25 × 1.5)
       = $200 + $37.50
       = $237.50

CASO 4: 10.5 horas (2.5 hours overtime)
├─ regularMinutes = 480  (8h)
├─ overtimeMinutes = 150 (2.5h)
└─ Pay = (8 × $25) + (2.5 × $25 × 1.5)
       = $200 + $93.75
       = $293.75
```

---

### **PASO 3: Generación de Reporte Semanal**

```
INPUT: customRange = { start: 1717675200000, end: 1717934400000 }
       (Lunes 2:00 AM - Domingo 11:59 PM)

                ↓ generateWeeklyReport()

PASO 3.1: Cargar Settings
  ├─ DB.getSettings()
  └─ Result: {
       employee_name: "Juan Pérez",
       hourly_rate: 25.00,
       overtime_multiplier: 1.5,
       company_email: "empresa@example.com"
     }

PASO 3.2: Cargar Sesiones en Rango
  ├─ SELECT * FROM work_sessions
  │  WHERE start_time >= 1717675200000 AND start_time <= 1717934400000
  │  ORDER BY start_time ASC
  │
  └─ Result: [
       {
         id: 42,
         start_time: 1717897200000,
         actual_start_time: 1717897230000,
         end_time: 1717920600000,
         status: 'completed',
         lunch_taken: 1,
         lunch_start: 1717908000000,
         lunch_end: 1717911600000,
         ...
       },
       { ... más sesiones ... }
     ]

PASO 3.3: Cargar Logs de Auditoría
  ├─ SELECT * FROM audit_logs
  │  WHERE timestamp >= 1717675200000 AND timestamp <= 1717934400000
  │  ORDER BY timestamp DESC
  │
  └─ Result: [
       { id: 1, session_id: 42, action_type: 'AUTO_CHECKIN_GPS', ... },
       { id: 2, session_id: 42, action_type: 'SESSION_LUNCH_RECORDED', ... },
       { id: 3, session_id: 42, action_type: 'AUTO_CHECKOUT_GPS', ... }
     ]

PASO 3.4: Procesar cada Sesión
  FOR each session:
    ├─ startTime = session.actual_start_time OR session.start_time
    ├─ endTime = session.end_time OR dayjs().valueOf()
    │
    ├─ durationMs = calculateSessionDuration(
    │   startTime, endTime, session.lunch_taken,
    │   session.lunch_start, session.lunch_end
    │ )
    │
    ├─ hours = durationMs / (1000 * 60 * 60)
    │
    ├─ pay = calculatePay(
    │   hours, hourlyRate, overtimeMultiplier
    │ )
    │
    ├─ totalHours += hours
    ├─ totalOvertime += pay.overtimeHours
    ├─ totalEarnings += pay.totalPay
    │
    ├─ fueAutoCheckout = logs.some(
    │   l.session_id === session.id &&
    │   l.action_type.includes('AUTO_CHECKOUT')
    │ )
    │
    └─ Agregar fila a reporte:
       {
         date: formatDate(startTime),     // "lun, 10 jun 2024"
         client: session.client_name,      // "ACME Corp"
         address: session.address,         // "123 Main St"
         start: formatTime(startTime),    // "08:30 AM"
         end: formatTime(endTime),        // "16:30 PM"
         lunch: session.lunch_taken ? 'Sí' : 'No',
         total: hours.toFixed(2),         // "7.00"
         pay: formatCurrency(pay),        // "$175.00"
         status: session.status,
         isGeofenceIn: !!session.actual_start_time,
         isGeofenceOut: fueAutoCheckout
       }

PASO 3.5: Generar HTML + CSS + Tablas
  ├─ Header: "LED TRACKER - Reporte Oficial de Nómina"
  ├─ Info grid: Empleado, Empresa, Rango
  ├─ Stats box: Total Horas, OT, Pago Estimado
  ├─ Table: Filas con datos de cada sesión
  ├─ Audit section: Log de eventos críticos
  └─ Footer: Timestamp de generación

PASO 3.6: Generar PDF
  ├─ Print.printToFileAsync({ html, base64: false })
  └─ Result: uri = "file:///cache/pdf_12345.pdf"

PASO 3.7: Compartir (opcional)
  ├─ IF shouldShare:
  │   └─ Sharing.shareAsync(uri, { mimeType: 'application/pdf' })
  │
  └─ RETURN uri
```

---

## III. TABLA DE RESPONSABILIDADES POR UTILIDAD

| Utilidad | Responsabilidad | Input Type | Output Type | Supuestos | Riesgos |
|---|---|---|---|---|---|
| **calculateSessionDuration** | Resta almuerzo de duración total | `number, number, number, number?, number?` | `number (ms)` | Lunch siempre <= session duration | Lunch_end < lunch_start → negativo |
| **calculatePay** | Aplica California OT rule (>8h) | `number, number, number?` | `object { totalPay, regularHours, overtimeHours }` | OT multiplier >= 1.0 | Redondeo de minutos puede acumular error |
| **formatTime** | Convierte ms a formato local HH:MM | `number \| null` | `string` | Usa dayjs con timezone LA | Timezone cruzado da UTC leak |
| **formatDate** | Convierte ms a formato local legible | `number \| null` | `string` | Usa dayjs con timezone LA | DST transition inconsistencia |
| **formatDuration** | Convierte ms a "Xh Ym" | `number` | `string` | Ms >= 0 | Duración negativa → "0h 0m" |
| **getDistanceFromLatLonInMeters** | Haversine distance en metros | `number, number, number, number` | `number (m)` | Tierra esférica R=6371km | Coordenadas inválidas → 0 |
| **generateWeeklyReport** | Agrupa sesiones + cálculos + HTML + PDF | `boolean?, { start, end }?` | `string (PDF URI) \| null` | Settings existen en DB | Sesiones sin end_time → usa now() |

---

## IV. SUPUESTOS DE NEGOCIO

### **A. Supuestos Sobre Jornadas**

| Supuesto | Implementación | Riesgo |
|---|---|---|
| **8 horas = jornada normal** | `if (totalMinutes > 8*60)` → overtime | Algunos estados requieren 10h |
| **Overtime = 1.5x rate** | `hourlyRate * overtimeMultiplier` | Configurable, pero sin validación |
| **Almuerzo siempre >= 0** | `Math.max(0, durationMs)` | Si lunch > session → cero |
| **Una sesión = un día** | Reports agrupan por `start_time` | Sesiones nocturnas (cruzando días) |
| **Almuerzo automático = 60 min** | `dayjs.duration(1, 'hour').asMilliseconds()` | Si solo `lunch_taken=1` sin times |
| **Sin almuerzo = sesión completa** | No resta si `lunchTaken=0` | Empleado puede tomar descanso no registrado |

### **B. Supuestos Sobre Geolocalización**

| Supuesto | Implementación | Riesgo |
|---|---|---|
| **GPS preciso = entrada confirmada** | `location_confirmed=1 si AUTO_CHECKIN_GPS` | GPS puede falla en indoor (tuneles) |
| **200m radio = suficiente** | `tolerance_radius: 200` en settings | Urbano: false positives; rural: false negatives |
| **Distancia Haversine = suficiente** | `getDistanceFromLatLonInMeters()` | Ignora altura (piso del edificio) |
| **Latiud/Longitud válidos** | `if (!lat1 \|\| !lon1...) return 0` | Cero silenciosamente |
| **Tierra esférica R=6371km** | `const R = 6371e3` | Achatamiento terrestre ignorado (~0.3% error) |

### **C. Supuestos Sobre Tiempo**

| Supuesto | Implementación | Riesgo |
|---|---|---|
| **Dayjs con timezone LA** | `dayjsSetup.ts: .tz('America/Los_Angeles')` | DST transitions (spring/fall) |
| **Unix ms = timestamp universal** | Todos usan `Date.now().valueOf()` | Precisión solo a ms (suficiente) |
| **Semana ISO = Lunes-Domingo** | `dayjs().startOf('week')` | Locale dependency (some use Sunday) |
| **Sin cambios de zona horaria** | Reports assume usuario siempre en LA | Viajes transnacionales → error |
| **Formato 12h con AM/PM** | `format('hh:mm A')` | Algunos usuarios prefieren 24h |

### **D. Supuestos Sobre Dinero**

| Supuesto | Implementación | Riesgo |
|---|---|---|
| **Redondeo a minutos** | `Math.round(totalHours * 60)` | 0.5 minutos descartados → $0.01 error |
| **Dos decimales = suficiente** | `.toFixed(2)` | Acumulación de error en reportes mensuales |
| **Sin impuestos ni deducciones** | `Pay = regularPay + overtimePay` | Gross pay, no net |
| **Sin FMLA, SSO, holidays** | Sólo cuenta horas trabajadas | Legal liability |
| **Sin limit de OT** | Puede acumular infinito | Si usuario trabaja 24h → correcto pero irreal |

---

## V. CASOS EDGE DETECTADOS

### **🔴 CRÍTICOS (Pueden causar error)**

| ID | Edge Case | Scenario | Current Behavior | Expected | Risk |
|---|---|---|---|---|---|
| **E001** | **Lunch end < lunch start** | User enters lunch_end=09:00, lunch_start=10:00 | `durationMs -= negative` → negative total | Validar lunch_end > lunch_start | Negative pay |
| **E002** | **Session end < session start** | DB corruption or manual manipulation | `end.diff(start) = negative ms` | Validar end > start | Negative hours |
| **E003** | **Invalid latitude/longitude** | Geofence at North Pole (90°) | Haversine still works but unreliable | Clamp to [-90,90] | Wrong distance |
| **E004** | **Null/undefined in calculateSessionDuration** | start=null, end=null | `dayjs(null) = Invalid date` | Type guard at entry | NaN hours |
| **E005** | **Hourly rate = 0** | Settings not configured | `0 * hours = 0` | Warn user or default | $0.00 always |
| **E006** | **Overtime multiplier < 1.0** | Settings corrupted | `pay = regularPay + (negative OT)` | Validate > 1.0 | Lower than expected |
| **E007** | **DST transition missing hour** | 2:00 AM spring forward → 3:00 AM | `dayjs.diff()` should handle, but risky | Use UTC internally, convert at display | Off by 1h |
| **E008** | **Session spanning midnight** | start=23:00, end=01:00 next day | `date_string = start_time's day` | Should span both days | Wrong day in report |

### **🟡 MODERADOS (Calculan mal pero no rompen)**

| ID | Edge Case | Scenario | Current Behavior | Expected | Impact |
|---|---|---|---|---|---|
| **E009** | **Lunch duration = session duration** | Entire session is lunch | `durationMs = 0` | Sessión sin trabajo | Pay = $0.00 |
| **E010** | **Très pequeño rounding error** | 7h 30m 31s truncado a 7.50833h | Redondeo a minutos pierde 31s | Acumula en reporte | $0.01-0.05 error/sesión |
| **E011** | **Timezone cross (user crosses LA boundary)** | Empleado viaja a NY durante sesión | `dayjs()` assume LA siempre | Debería ajustar por zona real | Start time en zona anterior |
| **E012** | **Active session with no end_time** | Sesión still ongoing | `endTime = dayjs().valueOf()` | Usa now() (correcto) | Pay incluye tiempo pasado |
| **E013** | **Settings ID != 1** | DB corruption | `getSettings() WHERE id=1` retorna null | Should be singleton | Report falso |
| **E014** | **Overflow en large reports** | 10+ years of data | `totalHours, totalEarnings += ` sin límite | Should cap or warn | Number precision loss |

### **🟢 MENORES (UX issue)**

| ID | Edge Case | Scenario | Current Behavior | Expected | Impact |
|---|---|---|---|---|---|
| **E015** | **Negative hours (manual edit error)** | User manually edits start > end | `calculateSessionDuration() → max(0, negative)` | Should prevent edit | Shows 0h |
| **E016** | **Almuerzo sin hora exacta** | `lunch_taken=1` pero `lunch_start=null` | Asume 1 hora | Usuario no sabe si realmente 1h | UX confusión |
| **E017** | **Geofence distance = 0 (invalid coords)** | lat1=null, lon2=null | `getDistanceFromLatLonInMeters() → 0` | Should return error | Silent fail |
| **E018** | **Very large overtime** | 24+ hour session | Cálculo correcto pero irreal | Debería cap o avisar | Distrust en sistema |
| **E019** | **Formato fecha incorrecto locale** | Español locale pero "ddd, D MMM YYYY" | Muestra "lun, 10 jun 2024" correcto | Esperado español | OK (es español) |

---

## VI. DEPENDENCIAS ENTRE UTILIDADES

```
                    ┌─────────────────────┐
                    │  ReportGenerator.ts │
                    └──────────┬──────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
           ┌─────────────────┐ ┌──────────────────┐
           │ payrollUtils.ts │ │ dateUtils.ts     │
           └────────┬────────┘ └────────┬─────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  dayjsSetup.ts    │
                    │ (dayjs + timezone)│
                    └───────────────────┘

Dependencias Directas:
══════════════════════════════════════════════════════════════════════════════

ReportGenerator.ts
  ├─ calculateSessionDuration()       [payrollUtils]
  ├─ calculatePay()                   [payrollUtils]
  ├─ formatDate()                     [dateUtils]
  ├─ formatTime()                     [dateUtils]
  ├─ formatCurrency() (local)         [inline]
  ├─ dayjs                            [dayjsSetup]
  ├─ getSettings()                    [db.ts]
  ├─ getAllAsync()                    [db.ts]
  └─ escapeHtml()                     [escape-html lib]

calculateSessionDuration()
  ├─ dayjs                            [dayjsSetup]
  └─ Math                             [native]

calculatePay()
  └─ Math                             [native]

formatTime()
  └─ dayjs                            [dayjsSetup]

formatDate()
  └─ dayjs                            [dayjsSetup]

formatDuration()
  ├─ dayjs.duration()                 [dayjsSetup]
  └─ Math.floor()                     [native]

geoUtils.ts (INDEPENDIENTE)
  ├─ deg2rad()                        [inline]
  └─ Math.sin, Math.cos, Math.atan2   [native]

dayjsSetup.ts (ROOT)
  ├─ dayjs                            [dayjs lib]
  ├─ utc plugin                       [dayjs-utc]
  └─ timezone plugin                  [dayjs-timezone]
```

---

## VII. FLUJOS DE CÁLCULO COMPLEJOS

### **Flujo A: Semana con múltiples días**

```
SCENARIO: Usuario trabaja Lu-Vi en empresa

DATOS:
─────────────────────────────────────────────────────────────
LUNES (2024-06-10):
  Session 42: 08:30-12:00 (3.5h), 13:00-17:00 (4h) = 7.5h
             Lunch 1h → 6.5h
             Pay: 6.5 × $25 = $162.50

MARTES (2024-06-11):
  Session 43: 08:00-12:30 (4.5h), 13:30-18:00 (4.5h) = 9h
             Lunch 1h → 8h
             Pay: 8 × $25 + 0 × 1.5 = $200.00

MIÉRCOLES (2024-06-12):
  Session 44: 09:00-17:30 (8.5h)
             Lunch 1h → 7.5h
             Pay: 7.5 × $25 = $187.50

JUEVES (2024-06-13):
  Session 45: 07:00-18:00 (11h)
             Lunch 1h → 10h
             Pay: 8 × $25 + 2 × $25 × 1.5
                = $200 + $75
                = $275.00

VIERNES (2024-06-14):
  Session 46: 08:30-17:00 (8.5h)
             Lunch 1h → 7.5h
             Pay: 7.5 × $25 = $187.50

CÁLCULO DEL REPORTE:
─────────────────────────────────────────────────────────────
totalHours = 6.5 + 8 + 7.5 + 10 + 7.5
           = 39.5 horas

totalOvertime = 0 + 0 + 0 + 2 + 0
              = 2 horas

totalEarnings = $162.50 + $200.00 + $187.50 + $275.00 + $187.50
              = $1,012.50

REPORT OUTPUT:
─────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────┐
│ LED TRACKER - Reporte Oficial de Nómina                │
│ Empleado: Juan Pérez                                   │
│ Periodo: 10 jun 2024 - 14 jun 2024                    │
├─────────────────────────────────────────────────────────┤
│ Horas Totales: 39.50                                   │
│ Horas Extra (OT): 2.00                                 │
│ Pago Estimado: $1,012.50                               │
├─────────────────────────────────────────────────────────┤
│ Date  │ Activity    │ Time       │ Hrs  │ Pay          │
├───────┼─────────────┼────────────┼──────┼──────────────┤
│ Mon   │ ACME Corp   │ 08:30-17:00│ 6.50 │ $162.50      │
│ Tue   │ ACME Corp   │ 08:00-18:00│ 8.00 │ $200.00      │
│ Wed   │ ACME Corp   │ 09:00-17:30│ 7.50 │ $187.50      │
│ Thu   │ ACME Corp   │ 07:00-18:00│10.00 │ $275.00 [OT] │
│ Fri   │ ACME Corp   │ 08:30-17:00│ 7.50 │ $187.50      │
└───────┴─────────────┴────────────┴──────┴──────────────┘
```

---

## VIII. RIESGOS DE CÁLCULO (TABLA COMPLETA)

### **🔴 RIESGOS CRÍTICOS**

| ID | Riesgo | Root Cause | Probability | Impact | Mitigation |
|---|---|---|---|---|---|
| **CAL001** | **Negative duration** | `lunch_end < lunch_start` | BAJA | Negative pay in report | Validate: `lunch_end >= lunch_start` |
| **CAL002** | **End time < start time** | Manual edit or DB corruption | BAJA | NaN or negative | Validate: `end > start` on insert/update |
| **CAL003** | **NaN from invalid dayjs** | Input null/undefined to calculateSessionDuration | BAJA | All downstream = NaN | Type guard at function entry |
| **CAL004** | **Zero rate salary** | Settings not configured | MEDIA | Always $0.00 | Require non-zero hourly_rate |
| **CAL005** | **OT multiplier < 1.0** | Corrupted settings | BAJA | Lower pay than expected | Validate: `overtimeMultiplier >= 1.0` |
| **CAL006** | **Rounding accumulation** | `Math.round(totalHours * 60)` | MEDIA | Micro-discrepancies ($0.01-0.10/report) | Use BigDecimal or fixed-point math |
| **CAL007** | **DST spring forward loss** | Dayjs not explicitly handling DST | BAJA | Off by 1 hour twice/year | Test during DST transitions |
| **CAL008** | **Spanning midnight** | Session crosses 00:00 | MEDIA | Wrong `date_string`, wrong day in report | Track both `session_date_start` and `session_date_end` |

### **🟡 RIESGOS MODERADOS**

| ID | Riesgo | Root Cause | Probability | Impact | Mitigation |
|---|---|---|---|---|---|
| **CAL009** | **Timezone leakage** | `.tz()` call not forced in dateUtils | MEDIA | Times show UTC instead of LA | Ensure `dayjsSetup.ts` is enforced globally |
| **CAL010** | **Lunch = entire session** | `lunch_duration >= session_duration` | BAJA | `durationMs = 0` → $0.00 | Warn if lunch > 80% of session |
| **CAL011** | **Active session uses now()** | `endTime = dayjs().valueOf()` for ongoing | BAJA | Changing pay as time passes | Use end_time only if present |
| **CAL012** | **Haversine precision loss** | Spherical Earth ignores flattening | BAJA | ~0.3% distance error | Acceptable for 200m geofence |
| **CAL013** | **Null coords in Haversine** | `if (!lat1 \|\| !lon1) return 0` | MEDIA | Silent zero distance | Return error or null instead |
| **CAL014** | **Very large session duration** | 24+ hour session or week span | BAJA | Numbers get very large | Cap at reasonable max (16h/day?) |
| **CAL015** | **Formatted time locale mismatch** | User UI in different locale than LA | BAJA | 24h format expected, get 12h | Respect user locale from settings |

### **🟢 RIESGOS MENORES**

| ID | Riesgo | Root Cause | Probability | Impact | Mitigation |
|---|---|---|---|---|---|
| **CAL016** | **31 seconds rounding loss** | `Math.round(hours * 60)` drops fractional seconds | ALTA | 0.5-1 minute per session | Use `Math.floor()` or track seconds |
| **CAL017** | **Lunch without exact times** | `lunch_taken=1` but no start/end | MEDIA | Assumes 1h; may be wrong | Require lunch_start and lunch_end |
| **CAL018** | **Empty report (no sessions)** | User never clocked in | BAJA | Report generated but empty | Show "No sessions in range" |
| **CAL019** | **Decimal precision in PDF** | `.toFixed(2)` rounds mid-calculation | BAJA | Cents misalignment | Use fixed-point math throughout |
| **CAL020** | **HTML escaping incomplete** | `escapeHtml()` on some fields but not all | BAJA | XSS if client name is malicious | Escape all user input consistently |

---

## IX. TABLA RESUMEN: VALIDACIONES PRESENTES vs. FALTANTES

### **Validaciones Implementadas ✅**

- [x] `Math.max(0, durationMs)` → no negative duration
- [x] `if (!timestamp)` → null-safe in formatTime/formatDate
- [x] `if (!lat1 || !lon1...) return 0` → null-safe Haversine
- [x] `normalizeDomainStatus()` → default fallback for invalid status
- [x] `lunch_taken || 0` → default to 0
- [x] `lunchStart && lunchEnd` → only subtract if both present
- [x] `Math.round(totalHours * 60)` → integer minutes

### **Validaciones Faltantes ❌**

- [ ] `start_time < end_time` (check constraint)
- [ ] `lunch_start < lunch_end` (check constraint)
- [ ] `hourly_rate > 0` (check constraint)
- [ ] `overtime_multiplier >= 1.0` (validation)
- [ ] `tolerance_radius > 0` (validation)
- [ ] `lunch_duration <= session_duration` (warning)
- [ ] Dayjs invalid date detection
- [ ] DST transition testing
- [ ] Midnight-spanning session handling
- [ ] HTML escaping for all fields
- [ ] BigDecimal or fixed-point math for currency
- [ ] Timezone cross-border detection

---

## X. CONCLUSIÓN EJECUTIVA

### **Fortalezas ✅**

- ✅ California OT rule correctly implemented
- ✅ Lunch deduction flexible (exact times or default 1h)
- ✅ Haversine distance accurate for geofencing
- ✅ Dayjs handles timezone consistently
- ✅ PDF generation complete with audit trail
- ✅ Clean separation of concerns (payroll/date/geo utils)

### **Debilidades 🔴**

- 🔴 **CRÍTICO**: No validation on session end > start
- 🔴 **CRÍTICO**: No validation on lunch end > lunch start
- 🔴 **ALTO**: Null-safe but no type guards at entry
- 🟡 **MEDIO**: Rounding loss (31s per session)
- 🟡 **MEDIO**: DST transition not tested
- 🟡 **MEDIO**: Spanning midnight not handled
- 🟡 **MEDIO**: HTML escaping incomplete

### **Roadmap P0 (Immediatamente)**

1. **Add validation for session time ranges**
   ```typescript
   export const validateSessionTimes = (start: number, end: number) => {
     if (start >= end) throw new Error('End time must be after start time');
   };
   ```

2. **Add validation for lunch times**
   ```typescript
   export const validateLunchTimes = (start?: number, end?: number) => {
     if (start && end && start >= end) 
       throw new Error('Lunch end must be after lunch start');
   };
   ```

3. **Test DST transitions**
   ```typescript
   // Spring forward: Mar 10, 2024 @ 2:00 AM
   // Fall back: Nov 3, 2024 @ 2:00 AM
   ```

4. **Handle midnight-spanning sessions**
   ```typescript
   // If start_date != end_date, split report rows
   ```

### **Status**: 🟡 **FUNCTIONAL** pero con edge cases sin validar. P0 fixes recomendados.

---

## XI. EJEMPLO COMPLETO: DE SESSION A PDF

```
USUARIO CREA SESIÓN:
  Lunes 10 jun 2024, 08:30 AM
  Destino: 123 Main St, ACME Corp
  Lat/Lng: 40.7128, -74.0060

USUARIO ENTRA A GEOFENCE:
  GPS distance check:
    getDistanceFromLatLonInMeters(
      40.7130, -74.0061,  [actual location]
      40.7128, -74.0060   [target]
    ) = ~28 metros ✓ (< 200m)
  
  Auto check-in: 08:32 AM

USUARIO TOMA ALMUERZO:
  12:00 PM - 13:00 PM

USUARIO SALE GEOFENCE:
  17:00 PM (5 hours later, triggers 15-min failsafe)

FAILSAFE EJECUTA:
  EXIT_TIMESTAMP_KEY = 17:00
  Wait 15 min...
  17:15 PM → Auto checkout

SESIÓN FINALIZADA EN DB:
  id: 42
  start_time: 1717959000000 (declared 08:30)
  actual_start_time: 1717959120000 (actual 08:32)
  end_time: 1717981200000 (17:20)
  lunch_taken: 1
  lunch_start: 1717970400000 (12:00)
  lunch_end: 1717974000000 (13:00)

GENERACIÓN DE REPORTE:
  calculateSessionDuration(
    1717959120000,    [08:32]
    1717981200000,    [17:20]
    1,                [lunch_taken]
    1717970400000,    [lunch_start]
    1717974000000     [lunch_end]
  )
  
  Cálculo:
    start = 08:32
    end = 17:20
    totalMs = 8h 48m = 31680000ms
    lunchMs = 1h = 3600000ms
    netMs = 31680000 - 3600000 = 28080000ms
    netHours = 28080000 / 3600000 = 7.8 horas
  
  calculatePay(7.8, 25.00, 1.5)
    totalMinutes = 468
    regularMinutes = 468 (< 480)
    overtimeMinutes = 0
    
    regularPay = 468/60 * 25 = 195.00
    overtimePay = 0
    totalPay = 195.00
  
  PDF ROW:
    Date: lun, 10 jun 2024
    Client: ACME Corp
    Start: 08:32 AM
    End: 17:20 PM
    Lunch: Sí (-1h)
    Hours: 7.80
    Pay: $195.00
    Status: completed
    Auto Checkin: ✓ (GPS)
    Auto Checkout: ⚠ (GPS)

REPORTE SEMANAL (5 DAYS):
  LUNES: 7.80h → $195.00
  MARTES: 8.00h → $200.00
  MIÉRCOLES: 9.50h → 8×$25 + 1.5×$25×1.5 = $256.25
  JUEVES: 10.00h → 8×$25 + 2×$25×1.5 = $275.00
  VIERNES: 7.50h → $187.50
  ──────────────────────────────
  TOTALES: 42.8h, 3.5h OT, $1,113.75

PDF GENERADO:
  Timestamp: 2024-06-14 18:45:00 (PST)
  File: /cache/report_2024_w24.pdf
  
COMPARTIR/EMAIL:
  Sharing.shareAsync(uri) → Usuario elige app
  O
  MailComposer.composeAsync() → Pre-filled email con PDF
```
