import { workTrackerEngine } from './workTrackerEngine';
import { WorkTrackerRuntimeAdapter } from './contracts/types';

// Adaptadores reales de infraestructura
import { sessionStore } from './runtime/sessionStoreAdapter';
import { locationAdapter } from './runtime/locationAdapter';
import { notificationsAdapter } from './runtime/notificationsAdapter';
import { reportsAdapter } from './runtime/reportsAdapter';
import { securityAdapter } from './runtime/securityAdapter';
import { loggingAdapter } from './runtime/loggingAdapter';

// Infraestructura base obligatoria
import { initDatabase } from '../database/db';

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

/**
 * Runtime oficial del sistema.
 * Este es el único punto donde el cerebro (engine)
 * conoce a las manos (infraestructura real).
 */
const productionRuntime: WorkTrackerRuntimeAdapter = {
  sessionStore,
  location: locationAdapter,
  notifications: notificationsAdapter,
  reports: reportsAdapter,
  security: securityAdapter,
  logging: loggingAdapter,
};

/**
 * Estado interno del proceso de boot.
 * - Evita dobles inicializaciones
 * - Evita arranques concurrentes
 */
let bootPromise: Promise<void> | null = null;
let hasBootCompleted = false;

/**
 * Secuencia oficial de arranque del sistema.
 *
 * Flujo:
 * 1. Inyecta runtime en el engine
 * 2. Inicializa la base de datos SQLite
 * 3. Notifica DB_READY al motor
 * 4. Dispara APP_BOOT_STARTED
 *
 * Propiedades:
 * - Idempotente
 * - Segura ante concurrencia
 * - Reintentable si el boot falla
 */
export const bootApplication = async (): Promise<void> => {
  if (hasBootCompleted) {
    return;
  }

  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = (async () => {
    try {
      // 1. Inyección de infraestructura real
      workTrackerEngine.initialize(productionRuntime);

      // 2. Inicialización obligatoria de SQLite
      await initDatabase();

      // 3. Señal formal de que la base ya está lista
      await workTrackerEngine.dispatch({ type: 'DB_READY' });

      // 4. Disparo del Big Bang del sistema
      await workTrackerEngine.dispatch({ type: 'APP_BOOT_STARTED' });

      hasBootCompleted = true;
    } catch (error) {
      console.error('Fallo crítico y absoluto durante el arranque del motor:', error);

      // Intentamos registrar el error dentro del propio sistema canónico
      try {
        await workTrackerEngine.dispatch({
          type: 'SYSTEM_ERROR_RECORDED',
          entry: {
            timestampMs: Date.now(),
            timestampIso: new Date().toISOString(),
            color: 'ROJO',
            category: 'ERROR_CRITICO',
            severity: 'ERROR',
            message: 'Fallo crítico y absoluto durante el arranque del motor.',
            metadataJson: serializeError(error),
          },
        });
      } catch (dispatchError) {
        console.error(
          'Fallo adicional despachando SYSTEM_ERROR_RECORDED durante boot:',
          dispatchError
        );
      }

      throw error;
    } finally {
      // Si falló el arranque, permitimos reintento futuro
      if (!hasBootCompleted) {
        bootPromise = null;
      }
    }
  })();

  return bootPromise;
};

