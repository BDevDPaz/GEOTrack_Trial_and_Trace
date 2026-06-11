import {
  WorkTrackerCanonicalState,
  DomainEvent,
  SessionRecord,
  FeedbackPayload,
  SystemLogRecord,
} from '../contracts/types';

/**
 * =============================================================================
 * HELPERS INTERNOS
 * =============================================================================
 */

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
  if (!activeSessionId) {
    return 'NO_INICIADA';
  }

  const activeSession = state.domain.sessions.byId[String(activeSessionId)];
  if (!activeSession || activeSession.lifecycle.isDeleted) {
    return 'NO_INICIADA';
  }

  const { domainStatus } = activeSession.lifecycle;
  const { lastExitTimestampMs } = state.runtime.geofence;

  if (domainStatus === 'travel') {
    return 'EN_TRASLADO';
  }

  if (domainStatus === 'pending_arrival') {
    return 'ESPERANDO_LLEGADA';
  }

  if (domainStatus === 'active') {
    if (lastExitTimestampMs) {
      return 'SALIDA_DETECTADA';
    }
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
        ...state.views.currentOperationalState,
        engineState: deriveEngineState(state),
      },
    },
  };
}

function ensureSessionExists(
  state: WorkTrackerCanonicalState,
  sessionId: number
): SessionRecord {
  const session = state.domain.sessions.byId[String(sessionId)];
  if (!session) {
    throw new Error(`La sesión ${sessionId} no existe en el estado canónico.`);
  }
  return session;
}

function cloneSessionsState(state: WorkTrackerCanonicalState) {
  return {
    ...state.domain.sessions,
    byId: { ...state.domain.sessions.byId },
    order: [...state.domain.sessions.order],
  };
}

function normalizeFeedbackPayload(
  feedback: Extract<DomainEvent, { type: 'FEEDBACK_ENQUEUED' }>['feedback']
): FeedbackPayload {
  return {
    id: feedback.id,
    kind: feedback.kind,
    tone: feedback.tone ?? 'info',
    title: feedback.title ?? null,
    message: feedback.message,
    dedupeKey: feedback.dedupeKey ?? null,
    durationMs: feedback.durationMs ?? null,
    destructive: feedback.destructive ?? false,
  };
}

function normalizeSystemErrorToLog(
  entry: Partial<SystemLogRecord>,
  existingCount: number
): SystemLogRecord {
  return {
    id: entry.id ?? existingCount + 1,
    timestampMs: entry.timestampMs ?? Date.now(),
    timestampIso: entry.timestampIso ?? new Date().toISOString(),
    color: entry.color ?? 'ROJO',
    category: entry.category ?? 'ERROR_CRITICO',
    severity: entry.severity ?? 'ERROR',
    message: entry.message ?? 'Error de sistema no especificado',
    metadataJson: entry.metadataJson ?? null,
  };
}

/**
 * =============================================================================
 * VALIDACIÓN PURA
 * =============================================================================
 */

function validateEvent(state: WorkTrackerCanonicalState, event: DomainEvent): void {
  switch (event.type) {
    case 'SESSION_CREATED': {
      if (state.domain.sessions.activeSessionId) {
        throw new Error(
          'No se puede crear una nueva sesión mientras exista una sesión activa.'
        );
      }
      break;
    }

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
    case 'SESSION_DESTINATION_SET': {
      ensureSessionExists(state, event.sessionId);
      break;
    }

    case 'SESSION_AUTO_CHECKOUT_GPS':
    case 'SESSION_CLOSED_MANUAL': {
      if (!state.domain.sessions.activeSessionId) {
        throw new Error(
          `Evento ${event.type} inválido: no hay sesión activa para cerrar.`
        );
      }
      if (state.domain.sessions.activeSessionId !== event.sessionId) {
        throw new Error(
          `Evento ${event.type} inválido: la sesión ${event.sessionId} no es la activa.`
        );
      }
      break;
    }

    case 'SESSION_EDITED_MANUAL': {
      if (!event.note || !event.note.trim()) {
        throw new Error('La nota de auditoría es obligatoria para ediciones manuales.');
      }
      break;
    }

    case 'SESSION_LUNCH_RECORDED': {
      if (
        event.deductedMinutes !== undefined &&
        (!Number.isFinite(event.deductedMinutes) || event.deductedMinutes < 0)
      ) {
        throw new Error(
          'La deducción de almuerzo debe ser un número válido mayor o igual a cero.'
        );
      }
      break;
    }

    case 'REPORT_RANGE_SELECTED': {
      if (event.startAtMs > event.endAtMs) {
        throw new Error(
          'El rango del reporte es inválido: startAtMs no puede ser mayor que endAtMs.'
        );
      }
      break;
    }

    case 'EVENT_RETRY_REQUESTED': {
      if (!Number.isFinite(event.retryCount) || event.retryCount < 1) {
        throw new Error('retryCount debe ser un entero positivo mayor o igual a 1.');
      }
      if (!event.reason || !event.reason.trim()) {
        throw new Error('EVENT_RETRY_REQUESTED requiere una razón explícita.');
      }
      break;
    }

    default:
      break;
  }
}

/**
 * =============================================================================
 * REDUCCIÓN PURA
 * =============================================================================
 */

function reduce(state: WorkTrackerCanonicalState, event: DomainEvent): WorkTrackerCanonicalState {
  switch (event.type) {
    /**
     * -------------------------------------------------------------------------
     * BOOT / SYSTEM
     * -------------------------------------------------------------------------
     */
    case 'APP_BOOT_STARTED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        meta: {
          ...state.meta,
          bootState: {
            ...state.meta.bootState,
            isRehydrating: true,
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'APP_REHYDRATION_COMPLETED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        meta: {
          ...state.meta,
          bootState: {
            isRehydrating: false,
            lastHydratedAtMs: event.timestampMs,
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'DB_READY': {
      return withDerivedViews({ ...state });
    }

    case 'PERMISSIONS_LOCATION_UPDATED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          permissions: {
            ...state.runtime.permissions,
            locationForeground: event.foreground,
            locationBackground: event.background,
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'PERMISSIONS_NOTIFICATIONS_UPDATED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          permissions: {
            ...state.runtime.permissions,
            notifications: event.notifications,
          },
          notifications: {
            ...state.runtime.notifications,
            defaultChannelReady: event.notifications === 'granted',
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'GEOFENCE_MONITORING_STARTED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          geofence: {
            ...state.runtime.geofence,
            isMonitoring: true,
            taskName: event.taskName,
            monitoredRegion: {
              identifier: event.identifier,
              latitude: event.latitude,
              longitude: event.longitude,
              radiusMeters: event.radiusMeters,
            },
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'GEOFENCE_MONITORING_STOPPED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          geofence: {
            ...state.runtime.geofence,
            isMonitoring: false,
            lastExitTimestampMs: null,
            monitoredRegion: {
              identifier: null,
              latitude: null,
              longitude: null,
              radiusMeters: null,
            },
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'BACKGROUND_TASK_REGISTERED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          background: {
            ...state.runtime.background,
            appTask: {
              ...state.runtime.background.appTask,
              isRegistered: true,
              taskName: event.taskName,
            },
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'BACKGROUND_TASK_UNREGISTERED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          background: {
            ...state.runtime.background,
            appTask: {
              ...state.runtime.background.appTask,
              isRegistered: false,
              isRunning: false,
            },
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'BACKGROUND_TASK_STARTED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          background: {
            ...state.runtime.background,
            appTask: {
              ...state.runtime.background.appTask,
              isRunning: true,
            },
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'BACKGROUND_TASK_FINISHED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          background: {
            ...state.runtime.background,
            appTask: {
              ...state.runtime.background.appTask,
              isRunning: false,
            },
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'SYSTEM_ERROR_RECORDED': {
      const entry = normalizeSystemErrorToLog(event.entry, state.domain.audit.systemLogs.length);
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        domain: {
          ...state.domain,
          audit: {
            ...state.domain.audit,
            systemLogs: [...state.domain.audit.systemLogs, entry],
          },
        },
      };
      return withDerivedViews(nextState);
    }

    /**
     * -------------------------------------------------------------------------
     * REHIDRATACIÓN MASIVA
     * -------------------------------------------------------------------------
     */
    case 'SETTINGS_REHYDRATED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        meta: {
          ...state.meta,
          locale: event.settings.language,
        },
        domain: {
          ...state.domain,
          settings: { ...event.settings },
        },
        runtime: {
          ...state.runtime,
          notifications: {
            ...state.runtime.notifications,
            lastScheduledReminderTime: event.settings.dailyReminderTime,
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'AUDIT_LOGS_REHYDRATED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        domain: {
          ...state.domain,
          audit: {
            ...state.domain.audit,
            auditLogs: [...event.entries],
          },
        },
      };
      return withDerivedViews(nextState);
    }

    case 'SYSTEM_LOGS_REHYDRATED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        domain: {
          ...state.domain,
          audit: {
            ...state.domain.audit,
            systemLogs: [...event.entries],
          },
        },
      };
      return withDerivedViews(nextState);
    }

    /**
     * -------------------------------------------------------------------------
     * RETRY STRATEGY
     * -------------------------------------------------------------------------
     * No muta el dominio ni runtime. Es un evento de orquestación.
     * Mantenerlo como no-op garantiza que el retry solo reejecuta effects.
     */
    case 'EVENT_RETRY_REQUESTED': {
      return withDerivedViews({ ...state });
    }

    /**
     * -------------------------------------------------------------------------
     * SESSION LIFECYCLE
     * -------------------------------------------------------------------------
     */
    case 'SESSION_CREATED': {
      const session = buildSessionRecordFromEvent(event);
      const sessions = cloneSessionsState(state);

      sessions.byId[String(session.id)] = session;
      sessions.order = [...sessions.order, session.id];
      sessions.activeSessionId = session.id;

      const nextState: WorkTrackerCanonicalState = {
        ...state,
        domain: {
          ...state.domain,
          sessions,
        },
        views: {
          ...state.views,
          selectedSession: {
            ...state.views.selectedSession,
            selectedSessionId: session.id,
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'SESSION_DESTINATION_SET': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);

      sessions.byId[String(event.sessionId)] = {
        ...current,
        destination: {
          ...current.destination,
          address: event.address ?? current.destination.address,
          clientName: event.clientName ?? current.destination.clientName,
          targetLatitude: event.targetLatitude ?? current.destination.targetLatitude,
          targetLongitude: event.targetLongitude ?? current.destination.targetLongitude,
          setupLatitude: event.setupLatitude ?? current.destination.setupLatitude,
          setupLongitude: event.setupLongitude ?? current.destination.setupLongitude,
        },
      };

      return withDerivedViews({
        ...state,
        domain: {
          ...state.domain,
          sessions,
        },
      });
    }

    case 'SESSION_TRANSIT_STARTED': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);

      sessions.byId[String(event.sessionId)] = {
        ...current,
        lifecycle: {
          ...current.lifecycle,
          domainStatus: 'travel',
        },
      };
      sessions.activeSessionId = event.sessionId;

      return withDerivedViews({
        ...state,
        domain: {
          ...state.domain,
          sessions,
        },
      });
    }

    case 'SESSION_ARRIVAL_CONFIRMED_MANUAL': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);

      sessions.byId[String(event.sessionId)] = {
        ...current,
        actualStartAtMs: event.actualStartAtMs,
        lifecycle: {
          ...current.lifecycle,
          domainStatus: 'active',
          locationConfirmed: false,
        },
      };
      sessions.activeSessionId = event.sessionId;

      const nextState: WorkTrackerCanonicalState = {
        ...state,
        domain: {
          ...state.domain,
          sessions,
        },
        runtime: {
          ...state.runtime,
          geofence: {
            ...state.runtime.geofence,
            lastExitTimestampMs: null,
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'SESSION_AUTO_CHECKIN_GPS': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);

      sessions.byId[String(event.sessionId)] = {
        ...current,
        actualStartAtMs: event.actualStartAtMs,
        lifecycle: {
          ...current.lifecycle,
          domainStatus: 'active',
          locationConfirmed: true,
        },
      };
      sessions.activeSessionId = event.sessionId;

      const nextState: WorkTrackerCanonicalState = {
        ...state,
        domain: {
          ...state.domain,
          sessions,
        },
        runtime: {
          ...state.runtime,
          geofence: {
            ...state.runtime.geofence,
            lastExitTimestampMs: null,
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'SESSION_EXIT_DETECTED': {
      ensureSessionExists(state, event.sessionId);

      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          geofence: {
            ...state.runtime.geofence,
            lastExitTimestampMs: event.exitTimestampMs,
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'SESSION_EXIT_RESOLVED_CONTINUE': {
      ensureSessionExists(state, event.sessionId);

      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          geofence: {
            ...state.runtime.geofence,
            lastExitTimestampMs: null,
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'SESSION_AUTO_CHECKOUT_GPS':
    case 'SESSION_CLOSED_MANUAL': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);

      sessions.byId[String(event.sessionId)] = {
        ...current,
        endAtMs: event.endAtMs,
        lifecycle: {
          ...current.lifecycle,
          domainStatus: 'completed',
        },
      };
      sessions.activeSessionId = null;

      const nextState: WorkTrackerCanonicalState = {
        ...state,
        domain: {
          ...state.domain,
          sessions,
        },
        runtime: {
          ...state.runtime,
          geofence: {
            ...state.runtime.geofence,
            lastExitTimestampMs: null,
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'SESSION_LUNCH_RECORDED': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);

      const fallbackMinutes = event.deductedMinutes ?? current.lunch.deductedMinutes ?? 60;
      const inferredLunchStartAtMs = event.lunchStartAtMs ?? current.lunch.startAtMs;
      const inferredLunchEndAtMs =
        event.lunchEndAtMs ??
        current.lunch.endAtMs ??
        (inferredLunchStartAtMs !== null && inferredLunchStartAtMs !== undefined
          ? inferredLunchStartAtMs + fallbackMinutes * 60 * 1000
          : null);

      sessions.byId[String(event.sessionId)] = {
        ...current,
        lunch: {
          taken: true,
          startAtMs: inferredLunchStartAtMs ?? null,
          endAtMs: inferredLunchEndAtMs ?? null,
          deductedMinutes: fallbackMinutes,
        },
      };

      return withDerivedViews({
        ...state,
        domain: {
          ...state.domain,
          sessions,
        },
      });
    }

    case 'SESSION_NOTE_ADDED': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);

      sessions.byId[String(event.sessionId)] = {
        ...current,
        notes: {
          ...current.notes,
          manualNote: event.note,
        },
      };

      const draftNotesBySessionId = { ...state.runtime.transient.draftNotesBySessionId };
      delete draftNotesBySessionId[String(event.sessionId)];

      return withDerivedViews({
        ...state,
        domain: {
          ...state.domain,
          sessions,
        },
        runtime: {
          ...state.runtime,
          transient: {
            ...state.runtime.transient,
            draftNotesBySessionId,
          },
        },
      });
    }

    case 'SESSION_EDITED_MANUAL': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);

      sessions.byId[String(event.sessionId)] = {
        ...current,
        declaredStartAtMs: event.startTime,
        actualStartAtMs: current.actualStartAtMs ?? event.startTime,
        endAtMs: event.endTime,
        lifecycle: {
          ...current.lifecycle,
          isManualEdit: true,
          domainStatus: event.endTime ? 'completed' : current.lifecycle.domainStatus,
        },
        notes: {
          ...current.notes,
          manualNote: event.note,
        },
      };

      if (state.domain.sessions.activeSessionId === event.sessionId && event.endTime) {
        sessions.activeSessionId = null;
      }

      return withDerivedViews({
        ...state,
        domain: {
          ...state.domain,
          sessions,
        },
      });
    }

    case 'SESSION_DELETED_SOFT': {
      const current = ensureSessionExists(state, event.sessionId);
      const sessions = cloneSessionsState(state);

      sessions.byId[String(event.sessionId)] = {
        ...current,
        lifecycle: {
          ...current.lifecycle,
          isDeleted: true,
          domainStatus: 'deleted',
        },
      };

      if (sessions.activeSessionId === event.sessionId) {
        sessions.activeSessionId = null;
      }

      const nextState: WorkTrackerCanonicalState = {
        ...state,
        domain: {
          ...state.domain,
          sessions,
        },
        runtime: {
          ...state.runtime,
          geofence: {
            ...state.runtime.geofence,
            lastExitTimestampMs:
              state.domain.sessions.activeSessionId === event.sessionId
                ? null
                : state.runtime.geofence.lastExitTimestampMs,
          },
        },
        views: {
          ...state.views,
          selectedSession: {
            ...state.views.selectedSession,
            selectedSessionId:
              state.views.selectedSession.selectedSessionId === event.sessionId
                ? null
                : state.views.selectedSession.selectedSessionId,
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'SESSION_OVERLAP_DETECTED': {
      return withDerivedViews({ ...state });
    }

    /**
     * -------------------------------------------------------------------------
     * REPORTS
     * -------------------------------------------------------------------------
     */
    case 'REPORT_RANGE_SELECTED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        views: {
          ...state.views,
          report: {
            ...state.views.report,
            selectedRange: {
              startAtMs: event.startAtMs,
              endAtMs: event.endAtMs,
              label: event.label,
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'REPORT_GENERATION_STARTED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          background: {
            ...state.runtime.background,
            weeklyReport: {
              ...state.runtime.background.weeklyReport,
              generationStatus: 'generating',
            },
          },
          transient: {
            ...state.runtime.transient,
            exportIntent: {
              shouldShareAfterGenerate: false,
              shouldSendByEmailAfterGenerate: false,
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'REPORT_GENERATION_SUCCEEDED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          background: {
            ...state.runtime.background,
            weeklyReport: {
              ...state.runtime.background.weeklyReport,
              lastGeneratedUri: event.uri,
              generationStatus: 'generated',
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'REPORT_GENERATION_FAILED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          background: {
            ...state.runtime.background,
            weeklyReport: {
              ...state.runtime.background.weeklyReport,
              generationStatus: 'failed',
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'REPORT_SHARE_REQUESTED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          transient: {
            ...state.runtime.transient,
            exportIntent: {
              ...state.runtime.transient.exportIntent,
              shouldShareAfterGenerate: true,
              shouldSendByEmailAfterGenerate: false,
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'REPORT_EMAIL_REQUESTED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          transient: {
            ...state.runtime.transient,
            exportIntent: {
              ...state.runtime.transient.exportIntent,
              shouldShareAfterGenerate: false,
              shouldSendByEmailAfterGenerate: true,
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'REPORT_MARKED_AS_WEEKLY_DELIVERED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          background: {
            ...state.runtime.background,
            weeklyReport: {
              ...state.runtime.background.weeklyReport,
              lastReportedWeekId: event.weekId,
            },
          },
          transient: {
            ...state.runtime.transient,
            exportIntent: {
              shouldShareAfterGenerate: false,
              shouldSendByEmailAfterGenerate: false,
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    /**
     * -------------------------------------------------------------------------
     * SECURITY & FEEDBACK
     * -------------------------------------------------------------------------
     */
    case 'ADMIN_ACCESS_VALIDATION_STARTED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          security: {
            ...state.runtime.security,
            adminAccess: {
              ...state.runtime.security.adminAccess,
              validationStatus: 'validating',
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'ADMIN_ACCESS_GRANTED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          security: {
            ...state.runtime.security,
            adminAccess: {
              isUnlocked: true,
              lastValidatedAtMs: event.timestampMs,
              validationStatus: 'granted',
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'ADMIN_ACCESS_DENIED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          security: {
            ...state.runtime.security,
            adminAccess: {
              ...state.runtime.security.adminAccess,
              isUnlocked: false,
              validationStatus: 'denied',
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'ADMIN_ACCESS_LOCKED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          security: {
            ...state.runtime.security,
            adminAccess: {
              isUnlocked: false,
              lastValidatedAtMs: state.runtime.security.adminAccess.lastValidatedAtMs,
              validationStatus: 'idle',
            },
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'FEEDBACK_ENQUEUED': {
      const normalized = normalizeFeedbackPayload(event.feedback);
      const alreadyExists = state.runtime.transient.pendingFeedback.some(
        (item) => item.id === normalized.id
      );

      if (alreadyExists) {
        return withDerivedViews({ ...state });
      }

      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          transient: {
            ...state.runtime.transient,
            pendingFeedback: [...state.runtime.transient.pendingFeedback, normalized],
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'FEEDBACK_DISMISSED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        runtime: {
          ...state.runtime,
          transient: {
            ...state.runtime.transient,
            pendingFeedback: state.runtime.transient.pendingFeedback.filter(
              (item) => item.id !== event.feedbackId
            ),
          },
        },
      };

      return withDerivedViews(nextState);
    }

    /**
     * -------------------------------------------------------------------------
     * LOGS
     * -------------------------------------------------------------------------
     */
    case 'SYSTEM_LOG_APPENDED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        domain: {
          ...state.domain,
          audit: {
            ...state.domain.audit,
            systemLogs: [...state.domain.audit.systemLogs, event.entry],
          },
        },
      };

      return withDerivedViews(nextState);
    }

    case 'AUDIT_LOG_APPENDED': {
      const nextState: WorkTrackerCanonicalState = {
        ...state,
        domain: {
          ...state.domain,
          audit: {
            ...state.domain.audit,
            auditLogs: [...state.domain.audit.auditLogs, event.entry],
          },
        },
      };

      return withDerivedViews(nextState);
    }

    default:
      return withDerivedViews({ ...state });
  }
}

/**
 * =============================================================================
 * FUNCIÓN PRINCIPAL EXPORTADA
 * =============================================================================
 */

export function workTrackerReducer(
  state: WorkTrackerCanonicalState,
  event: DomainEvent
): WorkTrackerCanonicalState {
  validateEvent(state, event);
  return reduce(state, event);
}

