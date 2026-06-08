import { workTrackerEngine } from './workTrackerEngine';
import { WorkTrackerRuntimeAdapter } from './contracts/types';

// Importación de los adaptadores reales de infraestructura construidos en Fases 1-6
import { sessionStore } from './runtime/sessionStoreAdapter';
import { locationAdapter } from './runtime/locationAdapter';
import { notificationsAdapter } from './runtime/notificationsAdapter';
import { reportsAdapter } from './runtime/reportsAdapter';
import { securityAdapter } from './runtime/securityAdapter';
import { loggingAdapter } from './runtime/loggingAdapter';

/**
 * CONGELACIÓN DE ARQUITECTURA
 * Ensambla el Runtime Adapter completo y lo inyecta en el Motor Canónico.
 * Este es el único punto de la aplicación donde el "Cerebro" conoce a las "Manos".
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
 * Secuencia de Arranque Oficial
 * Inicializa el motor y dispara el evento de rehidratación para recuperar
 * las sesiones y configuraciones desde la base de datos SQLite.
 */
export const bootApplication = async (): Promise<void> => {
  try {
    // 1. Inyección de Infraestructura
    workTrackerEngine.initialize(productionRuntime);

    // 2. Disparo del Big Bang (Inicio del ciclo de vida del sistema)
    await workTrackerEngine.dispatch({ type: 'APP_BOOT_STARTED' });
    
  } catch (error) {
    console.error('Fallo crítico y absoluto durante el arranque del motor:', error);
  }
};
