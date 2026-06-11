import {
  DomainEvent,
  WorkTrackerCanonicalState,
  WorkTrackerRuntimeAdapter,
  SystemLogRecord,
} from './contracts/types';
import { createInitialState } from './state/initialState';
import { workTrackerReducer } from './reducer';
import { executeEffects } from './effects';

function nowIso(): string {
  return new Date().toISOString();
}

function serializeError(error: unknown): string | null {
  try {
    if (error instanceof Error) {
      return JSON.stringify(
        {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        null,
        0
      );
    }

    return JSON.stringify({ error: String(error) }, null, 0);
  } catch {
    return null;
  }
}

function buildSystemErrorLog(
  eventType: string,
  error: unknown,
  currentState: WorkTrackerCanonicalState
): SystemLogRecord {
  const message =
    error instanceof Error
      ? error.message
      : `Error desconocido despachando evento ${eventType}`;

  return {
    id: currentState.domain.audit.systemLogs.length + 1,
    timestampMs: Date.now(),
    timestampIso: nowIso(),
    color: 'ROJO',
    category: 'ERROR_CRITICO',
    severity: 'ERROR',
    message: `Error en WorkTrackerEngine durante ${eventType}: ${message}`,
    metadataJson: serializeError(error),
  };
}

/**
 * WorkTrackerEngine
 * -----------------------------------------------------------------------------
 * Motor canónico central del sistema.
 *
 * Responsabilidades:
 * 1. Mantener la única fuente de verdad del estado.
 * 2. Procesar eventos en orden FIFO estricto.
 * 3. Ejecutar la secuencia oficial:
 *      validate (inside reducer) -> reduce -> execute effects -> re-dispatch
 * 4. Aislar errores sin romper el loop del engine.
 * 5. Permitir dispatch anidado de forma segura mediante cola serial.
 */
class WorkTrackerEngine {
  private state: WorkTrackerCanonicalState;
  private runtimeAdapter: WorkTrackerRuntimeAdapter | null;
  private isDrainingQueue: boolean;
  private readonly eventQueue: DomainEvent[];
  private hasWarnedMissingRuntime: boolean;

  constructor() {
    this.state = createInitialState();
    this.runtimeAdapter = null;
    this.isDrainingQueue = false;
    this.eventQueue = [];
    this.hasWarnedMissingRuntime = false;
  }

  /**
   * Inyección única del runtime real.
   * Debe ejecutarse desde boot.ts antes del APP_BOOT_STARTED.
   */
  public initialize(runtime: WorkTrackerRuntimeAdapter): void {
    this.runtimeAdapter = runtime;
    this.hasWarnedMissingRuntime = false;
  }

  /**
   * Retorna el snapshot actual del estado canónico.
   */
  public getState(): WorkTrackerCanonicalState {
    return this.state;
  }

  /**
   * Utilidad opcional para saber si el motor ya recibió infraestructura.
   */
  public isInitialized(): boolean {
    return this.runtimeAdapter !== null;
  }

  /**
   * Reinicio duro del estado canónico.
   * No toca el runtime; solo la memoria del motor.
   */
  public resetState(): void {
    this.state = createInitialState();
    this.eventQueue.length = 0;
    this.isDrainingQueue = false;
  }

  /**
   * Despachador público universal.
   * Inserta el evento en cola y drena FIFO.
   */
  public async dispatch(event: DomainEvent): Promise<void> {
    this.eventQueue.push(event);
    await this.drainQueue();
  }

  /**
   * Drena la cola completa en orden estricto.
   * Si ocurre un dispatch anidado mientras se está drenando,
   * simplemente se encola y será consumido por el mismo loop actual.
   */
  private async drainQueue(): Promise<void> {
    if (this.isDrainingQueue) {
      return;
    }

    this.isDrainingQueue = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (!event) {
          continue;
        }

        await this.processEvent(event);
      }
    } finally {
      this.isDrainingQueue = false;
    }
  }

  /**
   * Procesa un evento individual siguiendo la secuencia oficial:
   *
   * 1. Guarda estado previo
   * 2. Reducer puro (valida + muta estado)
   * 3. Ejecuta efectos si existe runtime
   * 4. Encola eventos secundarios
   *
   * Si falla cualquier etapa:
   * - el motor no colapsa
   * - genera SYSTEM_ERROR_RECORDED
   * - y, cuando es seguro, SYSTEM_LOG_APPENDED
   */
  private async processEvent(event: DomainEvent): Promise<void> {
    const prevState = this.state;

    try {
      if (!this.runtimeAdapter && !this.hasWarnedMissingRuntime) {
        this.hasWarnedMissingRuntime = true;
        console.warn(
          '[WorkTrackerEngine] El motor está procesando eventos sin runtime inicializado. ' +
            'Se reducirá el estado, pero no se ejecutarán efectos físicos.'
        );
      }

      /**
       * Paso 1: Reducer puro
       * ---------------------------------------------------------
       * Si falla aquí, el estado no cambia.
       */
      const nextState = workTrackerReducer(prevState, event);

      /**
       * Paso 2: Commit inmutable del nuevo estado
       */
      this.state = nextState;

      /**
       * Paso 3: Ejecutar efectos si el runtime ya fue inyectado
       */
      if (this.runtimeAdapter) {
        const secondaryEvents = await executeEffects(
          event,
          prevState,
          nextState,
          this.runtimeAdapter
        );

        if (Array.isArray(secondaryEvents) && secondaryEvents.length > 0) {
          this.eventQueue.push(...secondaryEvents);
        }
      }
    } catch (error) {
      console.error(
        `[WorkTrackerEngine] Error crítico despachando ${event.type}:`,
        error
      );

      /**
       * Protección anti-recursión:
       * --------------------------
       * Si el evento que falló ya era de error o de log,
       * no volvemos a generar el mismo patrón infinito.
       */
      const isAlreadyErrorPath =
        event.type === 'SYSTEM_ERROR_RECORDED' ||
        event.type === 'SYSTEM_LOG_APPENDED';

      if (isAlreadyErrorPath) {
        return;
      }

      const errorLogEntry = buildSystemErrorLog(event.type, error, prevState);

      /**
       * Reinyectamos el fallo como eventos canónicos.
       * El reducer y los effects decidirán cómo persistirlos / visualizarlos.
       */
      this.eventQueue.push({
        type: 'SYSTEM_ERROR_RECORDED',
        entry: errorLogEntry,
      });

      this.eventQueue.push({
        type: 'SYSTEM_LOG_APPENDED',
        entry: errorLogEntry,
      });
    }
  }
}

export const workTrackerEngine = new WorkTrackerEngine();

