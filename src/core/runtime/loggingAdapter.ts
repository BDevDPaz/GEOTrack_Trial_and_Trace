import { SystemLogRecord, AuditLogRecord, FeedbackPayload } from '../contracts';
import { getDB, isDatabaseReady } from '../../database/db';

/**
 * CONTRATO ESTRICTO:
 * Maneja la persistencia de auditoría/sistema y la traducción de errores a formato UI (FeedbackPayload).
 * NO debe renderizar Toasts ni Dialogs directamente.
 */
export interface LoggingAdapter {
  appendSystemLog(entry: SystemLogRecord): Promise<void>;
  appendAuditLog(entry: AuditLogRecord): Promise<void>;
  mapLogToFeedback(severity: string, category: string, message: string): FeedbackPayload | null;
}

// Colas temporales por si la DB no está lista en el milisegundo exacto de arranque
const systemLogQueue: SystemLogRecord[] = [];
const auditLogQueue: AuditLogRecord[] = [];

async function flushQueues() {
  if (!isDatabaseReady()) return;
  const db = getDB();
  
  while (systemLogQueue.length > 0) {
    const entry = systemLogQueue.shift();
    if (entry) await adapterImpl.appendSystemLog(entry);
  }
  
  while (auditLogQueue.length > 0) {
    const entry = auditLogQueue.shift();
    if (entry) await adapterImpl.appendAuditLog(entry);
  }
}

const adapterImpl: LoggingAdapter = {

  async appendSystemLog(entry: SystemLogRecord): Promise<void> {
    if (!isDatabaseReady()) {
      systemLogQueue.push(entry);
      return;
    }

    try {
      await flushQueues();
      const db = getDB();
      await db.runAsync(
        `INSERT INTO system_logs (timestamp, timestamp_str, color, categoria, severidad, mensaje, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [entry.timestampMs, entry.timestampIso, entry.color, entry.category, entry.severity, entry.message, entry.metadataJson]
      );
    } catch (error) {
      console.error('Fallo crítico guardando SystemLog:', error);
    }
  },

  async appendAuditLog(entry: AuditLogRecord): Promise<void> {
    if (!isDatabaseReady()) {
      auditLogQueue.push(entry);
      return;
    }

    try {
      await flushQueues();
      const db = getDB();
      await db.runAsync(
        `INSERT INTO audit_logs (session_id, action_type, details, timestamp) 
         VALUES (?, ?, ?, ?)`,
        [entry.sessionId, entry.actionType, entry.details, entry.timestampMs]
      );
    } catch (error) {
      console.error('Fallo crítico guardando AuditLog:', error);
    }
  },

  mapLogToFeedback(severity: string, category: string, message: string): FeedbackPayload | null {
    // 1. SILENCIADORES (Filtramos lo que no debe molestar al usuario)
    const SILENT_SEVERITIES = ['DEBUG', 'EVENT'];
    const SILENT_CATEGORIES = ['SIN_CAMBIOS', 'BACKGROUND_TASK', 'ESTADO_SISTEMA', 'SERVICIOS_ACTIVOS', 'EVENTO_GEOCERCA', 'REINICIO_MONITOREO', 'MONITOREO_DETENIDO'];
    
    if (SILENT_SEVERITIES.includes(severity) || SILENT_CATEGORIES.includes(category)) {
      return null;
    }

    if (severity === 'INFO' && !['OPERACION_EXITOSA'].includes(category)) {
      return null; 
    }

    // 2. HUMANIZACIÓN BÁSICA (Extraída de tu logBridge)
    let friendlyMessage = message;
    if (/Error crítico inicializando la app/i.test(message)) friendlyMessage = 'La aplicación no pudo iniciar correctamente. Reiníciala.';
    if (/No se encontró la dirección/i.test(message)) friendlyMessage = 'No encontramos la dirección. Revisa el texto.';
    if (/Horario choca con otra sesión/i.test(message)) friendlyMessage = 'Ese horario choca con otra sesión registrada.';
    if (/Permisos de ubicación denegados/i.test(message)) friendlyMessage = 'Se necesitan permisos de ubicación para continuar.';

    // 3. MAPEO A FEEDBACK PAYLOAD CANÓNICO
    const dedupeKey = `${category}:${friendlyMessage}`;
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    if (category === 'ERROR_CRITICO' || category === 'INTEGRIDAD_COMPROMETIDA' || severity === 'ERROR') {
      return {
        id,
        kind: 'dialog',
        tone: 'error',
        title: 'Error',
        message: friendlyMessage,
        destructive: false,
        durationMs: null,
        dedupeKey,
      };
    }

    if (severity === 'WARN' || category === 'ADVERTENCIA') {
      return {
        id,
        kind: 'toast',
        tone: 'warning', // Actualizado a tonos del contrato
        title: 'Aviso',
        message: friendlyMessage,
        durationMs: 3200,
        destructive: false,
        dedupeKey,
      };
    }

    return {
      id,
      kind: 'toast',
      tone: 'success',
      title: null,
      message: friendlyMessage,
      durationMs: 2600,
      destructive: false,
      dedupeKey,
    };
  }

};

export const loggingAdapter = adapterImpl;
