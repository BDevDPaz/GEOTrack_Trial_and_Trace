import { DomainEvent, WorkTrackerCanonicalState, WorkTrackerRuntimeAdapter, EffectHandler } from '../contracts/types';

/**
 * Enrutador principal de efectos.
 * Recibe un evento, evalúa qué adaptadores de infraestructura necesita, los ejecuta
 * y devuelve una promesa con un arreglo de nuevos eventos generados.
 */
export const executeEffects: EffectHandler = async (
  event: DomainEvent,
  prevState: WorkTrackerCanonicalState,
  nextState: WorkTrackerCanonicalState,
  runtime: WorkTrackerRuntimeAdapter
): Promise<DomainEvent[]> => {
  
  const secondaryEvents: DomainEvent[] = [];

  try {
    switch (event.type) {
      case 'SESSION_CREATED':
        // Ejemplo de cómo se usa el runtime adapter:
        // const id = await runtime.sessionStore.createSession(event.session);
        // await runtime.location.startMonitoringArrival(...);
        
        // Disparamos eventos secundarios
        secondaryEvents.push({ 
          type: 'SYSTEM_LOG_APPENDED', 
          entry: { id: 0, timestampMs: Date.now(), timestampIso: '', color: 'VERDE', category: 'OPERACION_EXITOSA', severity: 'INFO', message: 'Sesión creada en base de datos', metadataJson: null }
        });
        break;

      case 'SYSTEM_LOG_APPENDED':
        await runtime.logging.appendSystemLog(event.entry);
        
        // Evaluamos si el log requiere Feedback visual
        const feedbackPayload = runtime.logging.mapLogToFeedback(event.entry.severity, event.entry.category, event.entry.message);
        if (feedbackPayload) {
          secondaryEvents.push({ type: 'FEEDBACK_ENQUEUED', feedback: feedbackPayload });
        }
        break;

      // Resto de handlers por evento...
    }
  } catch (error) {
    console.error(`Error procesando efectos para evento ${event.type}:`, error);
  }

  return secondaryEvents;
};
