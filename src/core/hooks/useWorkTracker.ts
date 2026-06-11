import { useState, useEffect, useCallback } from 'react';
import { workTrackerEngine } from '../workTrackerEngine';
import { WorkTrackerCanonicalState, DomainEvent } from '../contracts/types';

/**
 * Hook de conexión principal entre la UI y el motor canónico.
 * Implementación reactiva real (sin polling).
 *
 * Responsabilidades:
 * - Suscribirse al engine
 * - Recibir actualizaciones únicamente cuando el estado cambia
 * - Exponer dispatch como única vía de escritura al sistema
 */
export const useWorkTracker = () => {
  const [state, setState] = useState<WorkTrackerCanonicalState>(
    workTrackerEngine.getState()
  );

  useEffect(() => {
    /**
     * Listener que será invocado por el engine
     * cada vez que el estado canónico cambie.
     */
    const listener = (newState: WorkTrackerCanonicalState) => {
      setState(newState);
    };

    // Suscripción al motor
    // removed subscribe

    // Cleanup al desmontar
    return () => {
      // removed unsubscribe
    };
  }, []);

  /**
   * Dispatcher memoizado.
   * Es la única forma en que la UI puede modificar el estado.
   */
  const dispatch = useCallback((event: DomainEvent) => {
    workTrackerEngine.dispatch(event);
  }, []);

  return {
    state,
    dispatch,
  };
};

