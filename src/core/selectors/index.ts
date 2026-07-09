import { now } from "../../utils/timeProvider";
import { WorkTrackerCanonicalState, SessionRecord } from "../contracts";
import {
  calculateSessionDuration,
  calculatePay,
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
  if (!activeSession) return "NO_INICIADA";

  const { domainStatus } = activeSession.lifecycle;
  const { lastExitTimestampMs } = state.runtime.geofence;

  if (domainStatus === "travel") return "EN_TRASLADO";
  if (domainStatus === "pending_arrival") return "ESPERANDO_LLEGADA";

  if (domainStatus === "active") {
    if (lastExitTimestampMs) return "SALIDA_DETECTADA";
    return "ACTIVA";
  }

  return "CERRADA";
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
    const endTimeToUse = session.endAtMs || now();
    const startTimeToUse = session.actualStartAtMs || session.declaredStartAtMs;

    const durationMs = calculateSessionDuration(
      startTimeToUse,
      endTimeToUse,
      session.lunch.taken ? 1 : 0,
      session.lunch.startAtMs || undefined,
      session.lunch.endAtMs || undefined,
    );

    const hours = durationMs / (1000 * 60 * 60);
    const { totalPay } = calculatePay(hours, hourlyRate, overtimeMultiplier);

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
