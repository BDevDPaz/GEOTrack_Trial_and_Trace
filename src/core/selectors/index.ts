import { now } from "../../utils/timeProvider";
import { computeWeeklyPayroll } from "../payroll/weeklyPayroll";
import { WorkTrackerCanonicalState, SessionRecord } from "../contracts";
import {
  calculateSessionDurationWithPause,
  calculatePay,
  resolveSessionRate,
} from "../../utils/payrollUtils";

export const selectActiveSession = (
  state: WorkTrackerCanonicalState,
): SessionRecord | null => {
  const { activeSessionId, byId } = state.domain.sessions;
  if (!activeSessionId) return null;
  const session = (byId as any)[activeSessionId] || null;
  if (session?.lifecycle.isDeleted) return null;
  return session;
};

export const selectEngineState = (state: WorkTrackerCanonicalState): string => {
  const activeSession = selectActiveSession(state);
  if (!activeSession) return "IDLE";

  const { domainStatus } = activeSession.lifecycle;
  const { lastExitTimestampMs } = state.runtime.geofence;

  if (domainStatus === "TRAVEL") return "TRAVEL";
  if (domainStatus === "GEOFENCE_CREATED") return "GEOFENCE_CREATED";
  if (domainStatus === "PAUSED") return "PAUSED";

  if (domainStatus === "ACTIVE_WORK") {
    if (lastExitTimestampMs) return "PENDING_EXIT_CONFIRMATION";
    return "ACTIVE_WORK";
  }

  return "CLOSED";
};

export const selectSystemHealth = (state: WorkTrackerCanonicalState) => {
  const { locationForeground, locationBackground } = state.runtime.permissions;
  const { isMonitoring } = state.runtime.geofence;
  const { isRunning: isBackgroundRunning } = state.runtime.background.appTask;

  const isLocationGranted =
    locationForeground === "granted" && locationBackground === "granted";

  return {
    isGpsActive: isLocationGranted && isMonitoring,
    isGpsError: !isLocationGranted || (isMonitoring && !isBackgroundRunning),
    isSyncing: state.meta.bootState.isRehydrating,
    isSyncError: false,
  };
};

export interface ComputedPayrollSession extends SessionRecord {
  computedHours: number;
  computedPay: number;
}

export const selectComputedSessions = (
  state: WorkTrackerCanonicalState,
): ComputedPayrollSession[] => {
  const { byId, order } = state.domain.sessions;
  const { hourlyRate, overtimeMultiplier } = state.domain.settings;

  const validSessions = order
    .map((id) => (byId as any)[id])
    .filter((s): s is SessionRecord => !!s && !s.lifecycle.isDeleted);

  return validSessions.map((session) => {
    const isPendingExit =
      session.lifecycle.domainStatus === "ACTIVE_WORK" &&
      state.runtime.geofence.lastExitTimestampMs !== null;

    let endTimeToUse = session.endAtMs || now();
    if (isPendingExit) {
      endTimeToUse = state.runtime.geofence.lastExitTimestampMs || now();
    }

    const startTimeToUse = session.actualStartAtMs || session.declaredStartAtMs;

    const currentPauseMs =
      session.lifecycle.domainStatus === "PAUSED" &&
      session.lifecycle.lastPauseStartMs
        ? now() - session.lifecycle.lastPauseStartMs
        : 0;

    const durationMs = calculateSessionDurationWithPause(
      startTimeToUse,
      endTimeToUse,
      session.lunch.taken ? 1 : 0,
      (session.lifecycle.totalPausedMs || 0) + currentPauseMs,
      session.lunch.startAtMs || undefined,
      session.lunch.endAtMs || undefined,
    );

    const hours = durationMs / (1000 * 60 * 60);
    const rate = resolveSessionRate(session.pay, {
      hourlyRate,
      overtimeMultiplier,
    });
    const { totalPay } = calculatePay(
      hours,
      rate.hourlyRate,
      rate.overtimeMultiplier,
    );

    return {
      ...session,
      computedHours: hours,
      computedPay: totalPay,
    };
  });
};

export const selectPendingFeedback = (state: WorkTrackerCanonicalState) => {
  return state.runtime.transient.pendingFeedback;
};

export const selectIsAdminUnlocked = (state: WorkTrackerCanonicalState) => {
  return state.runtime.security.adminAccess.isUnlocked;
};

export const selectIsHydrated = (state: WorkTrackerCanonicalState) => {
  return !state.meta.bootState.isRehydrating;
};

export const selectNeedsOnboarding = (state: WorkTrackerCanonicalState) => {
  return !state.domain.settings.onboardingCompleted;
};

export const selectNeedsDisclaimer = (state: WorkTrackerCanonicalState) => {
  return !state.domain.settings.disclaimerAccepted;
};

/** Adapta una jornada calculada al cálculo semanal compartido. */
export const toWeeklyPayrollInput = (s: ComputedPayrollSession) => ({
  id: s.id,
  startMs: s.actualStartAtMs || s.declaredStartAtMs,
  hours: s.computedHours,
  hourlyRate: s.pay?.hourlyRate,
  overtimeMultiplier: s.pay?.overtimeMultiplier,
});

export interface WeeklyComputedSession extends ComputedPayrollSession {
  /** Pago de la jornada incluyendo su parte de OT semanal (>40 h). */
  computedPay: number;
  /** Pago solo con la regla diaria (>8 h), como antes de A.9. */
  dailyOnlyPay: number;
  regularHours: number;
  dailyOvertimeHours: number;
  weeklyOvertimeHours: number;
  appliedHourlyRate: number;
}

/**
 * Jornadas con el pago repartido por el cálculo semanal compartido
 * (computeWeeklyPayroll). Lo usan Historial y el detalle de jornada para que
 * la suma por jornada coincida con el total del reporte y del PDF.
 * selectComputedSessions queda igual para los demás consumidores.
 */
export const selectWeeklyComputedSessions = (
  state: WorkTrackerCanonicalState,
): WeeklyComputedSession[] => {
  const sessions = selectComputedSessions(state);
  const { hourlyRate, overtimeMultiplier } = state.domain.settings;
  const { byId } = computeWeeklyPayroll(sessions.map(toWeeklyPayrollInput), {
    hourlyRate,
    overtimeMultiplier,
  });
  return sessions.map((s) => {
    const r = byId.get(s.id)!;
    return {
      ...s,
      dailyOnlyPay: s.computedPay,
      computedPay: r.totalPay,
      regularHours: r.regularHours,
      dailyOvertimeHours: r.dailyOvertimeHours,
      weeklyOvertimeHours: r.weeklyOvertimeHours,
      appliedHourlyRate: r.hourlyRate,
    };
  });
};
