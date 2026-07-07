import {
  WorkTrackerCanonicalState,
  DomainEvent,
  SessionRecord,
  FeedbackPayload,
} from '../contracts';

type EngineState =
  | 'NO_INICIADA'
  | 'ESPERANDO_LLEGADA'
  | 'ASINCRONIA_CHECKIN'
  | 'NO_SHOW'
  | 'EN_TRASLADO'
  | 'ACTIVA'
  | 'SALIDA_DETECTADA'
  | 'CERRADA';

function buildSessionRecordFromEvent(
  event: Extract<DomainEvent, { type: 'SESSION_CREATED' }>
): SessionRecord {
  const lifecycleDomainStatus =
    event.session.lifecycle?.domainStatus ??
    (('domainStatus' in event.session && event.session.domainStatus) || 'pending_arrival');

  return {
    id: event.session.id,
    declaredStartAtMs: event.session.declaredStartAtMs,
    actualStartAtMs: event.session.actualStartAtMs ?? null,
    endAtMs: event.session.endAtMs ?? null,
    lifecycle: {
      domainStatus: lifecycleDomainStatus,
      isDeleted: event.session.lifecycle?.isDeleted ?? false,
      isManualEdit: event.session.lifecycle?.isManualEdit ?? false,
      locationConfirmed: event.session.lifecycle?.locationConfirmed ?? false,
    },
    destination: {
      address: event.session.destination?.address ?? event.address ?? null,
      clientName: event.session.destination?.clientName ?? event.clientName ?? null,
      targetLatitude: event.session.destination?.targetLatitude ?? event.targetLatitude ?? null,
      targetLongitude: event.session.destination?.targetLongitude ?? event.targetLongitude ?? null,
      setupLatitude: event.session.destination?.setupLatitude ?? event.setupLatitude ?? null,
      setupLongitude: event.session.destination?.setupLongitude ?? event.setupLongitude ?? null,
    },
    capturedLocation: {
      latitude: event.session.capturedLocation?.latitude ?? null,
      longitude: event.session.capturedLocation?.longitude ?? null,
    },
    lunch: {
      taken: event.session.lunch?.taken ?? false,
      startAtMs: event.session.lunch?.startAtMs ?? null,
      endAtMs: event.session.lunch?.endAtMs ?? null,
      deductedMinutes: event.session.lunch?.deductedMinutes ?? null,
    },
    notes: {
      manualNote: event.session.notes?.manualNote ?? event.manualNote ?? null,
    },
    bookkeeping: {
      dateString: event.session.bookkeeping?.dateString ?? event.dateString ?? null,
    },
  };
}

function deriveEngineState(state: WorkTrackerCanonicalState): EngineState {
  const activeSessionId = state.domain.sessions.activeSessionId;
  if (!activeSessionId) return 'NO_INICIADA';
  const activeSession = state.domain.sessions.byId[String(activeSessionId)];
  if (!activeSession || activeSession.lifecycle.isDeleted) return 'NO_INICIADA';
  const { domainStatus } = activeSession.lifecycle;
  const { lastExitTimestampMs } = state.runtime.geofence;
  if (domainStatus === 'travel') return 'EN_TRASLADO';
  if (domainStatus === 'pending_arrival') return 'ESPERANDO_LLEGADA';
  if (domainStatus === 'active') {
    if (lastExitTimestampMs) return 'SALIDA_DETECTADA';
    return 'ACTIVA';
  }
  return 'CERRADA';
}

function withDerivedViews(state: WorkTrackerCanonicalState): WorkTrackerCanonicalState {
  return {
    ...state,
    views: {
      ...state.views,
      currentOperationalState: {
        engineState: deriveEngineState(state),
      },
    },
  };
}

function ensureSessionExists(state: WorkTrackerCanonicalState, sessionId: number): SessionRecord {
  const session = state.domain.sessions.byId[String(sessionId)];
  if (!session) throw new Error(`Referencia de sesión inexistente: #${sessionId}`);
  return session;
}

function cloneSessionsState(state: WorkTrackerCanonicalState) {
  return {
    ...state.domain.sessions,
    byId: { ...state.domain.sessions.byId },
    order: [...state.domain.sessions.order],
  };
}

function normalizeFeedbackPayload(p: Partial<FeedbackPayload> & { id: string; kind: 'toast' | 'dialog'; message: string }): FeedbackPayload {
  return {
    id: p.id,
    kind: p.kind,
    tone: p.tone ?? 'info',
    title: p.title ?? null,
    message: p.message,
    dedupeKey: p.dedupeKey ?? null,
    durationMs: p.durationMs ?? 3000,
    destructive: p.destructive ?? false,
  };
}

function validateEvent(state: WorkTrackerCanonicalState, event: DomainEvent): void {
  if (!event || !event.type) throw new Error('Evento inválido');
  switch (event.type) {
    case 'SESSION_AUTO_CHECKIN_GPS': {
      const session = state.domain.sessions.byId[String(event.sessionId)];
      if (session?.lifecycle.domainStatus === 'active') throw new Error(`SESSION_AUTO_CHECKIN_GPS ignorado: #${event.sessionId} ya activa`);
      if (session?.lifecycle.domainStatus === 'completed') throw new Error(`SESSION_AUTO_CHECKIN_GPS ignorado: #${event.sessionId} completada`);
      break;
    }
    case 'SESSION_AUTO_CHECKOUT_GPS': {
      const session = state.domain.sessions.byId[String(event.sessionId)];
      if (session?.lifecycle.domainStatus === 'completed') throw new Error(`SESSION_AUTO_CHECKOUT_GPS ignorado: #${event.sessionId} completada`);
      break;
    }
  }
}

function reduce(state: WorkTrackerCanonicalState, event: DomainEvent): WorkTrackerCanonicalState {
  switch (event.type) {
    case 'APP_REHYDRATION_COMPLETED': return withDerivedViews({ ...state, meta: { ...state.meta, bootState: { isRehydrating: false, lastHydratedAtMs: event.timestampMs } } });
    case 'SETTINGS_REHYDRATED': return withDerivedViews({ ...state, domain: { ...state.domain, settings: event.settings } });
    case 'AUDIT_LOGS_REHYDRATED': return withDerivedViews({ ...state, domain: { ...state.domain, audit: { ...state.domain.audit, auditLogs: event.entries } } });
    case 'SYSTEM_LOGS_REHYDRATED': return withDerivedViews({ ...state, domain: { ...state.domain, audit: { ...state.domain.audit, systemLogs: event.entries } } });
    case 'PERMISSIONS_LOCATION_UPDATED': return withDerivedViews({ ...state, runtime: { ...state.runtime, permissions: { ...state.runtime.permissions, locationForeground: event.foreground, locationBackground: event.background } } });
    case 'PERMISSIONS_NOTIFICATIONS_UPDATED': return withDerivedViews({ ...state, runtime: { ...state.runtime, permissions: { ...state.runtime.permissions, notifications: event.notifications } } });
    case 'SESSION_CREATED': {
      const record = buildSessionRecordFromEvent(event);
      const sessions = cloneSessionsState(state);
      sessions.byId[String(record.id)] = record;
      sessions.order = [record.id, ...sessions.order];
      sessions.activeSessionId = record.id;
      return withDerivedViews({ ...state, domain: { ...state.domain, sessions } });
    }
    case 'SESSION_DESTINATION_SET': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);
      sessions.byId[String(event.sessionId)] = { ...current, destination: { ...current.destination, address: event.address ?? current.destination.address, clientName: event.clientName ?? current.destination.clientName, targetLatitude: event.targetLatitude ?? current.destination.targetLatitude, targetLongitude: event.targetLongitude ?? current.destination.targetLongitude, setupLatitude: event.setupLatitude ?? current.destination.setupLatitude, setupLongitude: event.setupLongitude ?? current.destination.setupLongitude } };
      return withDerivedViews({ ...state, domain: { ...state.domain, sessions } });
    }
    case 'SESSION_TRANSIT_STARTED': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);
      sessions.byId[String(event.sessionId)] = { ...current, lifecycle: { ...current.lifecycle, domainStatus: 'travel' } };
      return withDerivedViews({ ...state, domain: { ...state.domain, sessions } });
    }
    case 'SESSION_ARRIVAL_CONFIRMED_MANUAL':
    case 'SESSION_AUTO_CHECKIN_GPS': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);
      sessions.byId[String(event.sessionId)] = { ...current, actualStartAtMs: event.actualStartAtMs, lifecycle: { ...current.lifecycle, domainStatus: 'active', locationConfirmed: true } };
      sessions.activeSessionId = event.sessionId;
      return withDerivedViews({ ...state, domain: { ...state.domain, sessions }, runtime: { ...state.runtime, geofence: { ...state.runtime.geofence, lastExitTimestampMs: null } } });
    }
    case 'SESSION_EXIT_DETECTED': {
      ensureSessionExists(state, event.sessionId);
      return withDerivedViews({ ...state, runtime: { ...state.runtime, geofence: { ...state.runtime.geofence, lastExitTimestampMs: event.exitTimestampMs } } });
    }
    case 'SESSION_EXIT_RESOLVED_CONTINUE': {
      ensureSessionExists(state, event.sessionId);
      return withDerivedViews({ ...state, runtime: { ...state.runtime, geofence: { ...state.runtime.geofence, lastExitTimestampMs: null } } });
    }
    case 'SESSION_AUTO_CHECKOUT_GPS':
    case 'SESSION_CLOSED_MANUAL': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);
      sessions.byId[String(event.sessionId)] = { ...current, endAtMs: event.endAtMs, lifecycle: { ...current.lifecycle, domainStatus: 'completed' } };
      sessions.activeSessionId = null;
      return withDerivedViews({ ...state, domain: { ...state.domain, sessions }, runtime: { ...state.runtime, geofence: { ...state.runtime.geofence, lastExitTimestampMs: null } } });
    }
    case 'SESSION_LUNCH_RECORDED': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);
      sessions.byId[String(event.sessionId)] = { ...current, lunch: { taken: true, startAtMs: event.lunchStartAtMs ?? current.lunch.startAtMs, endAtMs: event.lunchEndAtMs ?? current.lunch.endAtMs, deductedMinutes: event.deductedMinutes ?? current.lunch.deductedMinutes } };
      return withDerivedViews({ ...state, domain: { ...state.domain, sessions } });
    }
    case 'SESSION_EDITED_MANUAL': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);
      sessions.byId[String(event.sessionId)] = { ...current, declaredStartAtMs: event.startTime, endAtMs: event.endTime, notes: { manualNote: event.note }, lifecycle: { ...current.lifecycle, isManualEdit: true } };
      return withDerivedViews({ ...state, domain: { ...state.domain, sessions } });
    }
    case 'SESSION_NOTE_ADDED': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);
      sessions.byId[String(event.sessionId)] = { ...current, notes: { manualNote: event.note } };
      return withDerivedViews({ ...state, domain: { ...state.domain, sessions } });
    }
    case 'SESSION_DELETED_SOFT': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);
      sessions.byId[String(event.sessionId)] = { ...current, lifecycle: { ...current.lifecycle, isDeleted: true } };
      if (state.domain.sessions.activeSessionId === event.sessionId) sessions.activeSessionId = null;
      return withDerivedViews({ ...state, domain: { ...state.domain, sessions } });
    }
    case 'GEOFENCE_MONITORING_STARTED': return withDerivedViews({ ...state, runtime: { ...state.runtime, geofence: { ...state.runtime.geofence, isMonitoring: true, taskName: event.taskName, monitoredRegion: { identifier: event.identifier, latitude: event.latitude, longitude: event.longitude, radiusMeters: event.radiusMeters } } } });
    case 'GEOFENCE_MONITORING_STOPPED': return withDerivedViews({ ...state, runtime: { ...state.runtime, geofence: { ...state.runtime.geofence, isMonitoring: false, monitoredRegion: { identifier: null, latitude: null, longitude: null, radiusMeters: null }, lastExitTimestampMs: null } } });
    case 'BACKGROUND_TASK_REGISTERED': return withDerivedViews({ ...state, runtime: { ...state.runtime, background: { ...state.runtime.background, appTask: { ...state.runtime.background.appTask, isRegistered: true, taskName: event.taskName } } } });
    case 'BACKGROUND_TASK_UNREGISTERED': return withDerivedViews({ ...state, runtime: { ...state.runtime, background: { ...state.runtime.background, appTask: { ...state.runtime.background.appTask, isRegistered: false } } } });
    case 'BACKGROUND_TASK_STARTED': return withDerivedViews({ ...state, runtime: { ...state.runtime, background: { ...state.runtime.background, appTask: { ...state.runtime.background.appTask, isRunning: true } } } });
    case 'BACKGROUND_TASK_FINISHED': return withDerivedViews({ ...state, runtime: { ...state.runtime, background: { ...state.runtime.background, appTask: { ...state.runtime.background.appTask, isRunning: false } } } });
    case 'REPORT_RANGE_SELECTED': return withDerivedViews({ ...state, views: { ...state.views, report: { ...state.views.report, selectedRange: { startAtMs: event.startAtMs, endAtMs: event.endAtMs, label: event.label } } } });
    case 'REPORT_GENERATION_STARTED': return withDerivedViews({ ...state, runtime: { ...state.runtime, background: { ...state.runtime.background, weeklyReport: { ...state.runtime.background.weeklyReport, generationStatus: 'generating' } } } });
    case 'REPORT_GENERATION_SUCCEEDED': return withDerivedViews({ ...state, runtime: { ...state.runtime, background: { ...state.runtime.background, weeklyReport: { ...state.runtime.background.weeklyReport, lastGeneratedUri: event.uri, generationStatus: 'generated' } } } });
    case 'REPORT_GENERATION_FAILED': return withDerivedViews({ ...state, runtime: { ...state.runtime, background: { ...state.runtime.background, weeklyReport: { ...state.runtime.background.weeklyReport, generationStatus: 'failed' } } } });
    case 'REPORT_MARKED_AS_WEEKLY_DELIVERED': return withDerivedViews({ ...state, runtime: { ...state.runtime, background: { ...state.runtime.background, weeklyReport: { ...state.runtime.background.weeklyReport, lastReportedWeekId: event.weekId } } } });
    case 'ADMIN_ACCESS_VALIDATION_STARTED': return withDerivedViews({ ...state, runtime: { ...state.runtime, security: { ...state.runtime.security, adminAccess: { ...state.runtime.security.adminAccess, validationStatus: 'validating' } } } });
    case 'ADMIN_ACCESS_GRANTED': return withDerivedViews({ ...state, runtime: { ...state.runtime, security: { ...state.runtime.security, adminAccess: { isUnlocked: true, lastValidatedAtMs: event.timestampMs, validationStatus: 'granted' } } } });
    case 'ADMIN_ACCESS_DENIED': return withDerivedViews({ ...state, runtime: { ...state.runtime, security: { ...state.runtime.security, adminAccess: { ...state.runtime.security.adminAccess, isUnlocked: false, validationStatus: 'denied' } } } });
    case 'ADMIN_ACCESS_LOCKED': return withDerivedViews({ ...state, runtime: { ...state.runtime, security: { ...state.runtime.security, adminAccess: { isUnlocked: false, lastValidatedAtMs: state.runtime.security.adminAccess.lastValidatedAtMs, validationStatus: 'idle' } } } });
    case 'FEEDBACK_ENQUEUED': {
      const normalized = normalizeFeedbackPayload(event.feedback);
      if (state.runtime.transient.pendingFeedback.some(i => i.id === normalized.id)) return withDerivedViews({ ...state });
      return withDerivedViews({ ...state, runtime: { ...state.runtime, transient: { ...state.runtime.transient, pendingFeedback: [...state.runtime.transient.pendingFeedback, normalized] } } });
    }
    case 'FEEDBACK_DISMISSED': return withDerivedViews({ ...state, runtime: { ...state.runtime, transient: { ...state.runtime.transient, pendingFeedback: state.runtime.transient.pendingFeedback.filter(i => i.id !== event.feedbackId) } } });
    case 'SYSTEM_LOG_APPENDED': return withDerivedViews({ ...state, domain: { ...state.domain, audit: { ...state.domain.audit, systemLogs: [...state.domain.audit.systemLogs, event.entry] } } });
    case 'AUDIT_LOG_APPENDED': return withDerivedViews({ ...state, domain: { ...state.domain, audit: { ...state.domain.audit, auditLogs: [...state.domain.audit.auditLogs, event.entry] } } });
    default: return withDerivedViews({ ...state });
  }
}

export function workTrackerReducer(state: WorkTrackerCanonicalState, event: DomainEvent): WorkTrackerCanonicalState {
  validateEvent(state, event);
  return reduce(state, event);
}
