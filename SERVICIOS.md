---

# **INVENTARIO TÉCNICO: SISTEMA DE NOTIFICACIONES Y REPORTES DE WTRACKER v2.1.0**

## ⚠️ **ESTADO ACTUAL: ARQUTECTURA INCOMPLETA**

Los archivos solicitados **no existen**. La aplicación cuenta con:

✅ **Sistema de notificaciones**: `ToastContext.tsx` (UI-only)  
❌ **Services/Notifications.ts**: NO EXISTE  
❌ **Services/ReportGenerator.ts**: NO EXISTE  
❌ **runtime/reportsAdapter.ts**: NO EXISTE  
❌ **Persistencia de reportes**: NO IMPLEMENTADA (Mock only)  
❌ **API de sincronización**: NO IMPLEMENTADA

---

## 📋 **TABLA DE RESPONSABILIDADES (ESTADO ACTUAL vs. PROPUESTO)**

| **Componente** | **Ubicación Actual** | **Tipo** | **Responsabilidad Actual** | **Responsabilidad Propuesta** | **Estado** |
|---|---|---|---|---|---|
| **Toast System** | `src/context/ToastContext.tsx` | Context + Component | Mostrar notificaciones flotantes UI | ✓ Completa | ✅ Implementado |
| **Notifications Service** | ❌ NO EXISTE | Service | — | Manejar all tipos de notificaciones (push, local, toast) | ❌ Propuesto |
| **Report Generator** | ❌ NO EXISTE | Service | — | Generar reportes (PDF, CSV, JSON) | ❌ Propuesto |
| **Reports Adapter** | ❌ NO EXISTE | Adapter | — | Bridge entre datos y generador | ❌ Propuesto |
| **Report Screen** | `app/(tabs)/report.tsx` | Screen | Mostrar UI de reportes + mock | Integrar con ReportGenerator | ⚠️ Parcial |
| **Report Data Store** | ❌ NO EXISTE | Store | — | Persistir reportes generados | ❌ Propuesto |

---

## 🔔 **SISTEMA DE NOTIFICACIONES ACTUAL (ToastContext)**

### **Flujo Funcional**

```
showToast('Mensaje', 'success')
    ↓
ToastProvider (context)
    ├─ setMessage('Mensaje')
    ├─ setType('success')
    ├─ opacity.value = 1 (Reanimated)
    ├─ translateY.value = spring(iOS: 60px | Android: 40px)
    └─ setTimeout(dismissToast, 3500ms)
    ↓
Animated.View renderiza Toast card (flotante)
    ├─ backgroundColor = colors.carbonMist
    ├─ borderColor = config.color (green, red, amber, blue)
    ├─ Icon = ICONS.system[type]
    └─ Text = message
    ↓
[3.5s elapsed]
    ↓
dismissToast()
    ├─ translateY.value = timing(-150px, 250ms)
    ├─ opacity.value = 0
    └─ setMessage('') → unmount
```

### **Tipos de Notificaciones Soportados**

```typescript
type ToastType = 'success' | 'error' | 'info' | 'warning';

Mapeo:
'success' → icon: 'checkmark-circle-outline', color: colors.successGreen (#27AE60)
'error'   → icon: 'alert-circle-outline', color: colors.deepRed (#EB5757)
'warning' → icon: 'warning-outline', color: colors.amberWarning (#F2994A)
'info'    → icon: 'information-circle-outline', color: colors.slateBlue (#546E7A)
```

### **Ubicaciones donde se genera`showToast()`**

```
HoyScreen:
  • [TAP "Iniciar jornada"] → showToast('Monitoreo activado', 'success')
  • [TAP secundario] → showToast('Esperando señal GPS...', 'info')
  • Manual startup → showToast('Jornada iniciada manualmente', 'info')
  • Operación restablecida → showToast('Operación restablecida', 'success')

ReportScreen:
  • Modo prueba activado → showToast('Modo prueba: error de memoria activado', 'info')
  • Generación exitosa → showToast('Reporte generado correctamente', 'success')
  • Generación fallida → showToast('No fue posible generar el documento', 'error')
  • Opciones compartir → showToast('Abriendo opciones del sistema...', 'info')

SettingsScreen:
  • PIN incorrecto → showToast('PIN incorrecto', 'error')
  • PIN correcto → showToast('Acceso desbloqueado', 'success')
  • Permisos restaurados → showToast('Permisos restaurados', 'success')
  • Permisos desactivados → showToast('Permisos de ubicación desactivados', 'warning')
  • Configuración guardada → showToast('Configuración guardada', 'success')

SessionDetailScreen:
  • Jornada actualizada → showToast('Jornada actualizada', 'success')
  • Jornada eliminada → showToast('Jornada eliminada', 'error')
```

---

## 📊 **SISTEMA DE REPORTES ACTUAL (ReportScreen)**

### **Flujo Funcional (Mock)**

```
ReportScreen [TAP Reportes tab]
    ↓
Renderiza:
  • PeriodSelector (navegación semanal: Jun 01 - Jun 07)
  • SummaryCard (Total semanal: $256.00)
  • DocumentPreviewWidget (preview PDF simulado)
  • BreakdownGrid (desglose tarifario)
    ├─ Horas normales: 12.8 h
    ├─ Horas extra: 0.0 h
    ├─ Tarifa base: $20.00/h
    ├─ Multiplicador extra: 1.5x
    └─ Total neto: $256.00
  • ActionButtons:
    ├─ [Generar reporte]
    ├─ [Compartir]
    ├─ [Enviar por correo]
    └─ [Vista previa]
    ↓
[TAP "Generar reporte"]
    ↓
setIsExporting(true)
    ↓
setTimeout(1500ms)
    ├─ setIsExporting(false)
    ├─ if (forceMemoryError)
    │   └─ showToast('No fue posible generar el documento', 'error')
    │       setHasGenerated(false)
    └─ else
        └─ showToast('Reporte generado correctamente', 'success')
            setHasGenerated(true)
    ↓
[hasGenerated = true] →
  • [Compartir] button enabled
  • [Enviar por correo] button enabled
  • [Vista previa] button enabled
```

### **Tipos de Reportes (Propuestos)**

```typescript
type ReportType = 
  | 'weekly_summary'    // Resumen semanal (PDF)
  | 'daily_detail'      // Detalle diario (CSV)
  | 'earnings_summary'  // Resumen de ganancias (JSON)
  | 'audit_trail'       // Auditoría completa (XML)
  | 'csv_export'        // Exportación CSV para Excel

Cada reporte contiene:
{
  id: 'RPT-2026-06-04-001',
  type: ReportType,
  periodStart: '2026-06-01',
  periodEnd: '2026-06-07',
  employeeName: 'Alex León',
  
  // Datos del reporte
  totalHours: 12.8,
  totalEarnings: 256.00,
  sessions: Session[],
  
  // Metadatos
  generatedAt: Date,
  expiresAt: Date,
  signature?: string,  // Para auditoría
}
```

---

## 🏗️ **ARQUITECTURA PROPUESTA**

### **Estructura de Directorios**

```
src/
├── services/
│   ├── notifications/
│   │   ├── NotificationService.ts      (Orquestación central)
│   │   ├── ToastAdapter.ts             (Bridge a ToastContext)
│   │   ├── PushNotificationAdapter.ts  (Bridge a expo-notifications)
│   │   └── types.ts                    (Tipos y enums)
│   │
│   ├── reports/
│   │   ├── ReportGenerator.ts          (Generación de reportes)
│   │   ├── ReportExporter.ts           (PDF, CSV, JSON)
│   │   ├── ReportsAdapter.ts           (Bridge a datos)
│   │   └── types.ts                    (Tipos de reportes)
│   │
│   └── index.ts                        (Exports)
│
├── domain/
│   ├── entities/
│   │   ├── Notification.ts
│   │   ├── Report.ts
│   │   └── Session.ts
│   │
│   └── repositories/
│       ├── NotificationRepository.ts
│       └── ReportRepository.ts
│
└── runtime/
    ├── reportsAdapter.ts               (Adapter pattern)
    └── notificationsAdapter.ts
```

---

## 📐 **FLUJO FUNCIONAL PROPUESTO**

### **1. Sistema de Notificaciones Centralizado**

```typescript
// NotificationService.ts
export class NotificationService {
  constructor(
    private toastAdapter: ToastAdapter,
    private pushAdapter: PushNotificationAdapter,
    private logger: Logger
  ) {}

  async notify(
    message: string,
    type: NotificationType,
    options?: NotificationOptions
  ): Promise<void> {
    // Log para auditoría
    this.logger.info(`Notification: ${type}`, { message, options });

    // Si es UI notification → Toast
    if (options?.channel === 'toast') {
      this.toastAdapter.show(message, type);
    }

    // Si es background → Push
    if (options?.channel === 'push') {
      await this.pushAdapter.send(message, type);
    }

    // Si requiere persistencia → Repository
    if (options?.persistent) {
      await this.repository.save({ message, type, timestamp: Date.now() });
    }
  }
}

// Uso:
const notificationService = new NotificationService(...);

// En HoyScreen:
await notificationService.notify(
  'Monitoreo activado',
  'success',
  { channel: 'toast', duration: 3500 }
);

// En ReportScreen:
await notificationService.notify(
  'Reporte generado',
  'success',
  { channel: 'toast', persistent: true } // Guardar en historial
);
```

### **2. Sistema de Reportes Centralizado**

```typescript
// ReportGenerator.ts
export class ReportGenerator {
  constructor(
    private adapter: ReportsAdapter,
    private exporter: ReportExporter,
    private repository: ReportRepository
  ) {}

  async generateWeeklySummary(
    startDate: Date,
    endDate: Date
  ): Promise<Report> {
    // 1. Obtener datos desde adapter
    const sessions = await this.adapter.fetchSessions(startDate, endDate);
    const tariff = await this.adapter.fetchTariff();

    // 2. Calcular métricas
    const metrics = this.calculateMetrics(sessions, tariff);

    // 3. Construir reporte
    const report: Report = {
      id: `RPT-${Date.now()}`,
      type: 'weekly_summary',
      periodStart: startDate,
      periodEnd: endDate,
      totalHours: metrics.hours,
      totalEarnings: metrics.earnings,
      sessions,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
    };

    // 4. Persistir
    await this.repository.save(report);

    // 5. Retornar
    return report;
  }

  async exportReport(
    report: Report,
    format: ExportFormat
  ): Promise<ExportResult> {
    const path = await this.exporter.export(report, format);
    
    // Auditoría
    await this.repository.logExport({
      reportId: report.id,
      format,
      exportedAt: new Date(),
      fileSize: fs.statSync(path).size,
    });

    return { success: true, path };
  }

  private calculateMetrics(sessions: Session[], tariff: Tariff) {
    let totalHours = 0;
    let totalEarnings = 0;

    for (const session of sessions) {
      const hours = (session.endTime - session.startTime) / 3600000;
      const isOvertime = hours > 8;
      
      const rate = isOvertime 
        ? tariff.baseRate * tariff.overtimeMultiplier
        : tariff.baseRate;

      totalHours += hours;
      totalEarnings += hours * rate;
    }

    return { hours: totalHours, earnings: totalEarnings };
  }
}

// Uso en ReportScreen:
const reportService = new ReportGenerator(...);

const [isExporting, setIsExporting] = useState(false);

const handleGenerateReport = async () => {
  setIsExporting(true);
  try {
    const report = await reportService.generateWeeklySummary(
      new Date('2026-06-01'),
      new Date('2026-06-07')
    );
    setHasGenerated(true);
    showToast('Reporte generado correctamente', 'success');
  } catch (error) {
    showToast('No fue posible generar el documento', 'error');
  } finally {
    setIsExporting(false);
  }
};
```

### **3. Adapter Pattern (ReportsAdapter)**

```typescript
// runtime/reportsAdapter.ts
export class ReportsAdapter {
  constructor(
    private database: Database,
    private api: ApiClient
  ) {}

  async fetchSessions(
    startDate: Date,
    endDate: Date
  ): Promise<Session[]> {
    // Intenta local primero
    try {
      return await this.database.sessions
        .where('createdAt').between(startDate, endDate)
        .toArray();
    } catch {
      // Si falla, intenta API remoto
      return await this.api.get('/sessions', { startDate, endDate });
    }
  }

  async fetchTariff(): Promise<Tariff> {
    // Intenta caché
    const cached = await this.database.tariffs.getLatest();
    if (cached && !this.isExpired(cached)) {
      return cached;
    }

    // Sincroniza con API
    const remote = await this.api.get('/tariffs/current');
    await this.database.tariffs.save(remote);
    return remote;
  }

  private isExpired(tariff: Tariff): boolean {
    return Date.now() - tariff.updatedAt.getTime() > 24 * 60 * 60 * 1000;
  }
}
```

---

## 🚨 **RIESGOS IDENTIFICADOS (ACTUAL)**

### **🔴 RIESGO N-1: Toast Pisa Toast Anterior**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Si usuario dispara 2 `showToast()` rápidamente, el segundo cancela el primero |
| **Línea** | `src/context/ToastContext.tsx` línea 55-58 |
| **Impacto** | Información crítica se pierde silenciosamente |
| **Gravedad** | 🔴 **CRÍTICA** - Pérdida de feedback |
| **Recomendación** | Implementar cola de toasts (FIFO stack) |

```typescript
// Propuesta:
interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

export function ToastProvider({ children }: ...) {
  const [toastQueue, setToastQueue] = useState<Toast[]>([]);
  const [currentToast, setCurrentToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36);
    setToastQueue(q => [...q, { id, message, type, timestamp: Date.now() }]);
  }, []);

  // Procesar cola
  useEffect(() => {
    if (!currentToast && toastQueue.length > 0) {
      const [next, ...rest] = toastQueue;
      setCurrentToast(next);
      setToastQueue(rest);

      const timer = setTimeout(() => setCurrentToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [currentToast, toastQueue]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {currentToast && <Toast {...currentToast} />}
    </ToastContext.Provider>
  );
}
```

---

### **🔴 RIESGO N-2: Reportes Sin Persistencia**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | ReportScreen genera reportes mock, no persiste nada |
| **Línea** | `app/(tabs)/report.tsx` línea 38-51 |
| **Impacto** | Al cerrar app, reportes se pierden |
| **Gravedad** | 🔴 **CRÍTICA** - Aplicación no funcional |
| **Recomendación** | Implementar ReportRepository (SQLite/AsyncStorage) |

```typescript
// Propuesta:
export class ReportRepository {
  async save(report: Report): Promise<void> {
    await this.db.reports.add({
      id: report.id,
      type: report.type,
      periodStart: report.periodStart.toISOString(),
      periodEnd: report.periodEnd.toISOString(),
      totalHours: report.totalHours,
      totalEarnings: report.totalEarnings,
      generatedAt: report.generatedAt.toISOString(),
    });
  }

  async findById(id: string): Promise<Report | null> {
    const record = await this.db.reports.get(id);
    if (!record) return null;
    
    return {
      id: record.id,
      type: record.type,
      periodStart: new Date(record.periodStart),
      periodEnd: new Date(record.periodEnd),
      totalHours: record.totalHours,
      totalEarnings: record.totalEarnings,
      generatedAt: new Date(record.generatedAt),
    };
  }

  async listRecent(limit: number = 10): Promise<Report[]> {
    return await this.db.reports
      .orderBy('generatedAt')
      .reverse()
      .limit(limit)
      .toArray();
  }
}
```

---

### **🔴 RIESGO N-3: Sin Exportación Real (PDF/CSV)**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Botones [Compartir], [Enviar], [Vista previa] son dummy |
| **Línea** | `app/(tabs)/report.tsx` línea 189-207 |
| **Impacto** | Usuario genera reporte pero no puede exportarlo |
| **Gravedad** | 🔴 **CRÍTICA** - Funcionalidad inexistente |
| **Recomendación** | Implementar ReportExporter (react-native-pdf, csv lib) |

```typescript
// Propuesta:
import { PDFDocument, PDFPage } from 'react-native-pdf';
import { csv } from 'csv-export-lib';

export class ReportExporter {
  async exportPDF(report: Report): Promise<string> {
    const doc = new PDFDocument();
    
    // Header
    doc.fontSize(20).text('Reporte Semanal de Horas', { align: 'center' });
    doc.fontSize(12).text(`Período: ${report.periodStart} - ${report.periodEnd}`);
    
    // Resumen
    doc.moveDown();
    doc.fontSize(14).text('Resumen');
    doc.fontSize(11).text(`Total horas: ${report.totalHours}h`);
    doc.text(`Ganancias: $${report.totalEarnings}`);
    
    // Sessions
    doc.moveDown();
    doc.fontSize(14).text('Sesiones');
    for (const session of report.sessions) {
      doc.text(`${session.startTime} - ${session.endTime}: ${session.hours}h`);
    }
    
    // Guardar
    const path = `${FileSystem.documentDirectory}report-${report.id}.pdf`;
    await doc.saveAsync({ path });
    return path;
  }

  async exportCSV(report: Report): Promise<string> {
    const data = [
      ['Fecha', 'Inicio', 'Fin', 'Horas', 'Ganancias'],
      ...report.sessions.map(s => [
        s.date,
        s.startTime,
        s.endTime,
        s.hours,
        s.earnings,
      ])
    ];

    const path = `${FileSystem.documentDirectory}report-${report.id}.csv`;
    await FileSystem.writeAsStringAsync(path, csv(data));
    return path;
  }
}
```

---

### **🟠 RIESGO N-4: Sin Notificaciones Push**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Solo Toast (in-app), sin notificaciones push o background |
| **Línea** | `src/context/ToastContext.tsx` (todo el archivo) |
| **Impacto** | Usuario no recibe alertas fuera de app |
| **Gravedad** | 🟠 **ALTA** - Pérdida de alertas críticas |
| **Recomendación** | Integrar expo-notifications |

```typescript
// Propuesta:
import * as Notifications from 'expo-notifications';

export class PushNotificationAdapter {
  async send(message: string, type: NotificationType): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'WTracker',
        body: message,
        data: { type },
        badge: 1,
        sound: 'default',
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // Inmediato
    });
  }
}
```

---

### **🟠 RIESGO N-5: Sin Auditoría de Reportes**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Reportes generados no se registran (quién, cuándo, formato) |
| **Línea** | `app/(tabs)/report.tsx` (sin logging) |
| **Impacto** | Imposible auditar generación/exportación |
| **Gravedad** | 🟠 **MEDIA** - Compliance |
| **Recomendación** | Agregar audit trail |

```typescript
// Propuesta:
export interface AuditLog {
  id: string;
  action: 'report_generated' | 'report_exported' | 'report_deleted';
  reportId: string;
  userId: string;
  format?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class ReportRepository {
  async logExport(auditLog: AuditLog): Promise<void> {
    await this.db.auditLogs.add(auditLog);
  }
}
```

---

### **🟠 RIESGO N-6: Reportes Sin Versionado**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Si cambian tarifas, reportes antiguos pueden re-calcularse incorrectamente |
| **Línea** | No hay persistencia de tarifa en reporte |
| **Impacto** | Inconsistencia de datos históricos |
| **Gravedad** | 🟠 **MEDIA** - Data integrity |
| **Recomendación** | Almacenar tarifa con cada reporte |

```typescript
// Propuesta:
export interface Report {
  ...
  // Capturar estado de la tarifa en momento de generación
  tariff: {
    baseRate: number;
    overtimeMultiplier: number;
    effectiveFrom: Date;
    effectiveUntil?: Date;
  };
}
```

---

### **🟡 RIESGO N-7: Sin Rate Limiting en Generación**

| **Aspecto** | **Detalle** |
|---|---|
| **Problema** | Usuario puede generar reportes infinitamente |
| **Línea** | `app/(tabs)/report.tsx` línea 38 (sin límite) |
| **Impacto** | Consumo excesivo de memoria/CPU |
| **Gravedad** | 🟡 **BAJA** - Performance |
| **Recomendación** | Implementar rate limiter |

```typescript
// Propuesta:
export class RateLimiter {
  private lastGeneratedAt: Map<string, Date> = new Map();
  private cooldownMs = 5000; // 5 segundos

  canGenerate(userId: string): boolean {
    const last = this.lastGeneratedAt.get(userId);
    if (!last) return true;
    
    return Date.now() - last.getTime() > this.cooldownMs;
  }

  record(userId: string): void {
    this.lastGeneratedAt.set(userId, new Date());
  }
}
```

---

## 📊 **TABLA DE FLUJOS DE NOTIFICACIONES**

| **Origen** | **Tipo** | **Canal** | **Duración** | **Persistencia** | **Log** |
|---|---|---|---|---|---|
| DailySetupModal | success | Toast | 3.5s | ❌ | ❌ |
| ReportScreen | success | Toast | 3.5s | ❌ | ❌ |
| SettingsScreen PIN | error | Toast | 3.5s | ❌ | ❌ |
| SystemHealthBlock | warning | Toast | 3.5s | ❌ | ❌ |
| **PROPUESTO**: GPS offline | warning | Push + Toast | — | ✅ | ✅ |
| **PROPUESTO**: Reporte generado | success | Push + Toast | — | ✅ | ✅ |
| **PROPUESTO**: Jornada finalizada | success | Push + Toast | — | ✅ | ✅ |

---

## 📊 **TABLA DE FLUJOS DE REPORTES**

| **Acción** | **Disparador** | **Generador** | **Almacenamiento** | **Exportación** | **Auditoría** |
|---|---|---|---|---|---|
| **Generar reporte semanal** | [TAP "Generar reporte"] | ❌ NO (mock) | ❌ NO | ❌ NO | ❌ NO |
| **Exportar PDF** | [TAP "Vista previa"] | ❌ NO | ❌ NO | ❌ NO (dummy) | ❌ NO |
| **Exportar CSV** | [TAP "Compartir"] | ❌ NO | ❌ NO | ❌ NO (dummy) | ❌ NO |
| **Enviar por correo** | [TAP "Enviar por correo"] | ❌ NO | ❌ NO | ❌ NO (dummy) | ❌ NO |
| **PROPUESTO**: Resumen diario | Cron (8 PM) | ✅ ReportGenerator | ✅ SQLite | ✅ ReportExporter | ✅ AuditLog |
| **PROPUESTO**: Histórico reportes | [TAP Historial] | ✅ ReportRepository | ✅ SQLite | — | ✅ AuditLog |

---

## 🔧 **IMPLEMENTACIÓN MÍNIMA RECOMENDADA (Roadmap)**

### **Fase 1 (Semana 1): Notificaciones**

1. ✅ Extender ToastContext → Cola de toasts
2. ✅ Crear NotificationService (bridge central)
3. ✅ Integrar expo-notifications (push)
4. ✅ Agregar logging básico

### **Fase 2 (Semana 2): Reportes - Base**

1. ✅ Crear ReportGenerator (lógica)
2. ✅ Crear ReportRepository (persistencia SQLite)
3. ✅ Crear ReportsAdapter (fetch datos)
4. ✅ Integrar en ReportScreen

### **Fase 3 (Semana 3): Reportes - Exportación**

1. ✅ ReportExporter (PDF + CSV)
2. ✅ Integrar con botones [Compartir], [Enviar]
3. ✅ Agregar auditoría
4. ✅ Rate limiting

### **Fase 4 (Semana 4): Polish**

1. ✅ Sincronización bidireccional (local ↔ API)
2. ✅ Versionado de reportes
3. ✅ Notificaciones programadas (cron)
4. ✅ Historial de notificaciones

---

## 📈 **MÉTRICA DE COMPLETITUD ACTUAL**

```
Sistema de Notificaciones:
  Toast UI        ✅ 100% (ToastContext)
  Persistencia    ❌   0%
  Push            ❌   0%
  Auditoría       ❌   0%
  ────────────────────────
  TOTAL:          🟡 25%

Sistema de Reportes:
  UI/Mock         ✅ 100% (ReportScreen)
  Generador       ❌   0%
  Persistencia    ❌   0%
  Exportación     ❌   0%
  Auditoría       ❌   0%
  ────────────────────────
  TOTAL:          🟡 20%

OVERALL:          🟡 22.5% (Prototipo avanzado)
```

---
