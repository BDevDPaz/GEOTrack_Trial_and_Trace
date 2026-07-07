import { now, nowIso } from '../../utils/timeProvider';
import { loadSessionRecordsSnapshot, loadSystemLogRecordsSnapshot } from '../runtime/sessionStoreAdapter';
import {
  DomainEvent,
  WorkTrackerCanonicalState,
  WorkTrackerRuntimeAdapter,
  SessionRecord,
  SystemLogRecord,
  AuditLogRecord,
} from '../contracts';

function getSessionOrThrow(state: WorkTrackerCanonicalState, sessionId: number): SessionRecord {
  const session = state.domain.sessions.byId[String(sessionId)];
  if (!session) throw new Error(`Sesión #${sessionId} no encontrada.`);
  return session;
}

function isBootRehydrating(state: WorkTrackerCanonicalState): boolean {
  return state.meta.bootState.isRehydrating;
}

function createAuditLogEntry(p: { sessionId: number; actionType: string; details: string }, state: WorkTrackerCanonicalState): AuditLogRecord {
  return { id: state.domain.audit.auditLogs.length + 1, sessionId: p.sessionId, actionType: p.actionType, details: p.details, timestampMs: now() };
}

function createSystemLogEntry(p: Partial<SystemLogRecord> & { color: string; category: string; severity: string; message: string }, state: WorkTrackerCanonicalState): SystemLogRecord {
  return { id: state.domain.audit.systemLogs.length + 1, timestampMs: now(), timestampIso: nowIso(), color: p.color, category: p.category, severity: p.severity, message: p.message, metadataJson: p.metadataJson ?? null };
}

async function handleAppBootStarted(_e: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  const settings = await runtime.sessionStore.getSettings();
  const auditLogs = await runtime.logging.getAuditLogs();
  const sessions = await loadSessionRecordsSnapshot();
  const systemLogs = await loadSystemLogRecordsSnapshot();

  return [
    ...(settings ? [{ type: 'SETTINGS_REHYDRATED', settings } as DomainEvent] : []),
    ...(auditLogs ? [{ type: 'AUDIT_LOGS_REHYDRATED', entries: auditLogs } as DomainEvent] : []),
    { type: 'SESSIONS_REHYDRATED', sessions },
    { type: 'SYSTEM_LOGS_REHYDRATED', entries: systemLogs },
    { type: 'APP_REHYDRATION_COMPLETED', timestampMs: now() },
    { type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'AZUL', category: 'SISTEMA', severity: 'INFO', message: 'Rehidratación completada.' }, nextState) }
  ];
}

async function handleSessionCreated(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.session.id);
  await runtime.sessionStore.createSession(session);
  const { targetLatitude: lat, targetLongitude: lng } = session.destination;
  if (lat !== null && lng !== null) {
    const identifier = `SESSION_${session.id}`;
    await runtime.location.startMonitoringArrival(identifier, lat, lng, nextState.domain.settings.toleranceRadiusMeters);
    return [
      { type: 'GEOFENCE_MONITORING_STARTED', taskName: 'GEOFENCE_TRACKING_TASK', identifier, latitude: lat, longitude: lng, radiusMeters: nextState.domain.settings.toleranceRadiusMeters },
      { type: 'AUDIT_LOG_APPENDED', entry: createAuditLogEntry({ sessionId: session.id, actionType: 'SESSION_CREATED', details: `Sesión creada: ${session.destination.address}` }, nextState) }
    ];
  }
  return [{ type: 'AUDIT_LOG_APPENDED', entry: createAuditLogEntry({ sessionId: session.id, actionType: 'SESSION_CREATED', details: `Sesión creada: ${session.destination.address}` }, nextState) }];
}

async function handleSessionDestinationSet(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  await runtime.sessionStore.updateSessionManual(session.id, session.declaredStartAtMs, session.endAtMs, session.notes.manualNote ?? '');
  const { targetLatitude: lat, targetLongitude: lng } = session.destination;
  if (lat !== null && lng !== null) {
    const identifier = `SESSION_${session.id}`;
    await runtime.location.startMonitoringArrival(identifier, lat, lng, nextState.domain.settings.toleranceRadiusMeters);
    return [
      { type: 'GEOFENCE_MONITORING_STARTED', taskName: 'GEOFENCE_TRACKING_TASK', identifier, latitude: lat, longitude: lng, radiusMeters: nextState.domain.settings.toleranceRadiusMeters },
      { type: 'AUDIT_LOG_APPENDED', entry: createAuditLogEntry({ sessionId: session.id, actionType: 'SESSION_DESTINATION_SET', details: 'Destino actualizado.' }, nextState) }
    ];
  }
  return [];
}

async function handleGeofenceMonitoringStarted(event: any, _p: any, nextState: WorkTrackerCanonicalState): Promise<DomainEvent[]> {
  return [{ type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'VERDE', category: 'UBICACION', severity: 'INFO', message: `Monitoreo iniciado (${event.identifier})` }, nextState) }];
}

async function handleGeofenceMonitoringStopped(_e: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  await runtime.location.stopMonitoring();
  return [{ type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'NARANJA', category: 'UBICACION', severity: 'INFO', message: 'Monitoreo detenido.' }, nextState) }];
}

async function handleSessionTransitStarted(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  await runtime.sessionStore.updateSessionManual(session.id, session.declaredStartAtMs, session.endAtMs, session.notes.manualNote ?? '');
  await runtime.notifications.notifyImmediate('En tránsito', 'La jornada cambió a estado de traslado.', { sessionId: session.id, action: 'SESSION_TRANSIT_STARTED' });
  return [{ type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'AZUL', category: 'OPERACION_EXITOSA', severity: 'INFO', message: `Sesión #${session.id} en tránsito.` }, nextState) }];
}

async function handleSessionArrivalConfirmedManual(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  await runtime.sessionStore.updateSessionManual(session.id, event.actualStartAtMs, session.endAtMs, session.notes.manualNote ?? '');
  return [{ type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'VERDE', category: 'OPERACION_EXITOSA', severity: 'INFO', message: `Llegada confirmada #${session.id}.` }, nextState) }];
}

async function handleSessionAutoCheckinGps(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  await runtime.sessionStore.updateSessionManual(session.id, event.actualStartAtMs, session.endAtMs, session.notes.manualNote ?? '');
  await runtime.location.clearLastExitTimestamp();
  await runtime.notifications.notifyImmediate('📍 Llegaste al sitio', 'Auto Check-in (GPS) realizado.', { sessionId: session.id, action: 'AUTO_CHECKIN_GPS' });
  return [{ type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'VERDE', category: 'OPERACION_EXITOSA', severity: 'INFO', message: `Auto Check-in #${session.id}.` }, nextState) }];
}

async function handleSessionExitDetected(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  await runtime.location.setLastExitTimestamp(event.exitTimestampMs);
  await runtime.notifications.notifyImmediate('⚠️ Saliste del área', '¿Terminaste tu jornada?', { sessionId: session.id, action: 'CHECKOUT_DECISION' });
  return [{ type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'NARANJA', category: 'UBICACION', severity: 'WARN', message: `Salida detectada #${session.id}.` }, nextState) }];
}

async function handleSessionExitResolvedContinue(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  await runtime.location.clearLastExitTimestamp();
  return [{ type: 'AUDIT_LOG_APPENDED', entry: createAuditLogEntry({ sessionId: event.sessionId, actionType: 'GEOFENCE_EXIT_RESOLVED', details: 'Usuario decidió continuar.' }, nextState) }];
}

async function handleSessionAutoCheckoutGps(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  await runtime.sessionStore.closeSession(session.id, event.endAtMs);
  await runtime.location.stopMonitoring();
  await runtime.notifications.notifyImmediate('Jornada Finalizada 🏁', 'Cerrada por inactividad.', { sessionId: session.id, action: 'AUTO_CHECKOUT_GPS' });
  return [
    { type: 'GEOFENCE_MONITORING_STOPPED' },
    { type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'ROJO', category: 'OPERACION_EXITOSA', severity: 'INFO', message: `Auto Check-out #${session.id}.` }, nextState) }
  ];
}

async function handleSessionClosedManual(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  await runtime.sessionStore.closeSession(session.id, event.endAtMs);
  await runtime.location.stopMonitoring();
  return [
    { type: 'GEOFENCE_MONITORING_STOPPED' },
    { type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'ROJO', category: 'OPERACION_EXITOSA', severity: 'INFO', message: `Cerrada manual #${session.id}.` }, nextState) }
  ];
}

async function handleSessionLunchRecorded(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  if (event.lunchStartAtMs && event.lunchEndAtMs) await runtime.sessionStore.updateLunch(session.id, event.lunchStartAtMs, event.lunchEndAtMs);
  return [{ type: 'AUDIT_LOG_APPENDED', entry: createAuditLogEntry({ sessionId: session.id, actionType: 'LUNCH_RECORDED', details: 'Almuerzo actualizado.' }, nextState) }];
}

async function handleSessionEditedManual(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  await runtime.sessionStore.updateSessionManual(session.id, event.startTime, event.endTime, event.note);
  return [{ type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'AMARILLO', category: 'OPERACION_EXITOSA', severity: 'INFO', message: `Editada manual #${session.id}.` }, nextState) }];
}

async function handleSessionDeletedSoft(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  await runtime.sessionStore.deleteSession(session.id);
  if (nextState.domain.sessions.activeSessionId === null) await runtime.location.stopMonitoring();
  return [{ type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'ROJO', category: 'ADVERTENCIA', severity: 'WARN', message: `Eliminada #${session.id}.` }, nextState) }];
}

async function handleSessionNoteAdded(event: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) return [];
  const session = getSessionOrThrow(nextState, event.sessionId);
  await runtime.sessionStore.updateSessionManual(session.id, session.declaredStartAtMs, session.endAtMs, event.note);
  return [{ type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'AZUL', category: 'OPERACION_EXITOSA', severity: 'INFO', message: `Nota agregada #${session.id}.` }, nextState) }];
}

async function handleReportShareRequested(_e: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  const uri = nextState.runtime.background.weeklyReport.lastGeneratedUri;
  if (uri) await runtime.reports.sharePdf(uri);
  return [];
}

async function handleReportEmailRequested(_e: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  const uri = nextState.runtime.background.weeklyReport.lastGeneratedUri;
  if (uri) await runtime.reports.sendByEmail(uri, nextState.domain.settings.companyEmail, nextState.domain.settings.employeeName);
  return [];
}

async function handleAdminAccessValidationStarted(event: any, _p: any, _n: any, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  return (await runtime.security.validateAdminPin(event.pin || '')) ? [{ type: 'ADMIN_ACCESS_GRANTED', timestampMs: now() }] : [{ type: 'ADMIN_ACCESS_DENIED' }];
}

async function handleSystemLogAppended(event: any, _p: any, _n: any, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  await runtime.logging.appendSystemLog(event.entry);
  return [];
}

async function handleAuditLogAppended(event: any, _p: any, _n: any, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  await runtime.logging.appendAuditLog(event.entry);
  return [];
}

async function handleAppResumed(event: any, _p: any, nextState: WorkTrackerCanonicalState): Promise<DomainEvent[]> {
  return [
    { type: 'PERMISSIONS_REFRESH_REQUESTED' },
    { type: 'DATA_REFRESH_REQUESTED' },
    { type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'AZUL', category: 'SISTEMA', severity: 'INFO', message: 'Aplicación reactivada (Foreground).' }, nextState) }
  ];
}

async function handlePermissionsRefreshRequested(_e: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  const locStatus = await runtime.location.getCurrentPermissions();
  const notifStatus = await runtime.notifications.getCurrentPermissions();

  return [
    { type: 'PERMISSIONS_LOCATION_UPDATED', foreground: locStatus.foreground, background: locStatus.background },
    { type: 'PERMISSIONS_NOTIFICATIONS_UPDATED', notifications: notifStatus.status }
  ];
}

async function handleDataRefreshRequested(_e: any, _p: any, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  const sessions = await loadSessionRecordsSnapshot();
  const systemLogs = await loadSystemLogRecordsSnapshot();
  const auditLogs = await runtime.logging.getAuditLogs();

  return [
    { type: 'SESSIONS_REHYDRATED', sessions },
    { type: 'SYSTEM_LOGS_REHYDRATED', entries: systemLogs },
    { type: 'AUDIT_LOGS_REHYDRATED', entries: auditLogs },
    { type: 'SYSTEM_LOG_APPENDED', entry: createSystemLogEntry({ color: 'AZUL', category: 'SISTEMA', severity: 'INFO', message: 'Datos sincronizados desde DB.' }, nextState) }
  ];
}

const handlers: Record<string, any> = {
  APP_BOOT_STARTED: handleAppBootStarted,
  APP_RESUMED: handleAppResumed,
  PERMISSIONS_REFRESH_REQUESTED: handlePermissionsRefreshRequested,
  DATA_REFRESH_REQUESTED: handleDataRefreshRequested,
  SESSION_CREATED: handleSessionCreated,
  SESSION_DESTINATION_SET: handleSessionDestinationSet,
  GEOFENCE_MONITORING_STARTED: handleGeofenceMonitoringStarted,
  GEOFENCE_MONITORING_STOPPED: handleGeofenceMonitoringStopped,
  SESSION_TRANSIT_STARTED: handleSessionTransitStarted,
  SESSION_ARRIVAL_CONFIRMED_MANUAL: handleSessionArrivalConfirmedManual,
  SESSION_AUTO_CHECKIN_GPS: handleSessionAutoCheckinGps,
  SESSION_EXIT_DETECTED: handleSessionExitDetected,
  SESSION_EXIT_RESOLVED_CONTINUE: handleSessionExitResolvedContinue,
  SESSION_AUTO_CHECKOUT_GPS: handleSessionAutoCheckoutGps,
  SESSION_CLOSED_MANUAL: handleSessionClosedManual,
  SESSION_LUNCH_RECORDED: handleSessionLunchRecorded,
  SESSION_EDITED_MANUAL: handleSessionEditedManual,
  SESSION_DELETED_SOFT: handleSessionDeletedSoft,
  SESSION_NOTE_ADDED: handleSessionNoteAdded,
  REPORT_SHARE_REQUESTED: handleReportShareRequested,
  REPORT_EMAIL_REQUESTED: handleReportEmailRequested,
  ADMIN_ACCESS_VALIDATION_STARTED: handleAdminAccessValidationStarted,
  SYSTEM_LOG_APPENDED: handleSystemLogAppended,
  AUDIT_LOG_APPENDED: handleAuditLogAppended,
};

export async function executeEffects(event: DomainEvent, prevState: WorkTrackerCanonicalState, nextState: WorkTrackerCanonicalState, runtime: WorkTrackerRuntimeAdapter): Promise<DomainEvent[]> {
  const handler = handlers[event.type];
  if (!handler) return [];
  try {
    const secondaryEvents = await handler(event, prevState, nextState, runtime);
    return Array.isArray(secondaryEvents) ? secondaryEvents : [];
  } catch (error) {
    return [{ type: 'SYSTEM_ERROR_RECORDED', entry: createSystemLogEntry({ color: 'ROJO', category: 'ERROR_CRITICO', severity: 'ERROR', message: `Error en effects ${event.type}: ${String(error)}` }, nextState) } as any];
  }
}
