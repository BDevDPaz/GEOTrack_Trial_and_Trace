import {
  DomainEvent,
  BaseDomainEvent,
  WorkTrackerCanonicalState,
  WorkTrackerRuntimeAdapter,
  SessionRecord,
  SystemLogRecord,
  AuditLogRecord,
  AppSettingsRecord,
} from '../contracts/types';

import { formatDate, formatTime } from '../../utils/dateUtils';
import { calculateSessionDuration, calculatePay } from '../../utils/payrollUtils';

import {
  loadSessionRecordsSnapshot,
  loadSettingsRecordSnapshot,
  loadAuditLogRecordsSnapshot,
  loadSystemLogRecordsSnapshot,
} from '../runtime/sessionStoreAdapter';

const MAX_RETRY_ATTEMPTS = 3;

type SettingsSaveRequestedEvent = {
  type: 'SETTINGS_SAVE_REQUESTED';
  settings: AppSettingsRecord;
};

type ExtendedDomainEvent =
  | DomainEvent
  | SettingsSaveRequestedEvent
  | {
      pin?: string;
    };

/**
 * ============================================================================
 * RETRY QUEUE (MEMORIA)
 * ============================================================================
 * Cola de reintentos en memoria, con clave estable por evento.
 * El retry vuelve a ejecutar SOLO los side-effects del evento original,
 * sin redisparar el reducer sobre dicho evento.
 */
type RetryRequestedEvent = Extract<DomainEvent, { type: 'EVENT_RETRY_REQUESTED' }>;

const retryQueue: RetryRequestedEvent[] = [];
const retryQueueKeys = new Set<string>();

function buildRetryKey(event: BaseDomainEvent): string {
  switch (event.type) {
    case 'SESSION_CREATED':
      return `SESSION_CREATED:${event.session.id}`;
    case 'SESSION_DESTINATION_SET':
    case 'SESSION_TRANSIT_STARTED':
    case 'SESSION_ARRIVAL_CONFIRMED_MANUAL':
    case 'SESSION_AUTO_CHECKIN_GPS':
    case 'SESSION_EXIT_DETECTED':
    case 'SESSION_EXIT_RESOLVED_CONTINUE':
    case 'SESSION_AUTO_CHECKOUT_GPS':
    case 'SESSION_CLOSED_MANUAL':
    case 'SESSION_LUNCH_RECORDED':
    case 'SESSION_NOTE_ADDED':
    case 'SESSION_EDITED_MANUAL':
    case 'SESSION_DELETED_SOFT':
    case 'SESSION_OVERLAP_DETECTED':
      return `${event.type}:${event.sessionId}`;
    case 'REPORT_RANGE_SELECTED':
      return `REPORT_RANGE_SELECTED:${event.label}:${event.startAtMs}:${event.endAtMs}`;
    case 'REPORT_GENERATION_STARTED':
    case 'REPORT_GENERATION_FAILED':
    case 'REPORT_SHARE_REQUESTED':
    case 'REPORT_EMAIL_REQUESTED':
      return event.type;
    case 'REPORT_GENERATION_SUCCEEDED':
      return `REPORT_GENERATION_SUCCEEDED:${event.uri}`;
    case 'REPORT_MARKED_AS_WEEKLY_DELIVERED':
      return `REPORT_MARKED_AS_WEEKLY_DELIVERED:${event.weekId}`;
    case 'ADMIN_ACCESS_VALIDATION_STARTED':
    case 'ADMIN_ACCESS_GRANTED':
    case 'ADMIN_ACCESS_DENIED':
    case 'ADMIN_ACCESS_LOCKED':
      return event.type;
    case 'SETTINGS_REHYDRATED':
      return `SETTINGS_REHYDRATED:${event.settings.dailyReminderTime}:${event.settings.employeeName}`;
    case 'AUDIT_LOGS_REHYDRATED':
      return `AUDIT_LOGS_REHYDRATED:${event.entries.length}`;
    case 'SYSTEM_LOGS_REHYDRATED':
      return `SYSTEM_LOGS_REHYDRATED:${event.entries.length}`;
    case 'APP_BOOT_STARTED':
    case 'APP_REHYDRATION_COMPLETED':
    case 'DB_READY':
    case 'PERMISSIONS_LOCATION_UPDATED':
    case 'PERMISSIONS_NOTIFICATIONS_UPDATED':
    case 'GEOFENCE_MONITORING_STARTED':
    case 'GEOFENCE_MONITORING_STOPPED':
    case 'BACKGROUND_TASK_REGISTERED':
    case 'BACKGROUND_TASK_UNREGISTERED':
    case 'BACKGROUND_TASK_STARTED':
    case 'BACKGROUND_TASK_FINISHED':
    case 'SYSTEM_ERROR_RECORDED':
    case 'FEEDBACK_ENQUEUED':
    case 'FEEDBACK_DISMISSED':
    case 'SYSTEM_LOG_APPENDED':
    case 'AUDIT_LOG_APPENDED':
      return event.type;
    default:
      return JSON.stringify(event);
  }
}

function enqueueRetry(event: RetryRequestedEvent): void {
  const key = buildRetryKey(event.originalEvent);

  if (!retryQueueKeys.has(key)) {
    retryQueue.push(event);
    retryQueueKeys.add(key);
    return;
  }

  const index = retryQueue.findIndex(
    (item) => buildRetryKey(item.originalEvent) === key
  );

  if (index >= 0 && retryQueue[index].retryCount < event.retryCount) {
    retryQueue[index] = event;
  }
}

function dequeueRetry(key: string): RetryRequestedEvent | null {
  const index = retryQueue.findIndex(
    (item) => buildRetryKey(item.originalEvent) === key
  );

  if (index < 0) {
    return null;
  }

  const [item] = retryQueue.splice(index, 1);
  retryQueueKeys.delete(key);
  return item ?? null;
}

function removeRetryKey(key: string): void {
  retryQueueKeys.delete(key);
  const index = retryQueue.findIndex(
    (item) => buildRetryKey(item.originalEvent) === key
  );
  if (index >= 0) {
    retryQueue.splice(index, 1);
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function createSystemLogEntry(
  partial: Partial<SystemLogRecord> & {
    category: string;
    severity: string;
    message: string;
  },
  state: WorkTrackerCanonicalState
): SystemLogRecord {
  return {
    id: partial.id ?? state.domain.audit.systemLogs.length + 1,
    timestampMs: partial.timestampMs ?? Date.now(),
    timestampIso: partial.timestampIso ?? nowIso(),
    color: partial.color ?? 'BLANCO',
    category: partial.category,
    severity: partial.severity,
    message: partial.message,
    metadataJson: partial.metadataJson ?? null,
  };
}

function createAuditLogEntry(
  partial: Partial<AuditLogRecord> & {
    sessionId: number | null;
    actionType: string;
    details: string;
  },
  state: WorkTrackerCanonicalState
): AuditLogRecord {
  return {
    id: partial.id ?? state.domain.audit.auditLogs.length + 1,
    sessionId: partial.sessionId,
    actionType: partial.actionType,
    details: partial.details,
    timestampMs: partial.timestampMs ?? Date.now(),
  };
}

function getSessionOrThrow(
  state: WorkTrackerCanonicalState,
  sessionId: number
): SessionRecord {
  const session = state.domain.sessions.byId[String(sessionId)];
  if (!session) {
    throw new Error(`La sesión ${sessionId} no existe en el estado canónico.`);
  }
  return session;
}

function isBootRehydrating(state: WorkTrackerCanonicalState): boolean {
  return state.meta.bootState.isRehydrating;
}

function isRetryableBaseEvent(event: BaseDomainEvent): boolean {
  switch (event.type) {
    case 'APP_REHYDRATION_COMPLETED':
    case 'DB_READY':
    case 'SYSTEM_ERROR_RECORDED':
    case 'FEEDBACK_ENQUEUED':
    case 'FEEDBACK_DISMISSED':
    case 'SYSTEM_LOGS_REHYDRATED':
    case 'AUDIT_LOGS_REHYDRATED':
    case 'SETTINGS_REHYDRATED':
      return false;
    default:
      return true;
  }
}

function serializeError(error: unknown): string | null {
  try {
    if (error instanceof Error) {
      return JSON.stringify(
        {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        null,
        0
      );
    }
    return JSON.stringify({ error: String(error) });
  } catch {
    return null;
  }
}

function buildSessionCreatedEventFromSnapshot(
  session: SessionRecord
): Extract<DomainEvent, { type: 'SESSION_CREATED' }> {
  const baseDomainStatus =
    session.lifecycle.domainStatus === 'travel' ? 'travel' : 'pending_arrival';

  return {
    type: 'SESSION_CREATED',
    session: {
      id: session.id,
      declaredStartAtMs: session.declaredStartAtMs,
      domainStatus: baseDomainStatus,
      actualStartAtMs: null,
      endAtMs: null,
      lifecycle: {
        domainStatus: baseDomainStatus,
        isDeleted: false,
        isManualEdit: session.lifecycle.isManualEdit,
        locationConfirmed: false,
      },
      destination: {
        address: session.destination.address,
        clientName: session.destination.clientName,
        targetLatitude: session.destination.targetLatitude,
        targetLongitude: session.destination.targetLongitude,
        setupLatitude: session.destination.setupLatitude,
        setupLongitude: session.destination.setupLongitude,
      },
      capturedLocation: {
        latitude: session.capturedLocation.latitude,
        longitude: session.capturedLocation.longitude,
      },
      lunch: {
        taken: false,
        startAtMs: null,
        endAtMs: null,
        deductedMinutes: null,
      },
      notes: {
        manualNote: session.notes.manualNote,
      },
      bookkeeping: {
        dateString: session.bookkeeping.dateString,
      },
    },
    address: session.destination.address ?? undefined,
    clientName: session.destination.clientName ?? undefined,
    targetLatitude: session.destination.targetLatitude ?? undefined,
    targetLongitude: session.destination.targetLongitude ?? undefined,
    setupLatitude: session.destination.setupLatitude ?? undefined,
    setupLongitude: session.destination.setupLongitude ?? undefined,
    manualNote: session.notes.manualNote ?? undefined,
    dateString: session.bookkeeping.dateString ?? undefined,
  };
}

function buildReportPayload(state: WorkTrackerCanonicalState) {
  const selectedRange = state.views.report.selectedRange;
  if (!selectedRange.startAtMs || !selectedRange.endAtMs || !selectedRange.label) {
    throw new Error('No existe un rango de reporte válido seleccionado.');
  }

  const { hourlyRate, overtimeMultiplier, employeeName, employerName, companyEmail } =
    state.domain.settings;

  const sessions = state.domain.sessions.order
    .map((id) => state.domain.sessions.byId[String(id)])
    .filter((session): session is SessionRecord => Boolean(session))
    .filter((session) => !session.lifecycle.isDeleted && session.lifecycle.domainStatus !== 'deleted')
    .filter(
      (session) =>
        session.declaredStartAtMs >= selectedRange.startAtMs! &&
        session.declaredStartAtMs <= selectedRange.endAtMs!
    );

  let totalHours = 0;
  let totalOvertime = 0;
  let totalEarnings = 0;

  const rows = sessions.map((session) => {
    const startTime = session.actualStartAtMs ?? session.declaredStartAtMs;
    const endTime = session.endAtMs ?? Date.now();

    const durationMs = calculateSessionDuration(
      startTime,
      endTime,
      session.lunch.taken ? 1 : 0,
      session.lunch.startAtMs ?? undefined,
      session.lunch.endAtMs ?? undefined
    );

    const hours = durationMs / (1000 * 60 * 60);
    const { totalPay, overtimeHours } = calculatePay(
      hours,
      hourlyRate,
      overtimeMultiplier
    );

    totalHours += hours;
    totalOvertime += overtimeHours;
    totalEarnings += totalPay;

    const wasAutoCheckout = state.domain.audit.auditLogs.some(
      (log) =>
        log.sessionId === session.id &&
        typeof log.actionType === 'string' &&
        log.actionType.includes('AUTO_CHECKOUT')
    );

    return {
      date: formatDate(startTime),
      client: session.destination.clientName ?? 'General',
      address: session.destination.address ?? '',
      notes: session.notes.manualNote ?? '',
      start: formatTime(startTime),
      end: session.endAtMs ? formatTime(session.endAtMs) : 'En curso',
      lunch: session.lunch.taken ? 'Sí' : 'No',
      total: hours.toFixed(2),
      pay: `$${totalPay.toFixed(2)}`,
      status: session.lifecycle.domainStatus,
      isGeofenceIn: Boolean(session.actualStartAtMs && session.lifecycle.locationConfirmed),
      isGeofenceOut: wasAutoCheckout,
    };
  });

  const logs = state.domain.audit.auditLogs
    .filter(
      (log) =>
        log.timestampMs >= selectedRange.startAtMs! &&
        log.timestampMs <= selectedRange.endAtMs!
    )
    .map((log) => ({
      action_type: log.actionType,
      details: log.details,
      timestamp: log.timestampMs,
    }));

  return {
    payload: {
      settings: {
        id: 1,
        employeeName,
        employerName,
      },
      rangeTitle: selectedRange.label,
      totalHours,
      totalOvertime,
      totalEarnings,
      rows,
      logs,
    },
    companyEmail,
    employeeName,
  };
}

/**
 * ============================================================================
 * BOOT / REHIDRATACIÓN
 * ============================================================================
 */
async function handleAppBootStarted(
  _event: Extract<DomainEvent, { type: 'APP_BOOT_STARTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const events: DomainEvent[] = [];

  const [locationPermissions, notificationsPermission] = await Promise.all([
    runtime.location.requestPermissions(),
    runtime.notifications.requestPermissions(),
  ]);

  events.push({
    type: 'PERMISSIONS_LOCATION_UPDATED',
    foreground: locationPermissions.foreground,
    background: locationPermissions.background,
  });

  events.push({
    type: 'PERMISSIONS_NOTIFICATIONS_UPDATED',
    notifications: notificationsPermission,
  });

  const [sessions, settings, auditLogs, systemLogs] = await Promise.all([
    loadSessionRecordsSnapshot(),
    loadSettingsRecordSnapshot(),
    loadAuditLogRecordsSnapshot(),
    loadSystemLogRecordsSnapshot(),
  ]);

  if (settings) {
    events.push({
      type: 'SETTINGS_REHYDRATED',
      settings,
    });
  }

  if (auditLogs.length > 0) {
    events.push({
      type: 'AUDIT_LOGS_REHYDRATED',
      entries: auditLogs,
    });
  }

  if (systemLogs.length > 0) {
    events.push({
      type: 'SYSTEM_LOGS_REHYDRATED',
      entries: systemLogs,
    });
  }

  for (const session of sessions) {
    events.push(buildSessionCreatedEventFromSnapshot(session));

    if (session.lifecycle.domainStatus === 'travel') {
      events.push({
        type: 'SESSION_TRANSIT_STARTED',
        sessionId: session.id,
      });
    }

    if (
      session.actualStartAtMs &&
      ['active', 'completed', 'deleted'].includes(session.lifecycle.domainStatus)
    ) {
      if (session.lifecycle.locationConfirmed) {
        events.push({
          type: 'SESSION_AUTO_CHECKIN_GPS',
          sessionId: session.id,
          actualStartAtMs: session.actualStartAtMs,
        });
      } else {
        events.push({
          type: 'SESSION_ARRIVAL_CONFIRMED_MANUAL',
          sessionId: session.id,
          actualStartAtMs: session.actualStartAtMs,
        });
      }
    }

    if (session.lunch.taken) {
      events.push({
        type: 'SESSION_LUNCH_RECORDED',
        sessionId: session.id,
        lunchStartAtMs: session.lunch.startAtMs ?? undefined,
        lunchEndAtMs: session.lunch.endAtMs ?? undefined,
        deductedMinutes: session.lunch.deductedMinutes ?? undefined,
      });
    }

    if (session.endAtMs) {
      const wasAutoCheckout = auditLogs.some(
        (log) =>
          log.sessionId === session.id &&
          typeof log.actionType === 'string' &&
          log.actionType.includes('AUTO_CHECKOUT')
      );

      if (wasAutoCheckout) {
        events.push({
          type: 'SESSION_AUTO_CHECKOUT_GPS',
          sessionId: session.id,
          endAtMs: session.endAtMs,
        });
      } else {
        events.push({
          type: 'SESSION_CLOSED_MANUAL',
          sessionId: session.id,
          endAtMs: session.endAtMs,
        });
      }
    }

    if (session.lifecycle.isDeleted || session.lifecycle.domainStatus === 'deleted') {
      events.push({
        type: 'SESSION_DELETED_SOFT',
        sessionId: session.id,
      });
    }

    if (session.notes.manualNote && session.notes.manualNote.trim()) {
      events.push({
        type: 'SESSION_NOTE_ADDED',
        sessionId: session.id,
        note: session.notes.manualNote,
      });
    }
  }

  if (notificationsPermission === 'granted') {
    await runtime.notifications.scheduleDailyReminder(
      settings?.dailyReminderTime ?? nextState.domain.settings.dailyReminderTime
    );
  }

  const openOperationalSession = sessions.find(
    (session) =>
      !session.lifecycle.isDeleted &&
      ['pending_arrival', 'travel', 'active'].includes(session.lifecycle.domainStatus) &&
      session.destination.targetLatitude !== null &&
      session.destination.targetLongitude !== null
  );

  if (openOperationalSession) {
    const radiusMeters =
      settings?.toleranceRadiusMeters ?? nextState.domain.settings.toleranceRadiusMeters;

    await runtime.location.startMonitoringArrival(
      'WORK_ZONE',
      openOperationalSession.destination.targetLatitude as number,
      openOperationalSession.destination.targetLongitude as number,
      radiusMeters
    );

    events.push({
      type: 'GEOFENCE_MONITORING_STARTED',
      taskName: 'GEOFENCE_TRACKING_TASK',
      identifier: 'WORK_ZONE',
      latitude: openOperationalSession.destination.targetLatitude as number,
      longitude: openOperationalSession.destination.targetLongitude as number,
      radiusMeters,
    });
  }

  events.push({
    type: 'APP_REHYDRATION_COMPLETED',
    timestampMs: Date.now(),
  });

  events.push({
    type: 'SYSTEM_LOG_APPENDED',
    entry: createSystemLogEntry(
      {
        color: 'VERDE',
        category: 'SERVICIOS_ACTIVOS',
        severity: 'INFO',
        message:
          `Rehidratación completada desde SQLite. ` +
          `Sesiones: ${sessions.length}. ` +
          `Settings persistidos: ${settings ? 'sí' : 'no'}. ` +
          `Audit logs: ${auditLogs.length}. ` +
          `System logs: ${systemLogs.length}.`,
      },
      nextState
    ),
  });

  return events;
}

/**
 * ============================================================================
 * SESSION EFFECTS
 * ============================================================================
 */
async function handleSessionCreated(
  event: Extract<DomainEvent, { type: 'SESSION_CREATED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const secondaryEvents: DomainEvent[] = [];
  const createdSession = getSessionOrThrow(nextState, event.session.id);

  await runtime.sessionStore.createSession(createdSession);

  const latitude = createdSession.destination.targetLatitude;
  const longitude = createdSession.destination.targetLongitude;
  const radius = nextState.domain.settings.toleranceRadiusMeters;

  if (latitude !== null && longitude !== null) {
    await runtime.location.startMonitoringArrival(
      'WORK_ZONE',
      latitude,
      longitude,
      radius
    );

    secondaryEvents.push({
      type: 'GEOFENCE_MONITORING_STARTED',
      taskName: 'GEOFENCE_TRACKING_TASK',
      identifier: 'WORK_ZONE',
      latitude,
      longitude,
      radiusMeters: radius,
    });
  }

  secondaryEvents.push({
    type: 'AUDIT_LOG_APPENDED',
    entry: createAuditLogEntry(
      {
        sessionId: createdSession.id,
        actionType: 'SESSION_CREATED',
        details: `Sesión creada para destino: ${createdSession.destination.address ?? 'sin dirección'}`,
      },
      nextState
    ),
  });

  secondaryEvents.push({
    type: 'SYSTEM_LOG_APPENDED',
    entry: createSystemLogEntry(
      {
        color: 'VERDE',
        category: 'OPERACION_EXITOSA',
        severity: 'INFO',
        message: 'Sesión creada y persistida correctamente.',
      },
      nextState
    ),
  });

  return secondaryEvents;
}

async function handleSessionTransitStarted(
  event: Extract<DomainEvent, { type: 'SESSION_TRANSIT_STARTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  await runtime.logging.appendAuditLog(
    createAuditLogEntry(
      {
        sessionId: session.id,
        actionType: 'SESSION_TRANSIT_STARTED',
        details: 'La sesión pasó a estado de tránsito.',
      },
      nextState
    )
  );

  await runtime.notifications.notifyImmediate(
    'En tránsito',
    'La jornada cambió a estado de traslado.',
    { sessionId: session.id, action: 'SESSION_TRANSIT_STARTED' }
  );

  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'AZUL',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `Sesión #${session.id} actualizada a tránsito.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionArrivalConfirmedManual(
  event: Extract<DomainEvent, { type: 'SESSION_ARRIVAL_CONFIRMED_MANUAL' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  await runtime.logging.appendAuditLog(
    createAuditLogEntry(
      {
        sessionId: session.id,
        actionType: 'SESSION_ARRIVAL_CONFIRMED_MANUAL',
        details: 'Llegada confirmada manualmente.',
      },
      nextState
    )
  );

  await runtime.notifications.notifyImmediate(
    'Llegada confirmada',
    'La jornada fue activada manualmente.',
    { sessionId: session.id, action: 'SESSION_ARRIVAL_CONFIRMED_MANUAL' }
  );

  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `Llegada manual confirmada para sesión #${session.id}.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionAutoCheckinGps(
  event: Extract<DomainEvent, { type: 'SESSION_AUTO_CHECKIN_GPS' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  await runtime.location.clearLastExitTimestamp();

  await runtime.logging.appendAuditLog(
    createAuditLogEntry(
      {
        sessionId: session.id,
        actionType: 'SESSION_AUTO_CHECKIN_GPS',
        details: 'Llegada confirmada automáticamente mediante GPS.',
      },
      nextState
    )
  );

  await runtime.notifications.notifyImmediate(
    'Llegaste al sitio',
    'Auto Check-in (GPS) realizado correctamente.',
    { sessionId: session.id, action: 'SESSION_AUTO_CHECKIN_GPS' }
  );

  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `Auto Check-in GPS registrado para sesión #${session.id}.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionExitDetected(
  event: Extract<DomainEvent, { type: 'SESSION_EXIT_DETECTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  await runtime.location.setLastExitTimestamp(event.exitTimestampMs);

  await runtime.logging.appendAuditLog(
    createAuditLogEntry(
      {
        sessionId: session.id,
        actionType: 'SESSION_EXIT_DETECTED',
        details: `Salida del área detectada a las ${formatTime(event.exitTimestampMs)}.`,
      },
      nextState
    )
  );

  await runtime.notifications.notifyImmediate(
    'Salida detectada',
    'Se detectó una salida del área de trabajo.',
    { sessionId: session.id, action: 'SESSION_EXIT_DETECTED' }
  );

  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'AMARILLO',
          category: 'ADVERTENCIA',
          severity: 'WARN',
          message: `Salida detectada para sesión #${session.id}.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionExitResolvedContinue(
  event: Extract<DomainEvent, { type: 'SESSION_EXIT_RESOLVED_CONTINUE' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  await runtime.location.clearLastExitTimestamp();

  await runtime.logging.appendAuditLog(
    createAuditLogEntry(
      {
        sessionId: session.id,
        actionType: 'SESSION_EXIT_RESOLVED_CONTINUE',
        details: 'La salida detectada fue resuelta y la jornada continuó.',
      },
      nextState
    )
  );

  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'AZUL',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `La sesión #${session.id} continúa activa tras la salida detectada.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionAutoCheckoutGps(
  event: Extract<DomainEvent, { type: 'SESSION_AUTO_CHECKOUT_GPS' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  await runtime.sessionStore.closeSession(session.id, event.endAtMs);
  await runtime.location.stopMonitoring();

  await runtime.logging.appendAuditLog(
    createAuditLogEntry(
      {
        sessionId: session.id,
        actionType: 'SESSION_AUTO_CHECKOUT_GPS',
        details: 'La jornada fue cerrada automáticamente por GPS.',
      },
      nextState
    )
  );

  await runtime.notifications.notifyImmediate(
    'Jornada finalizada',
    'Tu sesión se cerró automáticamente.',
    { sessionId: session.id, action: 'SESSION_AUTO_CHECKOUT_GPS' }
  );

  return [
    {
      type: 'GEOFENCE_MONITORING_STOPPED',
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'AMARILLO',
          category: 'ADVERTENCIA',
          severity: 'WARN',
          message: `Auto Check-out GPS ejecutado para sesión #${session.id}.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionClosedManual(
  event: Extract<DomainEvent, { type: 'SESSION_CLOSED_MANUAL' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  await runtime.sessionStore.closeSession(session.id, event.endAtMs);
  await runtime.location.stopMonitoring();

  await runtime.logging.appendAuditLog(
    createAuditLogEntry(
      {
        sessionId: session.id,
        actionType: 'SESSION_CLOSED_MANUAL',
        details: 'La jornada fue cerrada manualmente.',
      },
      nextState
    )
  );

  await runtime.notifications.notifyImmediate(
    'Jornada cerrada',
    'La jornada fue finalizada manualmente.',
    { sessionId: session.id, action: 'SESSION_CLOSED_MANUAL' }
  );

  return [
    {
      type: 'GEOFENCE_MONITORING_STOPPED',
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `Sesión #${session.id} cerrada manualmente.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionLunchRecorded(
  event: Extract<DomainEvent, { type: 'SESSION_LUNCH_RECORDED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  const lunchStartAtMs =
    event.lunchStartAtMs ?? session.lunch.startAtMs ?? Date.now();

  const deductedMinutes =
    event.deductedMinutes ?? session.lunch.deductedMinutes ?? 60;

  const lunchEndAtMs =
    event.lunchEndAtMs ??
    session.lunch.endAtMs ??
    lunchStartAtMs + deductedMinutes * 60 * 1000;

  await runtime.sessionStore.updateLunch(session.id, lunchStartAtMs, lunchEndAtMs);

  return [
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'SESSION_LUNCH_RECORDED',
          details: `Almuerzo registrado por ${deductedMinutes.toString()} minutos.`,
        },
        nextState
      ),
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'AZUL',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `Almuerzo registrado para sesión #${session.id}.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionEditedManual(
  event: Extract<DomainEvent, { type: 'SESSION_EDITED_MANUAL' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  await runtime.sessionStore.updateSessionManual(
    session.id,
    event.startTime,
    event.endTime,
    event.note
  );

  return [
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'SESSION_EDITED_MANUAL',
          details: `Edición manual aplicada. Nota: ${event.note}`,
        },
        nextState
      ),
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'AZUL',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `Sesión #${session.id} actualizada manualmente.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionDeletedSoft(
  event: Extract<DomainEvent, { type: 'SESSION_DELETED_SOFT' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  await runtime.sessionStore.deleteSession(session.id);

  return [
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'SESSION_DELETED_SOFT',
          details: 'La sesión fue eliminada lógicamente.',
        },
        nextState
      ),
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'ROJO',
          category: 'ACCION_DESTRUCTIVA',
          severity: 'WARN',
          message: `Sesión #${session.id} marcada como eliminada.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionNoteAdded(
  event: Extract<DomainEvent, { type: 'SESSION_NOTE_ADDED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const session = getSessionOrThrow(nextState, event.sessionId);

  await runtime.logging.appendAuditLog(
    createAuditLogEntry(
      {
        sessionId: session.id,
        actionType: 'SESSION_NOTE_ADDED',
        details: `Nota agregada: ${event.note}`,
      },
      nextState
    )
  );

  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'AZUL',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `Nota agregada a la sesión #${session.id}.`,
        },
        nextState
      ),
    },
  ];
}

/**
 * ============================================================================
 * REPORT EFFECTS
 * ============================================================================
 */
async function handleReportGenerationStarted(
  _event: Extract<DomainEvent, { type: 'REPORT_GENERATION_STARTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const { payload } = buildReportPayload(nextState);
  const uri = await runtime.reports.generatePdf(payload);

  if (!uri) {
    return [
      {
        type: 'REPORT_GENERATION_FAILED',
      },
      {
        type: 'SYSTEM_LOG_APPENDED',
        entry: createSystemLogEntry(
          {
            color: 'ROJO',
            category: 'ERROR_CRITICO',
            severity: 'ERROR',
            message: 'Falló la generación del reporte PDF.',
          },
          nextState
        ),
      },
    ];
  }

  return [
    {
      type: 'REPORT_GENERATION_SUCCEEDED',
      uri,
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: 'Reporte PDF generado correctamente.',
        },
        nextState
      ),
    },
  ];
}

async function handleReportShareRequested(
  _event: Extract<DomainEvent, { type: 'REPORT_SHARE_REQUESTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const uri = nextState.runtime.background.weeklyReport.lastGeneratedUri;

  if (!uri) {
    return [
      {
        type: 'SYSTEM_LOG_APPENDED',
        entry: createSystemLogEntry(
          {
            color: 'AMARILLO',
            category: 'ADVERTENCIA',
            severity: 'WARN',
            message: 'No existe un PDF generado para compartir.',
          },
          nextState
        ),
      },
    ];
  }

  await runtime.reports.sharePdf(uri);

  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: 'Reporte compartido correctamente.',
        },
        nextState
      ),
    },
  ];
}

async function handleReportEmailRequested(
  _event: Extract<DomainEvent, { type: 'REPORT_EMAIL_REQUESTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const uri = nextState.runtime.background.weeklyReport.lastGeneratedUri;

  if (!uri) {
    return [
      {
        type: 'SYSTEM_LOG_APPENDED',
        entry: createSystemLogEntry(
          {
            color: 'AMARILLO',
            category: 'ADVERTENCIA',
            severity: 'WARN',
            message: 'No existe un PDF generado para enviar por correo.',
          },
          nextState
        ),
      },
    ];
  }

  const { companyEmail, employeeName } = buildReportPayload(nextState);
  await runtime.reports.sendByEmail(uri, companyEmail, employeeName);

  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: 'Reporte enviado por correo correctamente.',
        },
        nextState
      ),
    },
  ];
}

/**
 * ============================================================================
 * SECURITY / SETTINGS / LOGGING EFFECTS
 * ============================================================================
 */
async function handleAdminAccessValidationStarted(
  event: ExtendedDomainEvent,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const pin = 'pin' in event && typeof event.pin === 'string' ? event.pin.trim() : '';
  const isValid = await runtime.security.validateAdminPin(pin);

  if (isValid) {
    return [
      {
        type: 'ADMIN_ACCESS_GRANTED',
        timestampMs: Date.now(),
      },
      {
        type: 'SYSTEM_LOG_APPENDED',
        entry: createSystemLogEntry(
          {
            color: 'VERDE',
            category: 'PERMISOS_CONCEDIDOS',
            severity: 'INFO',
            message: 'Zona administrativa desbloqueada correctamente.',
          },
          nextState
        ),
      },
    ];
  }

  return [
    {
      type: 'ADMIN_ACCESS_DENIED',
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'ROJO',
          category: 'ADVERTENCIA',
          severity: 'WARN',
          message: 'Intento de acceso administrativo fallido.',
        },
        nextState
      ),
    },
  ];
}

async function handleSettingsSaveRequested(
  event: SettingsSaveRequestedEvent,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  await runtime.sessionStore.saveSettings(event.settings);
  await runtime.notifications.scheduleDailyReminder(event.settings.dailyReminderTime);

  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: 'Configuración guardada y recordatorio diario reprogramado.',
        },
        nextState
      ),
    },
  ];
}

async function handleSystemLogAppended(
  event: Extract<DomainEvent, { type: 'SYSTEM_LOG_APPENDED' }>,
  _prevState: WorkTrackerCanonicalState,
  _nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const secondaryEvents: DomainEvent[] = [];

  await runtime.logging.appendSystemLog(event.entry);

  const feedbackPayload = runtime.logging.mapLogToFeedback(event.entry);

  if (feedbackPayload) {
    secondaryEvents.push({
      type: 'FEEDBACK_ENQUEUED',
      feedback: feedbackPayload,
    } as any);
  }

  return secondaryEvents;
}

async function handleAuditLogAppended(
  event: Extract<DomainEvent, { type: 'AUDIT_LOG_APPENDED' }>,
  _prevState: WorkTrackerCanonicalState,
  _nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  await runtime.logging.appendAuditLog(event.entry);
  return [];
}

type InternalEffectHandler = (
  event: any,
  prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
) => Promise<DomainEvent[]>;

const handlers: Record<string, InternalEffectHandler> = {
  APP_BOOT_STARTED: handleAppBootStarted,

  SESSION_CREATED: handleSessionCreated,
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

  REPORT_GENERATION_STARTED: handleReportGenerationStarted,
  REPORT_SHARE_REQUESTED: handleReportShareRequested,
  REPORT_EMAIL_REQUESTED: handleReportEmailRequested,

  ADMIN_ACCESS_VALIDATION_STARTED: handleAdminAccessValidationStarted,

  SETTINGS_SAVE_REQUESTED: handleSettingsSaveRequested,

  SYSTEM_LOG_APPENDED: handleSystemLogAppended,
  AUDIT_LOG_APPENDED: handleAuditLogAppended,
};

export async function executeEffects(
  event: DomainEvent,
  prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const handler = handlers[event.type];

  if (!handler) {
    try {
      removeRetryKey(buildRetryKey(event as any));
    } catch {
      // noop
    }
    return [];
  }

  try {
    const secondaryEvents = await handler(event as any, prevState, nextState, runtime);

    try {
      removeRetryKey(buildRetryKey(event as any));
    } catch {
      // noop
    }

    return Array.isArray(secondaryEvents) ? secondaryEvents : [];
  } catch (error) {
    const output: DomainEvent[] = [
      {
        type: 'SYSTEM_ERROR_RECORDED',
        entry: {
          id: nextState.domain.audit.systemLogs.length + 1,
          timestampMs: Date.now(),
          timestampIso: nowIso(),
          color: 'ROJO',
          category: 'ERROR_CRITICO',
          severity: 'ERROR',
          message: `Error ejecutando effects para ${event.type}.`,
          metadataJson: serializeError(error),
        },
      } as any,
    ];

    try {
      const currentRetryCount =
        'retryCount' in (event as any) && typeof (event as any).retryCount === 'number'
          ? (event as any).retryCount
          : 0;

      const nextRetryCount = currentRetryCount + 1;

      if (isRetryableBaseEvent(event as any) && nextRetryCount <= MAX_RETRY_ATTEMPTS) {
        const retryEvent = {
          type: 'EVENT_RETRY_REQUESTED',
          originalEvent: event,
          retryCount: nextRetryCount,
        } as any;

        enqueueRetry(retryEvent);
        output.unshift(retryEvent);
      }
    } catch {
      // noop
    }

    return output;
  }
}
