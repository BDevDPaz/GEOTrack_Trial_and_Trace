import { DomainEvent, WorkTrackerCanonicalState, WorkTrackerRuntimeAdapter } from './contracts/types';
import { createInitialState } from './state/initialState';
import { workTrackerReducer } from './reducer';
import { executeEffects } from './effects';

class WorkTrackerEngine {
  private state: WorkTrackerCanonicalState;
  private runtimeAdapter: WorkTrackerRuntimeAdapter | null = null;
  private isDispatching: boolean = false;

  constructor() {
    this.state = createInitialState();
  }

  public initialize(runtime: WorkTrackerRuntimeAdapter) {
    this.runtimeAdapter = runtime;
  }

  public getState(): WorkTrackerCanonicalState {
    return this.state;
  }

  /**
   * Despachador Universal:
   * Sigue la regla estricta: Valida -> Reduce -> Ejecuta Efectos -> Re-despacha
   */
  public async dispatch(event: DomainEvent): Promise<void> {
    if (!this.runtimeAdapter) {
      console.warn('Motor despachando evento sin runtime inicializado. Se ignorarán los efectos físicos.');
    }

    if (this.isDispatching) {
      // Si ya hay un dispatch en curso, podríamos implementar una cola FIFO aquí.
      // Por ahora lo procesamos sincrónamente.
      console.warn(`Dispatch anidado detectado para evento: ${event.type}`);
    }

    this.isDispatching = true;

    try {
      // 1. Guardar estado previo
      const prevState = this.state;

      // 2. Validar y Mutar estado (Reducer Puro)
      const nextState = workTrackerReducer(prevState, event);
      this.state = nextState;

      // 3. Ejecutar Efectos Asíncronos
      let secondaryEvents: DomainEvent[] = [];
      if (this.runtimeAdapter) {
        secondaryEvents = await executeEffects(event, prevState, nextState, this.runtimeAdapter);
      }

      // 4. Liberar bloqueo antes de despachar eventos secundarios
      this.isDispatching = false;

      // 5. Procesar eventos secundarios generados por los efectos
      for (const secondaryEvent of secondaryEvents) {
        await this.dispatch(secondaryEvent);
      }

    } catch (error: any) {
      this.isDispatching = false;
      console.error(`[WorkTracker Engine] Error crítico despachando ${event.type}:`, error.message);
      
      // Intentar auto-recuperación o registrar el fallo si no fue provocado por el propio logger
      if (event.type !== 'SYSTEM_LOG_APPENDED' && this.runtimeAdapter) {
        // Enviar silenciosamente el error a la base de datos
      }
    }
  }
}

export const workTrackerEngine = new WorkTrackerEngine();
