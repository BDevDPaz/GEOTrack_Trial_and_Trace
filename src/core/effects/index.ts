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

/**                                                                                                                                                                              
 * =============================================================================
 * UTILIDADES DE INFRAESTRUCTURA PARA EFFECTS
 * =============================================================================
 */

function getSessionOrThrow(
  state: WorkTrackerCanonicalState,
  sessionId: number
): SessionRecord {
  const session = state.domain.sessions.byId[String(sessionId)];
  if (!session) {
    throw new Error(`Sesión #${sessionId} no encontrada en el estado.`);
  }
  return session;
}

function isBootRehydrating(state: WorkTrackerCanonicalState): boolean {
  return state.meta.bootState.isRehydrating;
}

function createAuditLogEntry(
  partial: Partial<AuditLogRecord> & { sessionId: number | null; actionType: string; details: string },
  state: WorkTrackerCanonicalState
): AuditLogRecord {
  return {
    id: state.domain.audit.auditLogs.length + 1,
    sessionId: partial.sessionId,
    actionType: partial.actionType,
    details: partial.details,
    timestampMs: now(),
  };
}

function createSystemLogEntry(
  partial: Partial<SystemLogRecord> & { color: string; category: string; severity: string; message: string },
  state: WorkTrackerCanonicalState
): SystemLogRecord {
  return {
    id: state.domain.audit.systemLogs.length + 1,
    timestampMs: now(),
    timestampIso: nowIso(),
    color: partial.color,
    category: partial.category,
    severity: partial.severity,
    message: partial.message,
    metadataJson: partial.metadataJson ?? null,
  };
}

/**
 * =============================================================================
 * HANDLERS DE EFFECTS
 * =============================================================================
 */

async function handleAppBootStarted(
  _event: Extract<DomainEvent, { type: 'APP_BOOT_STARTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const secondaryEvents: DomainEvent[] = [];

  const appendBootWarning = (message: string, error: unknown) => {
    secondaryEvents.push({
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'AMARILLO',
          category: 'SISTEMA',
          severity: 'WARN',
          message,
          metadataJson: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
        nextState
      ),
    });
  };

  try {
    const settings = await runtime.sessionStore.getSettings();
    if (settings) {
      secondaryEvents.push({
        type: 'SETTINGS_REHYDRATED',
        settings,
      });
    }
  } catch (error) {
    appendBootWarning('No se pudieron rehidratar settings durante el arranque.', error);
  }

  try {
    const sessions = await loadSessionRecordsSnapshot();
    secondaryEvents.push({
      type: 'SESSIONS_REHYDRATED',
      sessions,
    });
  } catch (error) {
    appendBootWarning('No se pudieron rehidratar sesiones durante el arranque.', error);
  }

  try {
    const systemLogs = await loadSystemLogRecordsSnapshot();
    secondaryEvents.push({
      type: 'SYSTEM_LOGS_REHYDRATED',
      entries: systemLogs,
    });
  } catch (error) {
    appendBootWarning('No se pudieron rehidratar system logs durante el arranque.', error);
  }

  try {
    const auditLogs = await runtime.logging.getAuditLogs();
    if (auditLogs) {
      secondaryEvents.push({
        type: 'AUDIT_LOGS_REHYDRATED',
        entries: auditLogs,
      });
    }
  } catch (error) {
    appendBootWarning('No se pudieron rehidratar audit logs durante el arranque.', error);
  }

  secondaryEvents.push({
    type: 'APP_REHYDRATION_COMPLETED',
    timestampMs: now(),
  });

  secondaryEvents.push({
    type: 'SYSTEM_LOG_APPENDED',
    entry: createSystemLogEntry(
      {
        color: 'AZUL',
        category: 'SISTEMA',
        severity: 'INFO',
        message: 'Rehidratación de estado completada.',
      },
      nextState
    ),
  });

  return secondaryEvents;
}

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

  // PR3: Detección de solapamiento
  const hasOverlap = await runtime.sessionStore.checkOverlap(
      createdSession.declaredStartAtMs,
      createdSession.endAtMs ?? 0,
      createdSession.id
  );

  if (hasOverlap) {
      secondaryEvents.push({ type: 'SESSION_OVERLAP_DETECTED', sessionId: createdSession.id });
  }

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

  return secondaryEvents;
}

async function handleSessionDestinationSet(
  event: Extract<DomainEvent, { type: 'SESSION_DESTINATION_SET' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  if (isBootRehydrating(nextState)) {
    return [];
  }

  const secondaryEvents: DomainEvent[] = [];
  const session = getSessionOrThrow(nextState, event.sessionId);

  // Sincronizar DB
  await runtime.sessionStore.updateSessionManual(
      session.id,
      session.declaredStartAtMs,
      session.endAtMs,
      session.notes.manualNote ?? ''
  );

  const canMonitor =
    session.lifecycle.domainStatus === 'pending_arrival' ||
    session.lifecycle.domainStatus === 'travel' ||
    session.lifecycle.domainStatus === 'active';

  const latitude = session.destination.targetLatitude;
  const longitude = session.destination.targetLongitude;
  const radius = nextState.domain.settings.toleranceRadiusMeters;

  if (canMonitor && latitude !== null && longitude !== null) {
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
        sessionId: session.id,
        actionType: 'SESSION_DESTINATION_SET',
        details: `Destino actualizado: ${session.destination.address ?? 'sin dirección'}`,
      },
      nextState
    ),
  });

  return secondaryEvents;
}

async function handleGeofenceMonitoringStarted(
  event: Extract<DomainEvent, { type: 'GEOFENCE_MONITORING_STARTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  _runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'UBICACION',
          severity: 'INFO',
          message: `Monitoreo de geocerca iniciado (${event.identifier})`,
        },
        nextState
      ),
    },
  ];
}

async function handleGeofenceMonitoringStopped(
  _event: Extract<DomainEvent, { type: 'GEOFENCE_MONITORING_STOPPED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  await runtime.location.stopMonitoring();

  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'NARANJA',
          category: 'UBICACION',
          severity: 'INFO',
          message: 'Monitoreo de geocerca detenido.',
        },
        nextState
      ),
    },
  ];
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

  await runtime.sessionStore.updateStatus(session.id, 'travel');

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

  await runtime.sessionStore.confirmArrival(session.id, event.actualStartAtMs);

  return [
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'SESSION_ARRIVAL_CONFIRMED_MANUAL',
          details: 'Llegada confirmada manualmente.',
        },
        nextState
      ),
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `Llegada confirmada para sesión #${session.id}.`,
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

  // EFECTO: Actualizar base de datos
  await runtime.sessionStore.confirmArrival(session.id, event.actualStartAtMs);

  // EFECTO: Limpiar estado de salida de geocerca
  await runtime.location.clearLastExitTimestamp();

  // EFECTO: Notificar al usuario
  await runtime.notifications.notifyImmediate(
      '📍 Llegaste al sitio',
      'Auto Check-in (GPS) realizado. ¡Buen trabajo!',
      { sessionId: session.id, action: 'AUTO_CHECKIN_GPS' }
  );

  return [
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'AUTO_CHECKIN_GPS',
          details: `Auto Check-in (GPS) en: ${session.destination.address ?? 'ubicación desconocida'}`,
        },
        nextState
      ),
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `Auto Check-in registrado para sesión #${session.id}.`,
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

  // EFECTO: Persistir marca de salida en AsyncStorage para Failsafe
  await runtime.location.setLastExitTimestamp(event.exitTimestampMs);

  // EFECTO: Notificar al usuario (con botones de decisión en UI real)
  await runtime.notifications.notifyImmediate(
      '⚠️ Saliste del área de trabajo',
      '¿Terminaste tu jornada o vas a otro sitio?',
      { sessionId: session.id, action: 'CHECKOUT_DECISION' }
  );

  return [
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'GEOFENCE_EXIT',
          details: 'Salida del área de trabajo detectada.',
        },
        nextState
      ),
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'NARANJA',
          category: 'UBICACION',
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

  // EFECTO: Limpiar marca de salida ya que el usuario decidió seguir
  await runtime.location.clearLastExitTimestamp();

  return [
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'GEOFENCE_EXIT_RESOLVED',
          details: 'El usuario decidió continuar la sesión tras salida.',
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

  // EFECTO: Persistir cierre en DB
  await runtime.sessionStore.closeSession(session.id, event.endAtMs);

  // EFECTO: Detener monitoreo
  await runtime.location.stopMonitoring();

  // EFECTO: Notificar
  await runtime.notifications.notifyImmediate(
      'Jornada Finalizada 🏁',
      'Tu sesión se cerró automáticamente por inactividad.',
      { sessionId: session.id, action: 'AUTO_CHECKOUT_GPS' }
  );

  return [
    {
      type: 'GEOFENCE_MONITORING_STOPPED',
    },
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'AUTO_CHECKOUT_GPS',
          details: 'Auto Check-out (GPS) realizado tras inactividad prolongada.',
        },
        nextState
      ),
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'ROJO',
          category: 'OPERACION_EXITOSA',
          severity: 'INFO',
          message: `Auto Check-out registrado para sesión #${session.id}.`,
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

  // EFECTO: Persistir cierre
  await runtime.sessionStore.closeSession(session.id, event.endAtMs);

  // EFECTO: Detener monitoreo
  await runtime.location.stopMonitoring();

  return [
    {
      type: 'GEOFENCE_MONITORING_STOPPED',
    },
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'MANUAL_CHECKOUT',
          details: 'Cierre de sesión manual realizado.',
        },
        nextState
      ),
    },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'ROJO',
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

  if (event.lunchStartAtMs && event.lunchEndAtMs) {
      await runtime.sessionStore.updateLunch(session.id, event.lunchStartAtMs, event.lunchEndAtMs);
  }

  return [
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'LUNCH_RECORDED',
          details: 'Registro de almuerzo actualizado.',
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

  // PR3: Detección de solapamiento tras edición
  const hasOverlap = await runtime.sessionStore.checkOverlap(
      event.startTime,
      event.endTime ?? 0,
      session.id
  );

  const secondaryEvents: DomainEvent[] = [];

  if (hasOverlap) {
      secondaryEvents.push({ type: 'SESSION_OVERLAP_DETECTED', sessionId: session.id });
  }

  secondaryEvents.push({
    type: 'AUDIT_LOG_APPENDED',
    entry: createAuditLogEntry(
      {
        sessionId: session.id,
        actionType: 'SESSION_EDITED_MANUAL',
        details: 'La sesión fue editada manualmente.',
      },
      nextState
    ),
  });

  secondaryEvents.push({
    type: 'SYSTEM_LOG_APPENDED',
    entry: createSystemLogEntry(
      {
        color: 'AMARILLO',
        category: 'OPERACION_EXITOSA',
        severity: 'INFO',
        message: `Sesión #${session.id} editada correctamente.`,
      },
      nextState
    ),
  });

  return secondaryEvents;
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

  const isDeletingActive = nextState.domain.sessions.activeSessionId === null;
  const secondaryEvents: DomainEvent[] = [];

  if (isDeletingActive) {
    await runtime.location.stopMonitoring();
    secondaryEvents.push({ type: 'GEOFENCE_MONITORING_STOPPED' });
  }

  secondaryEvents.push({
    type: 'AUDIT_LOG_APPENDED',
    entry: createAuditLogEntry(
      {
        sessionId: session.id,
        actionType: 'SESSION_DELETED_SOFT',
        details: 'La sesión fue eliminada (soft delete).',
      },
      nextState
    ),
  });

  secondaryEvents.push({
    type: 'SYSTEM_LOG_APPENDED',
    entry: createSystemLogEntry(
      {
        color: 'ROJO',
        category: 'ADVERTENCIA',
        severity: 'WARN',
        message: `Sesión #${session.id} eliminada.`,
      },
      nextState
    ),
  });

  return secondaryEvents;
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

  // Sincronizar DB
  await runtime.sessionStore.updateSessionManual(
      session.id,
      session.declaredStartAtMs,
      session.endAtMs,
      event.note
  );

  return [
    {
      type: 'AUDIT_LOG_APPENDED',
      entry: createAuditLogEntry(
        {
          sessionId: session.id,
          actionType: 'SESSION_NOTE_ADDED',
          details: `Nota agregada: ${event.note}`,
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
          message: `Nota agregada a la sesión #${session.id}.`,
        },
        nextState
      ),
    },
  ];
}

async function handleSessionOverlapDetected(
  event: Extract<DomainEvent, { type: 'SESSION_OVERLAP_DETECTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
    const message = `¡Atención! La sesión #${event.sessionId} se solapa con otra existente.`;

    await runtime.notifications.notifyImmediate(
        'Solapamiento detectado ⚠️',
        message,
        { sessionId: event.sessionId, action: 'SESSION_OVERLAP_DETECTED' }
    );

    return [
        {
            type: 'SYSTEM_LOG_APPENDED',
            entry: createSystemLogEntry(
                {
                    color: 'NARANJA',
                    category: 'ADVERTENCIA',
                    severity: 'WARN',
                    message
                },
                nextState
            )
        }
    ];
}

async function handleReportShareRequested(
  _event: Extract<DomainEvent, { type: 'REPORT_SHARE_REQUESTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const uri = nextState.runtime.background.weeklyReport.lastGeneratedUri;
  if (!uri) return [];
  await runtime.reports.sharePdf(uri);
  return [];
}

async function handleReportEmailRequested(
  _event: Extract<DomainEvent, { type: 'REPORT_EMAIL_REQUESTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const uri = nextState.runtime.background.weeklyReport.lastGeneratedUri;
  if (!uri) return [];
  const companyEmail = nextState.domain.settings.companyEmail;
  const employeeName = nextState.domain.settings.employeeName;
  await runtime.reports.sendByEmail(uri, companyEmail, employeeName);
  return [];
}

async function handleDataRefreshRequested(
  _event: Extract<DomainEvent, { type: 'DATA_REFRESH_REQUESTED' }>,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const sessions = await loadSessionRecordsSnapshot();
  const systemLogs = await loadSystemLogRecordsSnapshot();
  const auditLogs = await runtime.logging.getAuditLogs();

  return [
    { type: 'SESSIONS_REHYDRATED', sessions },
    { type: 'SYSTEM_LOGS_REHYDRATED', entries: systemLogs },
    { type: 'AUDIT_LOGS_REHYDRATED', entries: auditLogs },
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'AZUL',
          category: 'SISTEMA',
          severity: 'INFO',
          message: 'Datos sincronizados desde DB.',
        },
        nextState
      ),
    },
  ];
}

async function handleAdminAccessValidationStarted(
  event: any,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  const pin = event.pin || '';
  const isValid = await runtime.security.validateAdminPin(pin);
  if (isValid) {
    return [{ type: 'ADMIN_ACCESS_GRANTED', timestampMs: now() }];
  }
  return [{ type: 'ADMIN_ACCESS_DENIED' }];
}

async function handleSystemLogAppended(
  event: Extract<DomainEvent, { type: 'SYSTEM_LOG_APPENDED' }>,
  _prevState: WorkTrackerCanonicalState,
  _nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  await runtime.logging.appendSystemLog(event.entry);
  return [];
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


async function handleOnboardingCompleted(
  _event: any,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  await runtime.sessionStore.saveSettings(nextState.domain.settings);
  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'SISTEMA',
          severity: 'INFO',
          message: 'Onboarding completado exitosamente.',
        },
        nextState
      ),
    }
  ];
}

async function handleDisclaimerAccepted(
  _event: any,
  _prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> {
  await runtime.sessionStore.saveSettings(nextState.domain.settings);
  return [
    {
      type: 'SYSTEM_LOG_APPENDED',
      entry: createSystemLogEntry(
        {
          color: 'VERDE',
          category: 'SISTEMA',
          severity: 'INFO',
          message: 'Disclaimer completado exitosamente.',
        },
        nextState
      ),
    }
  ];
}

const handlers: Record<string, any> = {
  ONBOARDING_COMPLETED: handleOnboardingCompleted,
  DISCLAIMER_ACCEPTED: handleDisclaimerAccepted,
  APP_BOOT_STARTED: handleAppBootStarted,
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
  SESSION_OVERLAP_DETECTED: handleSessionOverlapDetected,
  REPORT_SHARE_REQUESTED: handleReportShareRequested,
  REPORT_EMAIL_REQUESTED: handleReportEmailRequested,
  ADMIN_ACCESS_VALIDATION_STARTED: handleAdminAccessValidationStarted,
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
  if (!handler) return [];

  try {
    const secondaryEvents = await handler(event, prevState, nextState, runtime);
    return Array.isArray(secondaryEvents) ? secondaryEvents : [];
  } catch (error) {
    return [
      {
        type: 'SYSTEM_ERROR_RECORDED',
        entry: createSystemLogEntry(
          {
            color: 'ROJO',
            category: 'ERROR_CRITICO',
            severity: 'ERROR',
            message: `Error en effects para ${event.type}: ${String(error)}`,
          },
          nextState
        ),
      } as any,
    ];
  }
}
