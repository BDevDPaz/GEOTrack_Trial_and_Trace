import { useState, useEffect, useCallback } from 'react';
import { workTrackerEngine } from '../workTrackerEngine';
import { WorkTrackerCanonicalState, DomainEvent } from '../contracts/types';

/**
 * Hook de conexión principal entre la interfaz de usuario (UI) y el motor canónico.
 * Garantiza que los componentes visuales sean "tontos" y solo reaccionen a la fuente única de verdad.
 */
export const useWorkTracker = () => {
  const [state, setState] = useState<WorkTrackerCanonicalState>(workTrackerEngine.getState());

  useEffect(() => {
    // Suscripción al estado del motor mediante polling de alta frecuencia (100ms).
    // Esto asegura una reactividad fluida en la UI sin acoplar librerías de observabilidad externas
    // y mantiene la sincronía con los eventos disparados en background.
    const intervalId = setInterval(() => {
      const currentState = workTrackerEngine.getState();
      
      setState((prevState) => {
        // Optimización: solo actualiza si la referencia del estado inmutable ha cambiado
        if (prevState === currentState) {
          return prevState;
        }
        return currentState;
      });
    }, 100); 

    return () => clearInterval(intervalId);
  }, []);

  // Memoizamos el despachador para evitar re-renders innecesarios en componentes hijos
  // que reciban dispatch como prop.
  const dispatch = useCallback((event: DomainEvent) => {
    workTrackerEngine.dispatch(event);
  }, []);

  return {
    state,
    dispatch,
  };
};
