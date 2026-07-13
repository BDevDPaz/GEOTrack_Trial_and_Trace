import { now, nowIso } from "../utils/timeProvider";
import { workTrackerEngine } from "./workTrackerEngine";
import { WorkTrackerRuntimeAdapter } from "./contracts";

// Adaptadores reales de infraestructura
import {
  sessionStore,
  locationAdapter,
  notificationsAdapter,
  reportsAdapter,
  securityAdapter,
  loggingAdapter,
} from "./runtime";

// Infraestructura base obligatoria
import { initDatabase } from "../database/db";
import { setupNotificationActionHandler } from "../services/NotificationActionHandler";

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
        0,
      );
    }

    return JSON.stringify({ error: String(error) }, null, 0);
  } catch {
    return null;
  }
}

/**
 * Runtime oficial del sistema.
 */
const productionRuntime: WorkTrackerRuntimeAdapter = {
  sessionStore,
  location: locationAdapter,
  notifications: notificationsAdapter,
  reports: reportsAdapter,
  security: securityAdapter,
  logging: loggingAdapter,
};

let bootPromise: Promise<void> | null = null;
let hasBootCompleted = false;

export const bootApplication = async (): Promise<void> => {
  if (hasBootCompleted) {
    return;
  }

  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = (async () => {
    try {
      workTrackerEngine.initialize(productionRuntime);
      setupNotificationActionHandler();
      await initDatabase();
      await workTrackerEngine.dispatch({ type: "DB_READY" });
      await workTrackerEngine.dispatch({ type: "APP_BOOT_STARTED" });
      hasBootCompleted = true;
    } catch (error) {
      console.error(
        "Fallo crítico y absoluto durante el arranque del motor:",
        error,
      );
      try {
        await workTrackerEngine.dispatch({
          type: "SYSTEM_ERROR_RECORDED",
          entry: {
            timestampMs: now(),
            timestampIso: nowIso(),
            color: "ROJO",
            category: "ERROR_CRITICO",
            severity: "ERROR",
            message: "Fallo crítico y absoluto durante el arranque del motor.",
            metadataJson: serializeError(error),
          },
        });
      } catch (dispatchError) {
        console.error(
          "Fallo adicional despachando SYSTEM_ERROR_RECORDED durante boot:",
          dispatchError,
        );
      }
      throw error;
    } finally {
      if (!hasBootCompleted) {
        bootPromise = null;
      }
    }
  })();

  return bootPromise;
};
