import { WorkTrackerCanonicalState, DomainEvent } from '../contracts/types';

/**
 * Validador puro: Lanza un error si el evento intentaría poner al sistema en un estado inválido.
 */
function validateEvent(state: WorkTrackerCanonicalState, event: DomainEvent): void {
  switch (event.type) {
    case 'SESSION_AUTO_CHECKOUT_GPS':
    case 'SESSION_CLOSED_MANUAL':
      if (!state.domain.sessions.activeSessionId) {
        throw new Error(`Evento ${event.type} inválido: No hay sesión activa para cerrar.`);
      }
      break;
    case 'SESSION_EDITED_MANUAL':
      if (!event.note || !event.note.trim()) {
        throw new Error('La nota de auditoría es obligatoria para ediciones manuales.');
      }
      break;
  }
}

/**
 * Reducer puro: Calcula el siguiente estado sin ejecutar side-effects.
 */
function reduce(state: WorkTrackerCanonicalState, event: DomainEvent): WorkTrackerCanonicalState {
  // Clonación superficial segura para inmutabilidad base
  const nextState = { ...state, domain: { ...state.domain }, runtime: { ...state.runtime } };

  switch (event.type) {
    case 'APP_REHYDRATION_COMPLETED':
      nextState.meta = {
        ...state.meta,
        bootState: { isRehydrating: false, lastHydratedAtMs: event.timestampMs }
      };
      break;
    
    // Aquí integraremos el resto de sub-reducers (Session, System, Report, etc.)
    // ...
  }

  return nextState;
}

/**
 * Función principal exportada para el Engine
 */
export function workTrackerReducer(
  state: WorkTrackerCanonicalState,
  event: DomainEvent
): WorkTrackerCanonicalState {
  validateEvent(state, event);
  return reduce(state, event);
}
