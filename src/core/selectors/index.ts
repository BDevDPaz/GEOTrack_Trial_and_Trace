import { WorkTrackerCanonicalState, SessionRecord } from '../contracts/types';
import { calculateSessionDuration, calculatePay } from '../../utils/payrollUtils'; // Reutilizamos tu lógica exacta

/**
 * ============================================================================
 * SELECTORES DE SESIÓN
 * ============================================================================
 */

export const selectActiveSession = (state: WorkTrackerCanonicalState): SessionRecord | null => {
  const { activeSessionId, byId } = state.domain.sessions;
  if (!activeSessionId) return null;
  return byId[activeSessionId] || null;
};

/**
 * LA JOYA DE LA CORONA:
 * Deriva el estado operativo visual sin que este se guarde estáticamente en la base de datos.
 */
export const selectEngineState = (state: WorkTrackerCanonicalState): string => {
  const activeSession = selectActiveSession(state);

  if (!activeSession) {
    return 'NO_INICIADA';
  }

  const { domainStatus } = activeSession.lifecycle;
  const { lastExitTimestampMs } = state.runtime.geofence;

  // 1. Estados de tránsito y espera
  if (domainStatus === 'travel') {
    return 'EN_TRASLADO';
  }

  if (domainStatus === 'pending_arrival') {
    // Aquí podríamos inyectar lógica de anomalías (ASINCRONIA_CHECKIN o NO_SHOW)
    // evaluando si Date.now() es muy superior al declaredStartAtMs
    return 'ESPERANDO_LLEGADA';
  }

  // 2. Estados Activos
  if (domainStatus === 'active') {
    if (lastExitTimestampMs) {
      return 'SALIDA_DETECTADA'; // El GPS reportó salida, inicia cuenta regresiva
    }
    return 'ACTIVA';
  }

  // Fallback seguro
  return 'CERRADA';
};

/**
 * ============================================================================
 * SELECTORES DE SALUD DEL SISTEMA (SystemHealthBlock)
 * ============================================================================
 */

export const selectSystemHealth = (state: WorkTrackerCanonicalState) => {
  const { locationForeground, locationBackground } = state.runtime.permissions;
  const { isMonitoring } = state.runtime.geofence;
  const { isRunning: isBackgroundRunning } = state.runtime.background.appTask;

  const isLocationGranted = locationForeground === 'granted' && locationBackground === 'granted';

  return {
    isGpsActive: isLocationGranted && isMonitoring,
    isGpsError: !isLocationGranted || (isMonitoring && !isBackgroundRunning),
    isSyncing: state.meta.bootState.isRehydrating,
    isSyncError: false, // Se conectará a fallos de escritura si ocurren
  };
};

/**
 * ============================================================================
 * SELECTORES DE NÓMINA (Reportes e Historial)
 * ============================================================================
 */

export interface ComputedPayrollSession extends SessionRecord {
  computedHours: number;
  computedPay: number;
}

export const selectComputedSessions = (state: WorkTrackerCanonicalState): ComputedPayrollSession[] => {
  const { byId, order } = state.domain.sessions;
  const { hourlyRate, overtimeMultiplier } = state.domain.settings;

  return order.map((id) => {
    const session = byId[id];
    const endTimeToUse = session.endAtMs || Date.now(); // Si está activa, calcula hasta "ahora"
    const startTimeToUse = session.actualStartAtMs || session.declaredStartAtMs;

    // Delegamos a tu utilidad premium
    const durationMs = calculateSessionDuration(
      startTimeToUse,
      endTimeToUse,
      session.lunch.taken ? 1 : 0,
      session.lunch.startAtMs || undefined,
      session.lunch.endAtMs || undefined
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

/**
 * ============================================================================
 * SELECTORES DE INFRAESTRUCTURA Y UI
 * ============================================================================
 */

export const selectPendingFeedback = (state: WorkTrackerCanonicalState) => {
  return state.runtime.transient.pendingFeedback;
};

export const selectIsAdminUnlocked = (state: WorkTrackerCanonicalState) => {
  return state.runtime.security.adminAccess.isUnlocked;
};
