import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { log } from "../../utils/logger";
import { t } from "../../utils/i18n";
import { LUNCH_REMINDER_ID } from "../lunch/lunchReminder";
import {
  NOTIFICATION_ACTIONS,
  NOTIFICATION_CATEGORIES,
} from "../../constants/notifications";

const DEFAULT_CHANNEL_ID = "default";
/** Solo esta notificación se reemplaza al reprogramar (no se tocan almuerzo ni salidas). */
export const DAILY_REMINDER_ID = "geotrack_daily_reminder";

/**
 * CONTRATO ESTRICTO:
 * Maneja puramente la API nativa de notificaciones.
 * NO debe consultar la base de datos (settings) directamente.
 */
export interface NotificationsAdapter {
  requestPermissions(): Promise<"granted" | "denied" | "unknown">;
  scheduleDailyReminder(timeString: string): Promise<void>;
  notifyImmediate(
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void>;
  notifyActionableExit(sessionId: number): Promise<void>;
  cancelAll(): Promise<void>;
  /** Fase D (11) */
  scheduleLunchReminder(atMs: number, sessionId: number, language?: "es" | "en"): Promise<void>;
  cancelLunchReminder(): Promise<void>;
}

async function checkPermissionSilently(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  } catch (error) {
    log(
      "ROJO",
      "ERROR_CRITICO",
      "ERROR",
      "Error consultando permisos en adapter",
      error,
    );
    return false;
  }
}

async function registerNotificationCategories() {
  await Notifications.setNotificationCategoryAsync(
    NOTIFICATION_CATEGORIES.EXIT_DETECTION,
    [
      {
        identifier: NOTIFICATION_ACTIONS.NEW_JOB,
        buttonTitle: "Otro trabajo",
        options: { opensAppToForeground: false },
      },
      {
        identifier: NOTIFICATION_ACTIONS.END_SESSION,
        buttonTitle: "Terminar jornada",
        options: { opensAppToForeground: false, isDestructive: true },
      },
    ],
  );

  await Notifications.setNotificationCategoryAsync(
    NOTIFICATION_CATEGORIES.DAILY_REMINDER,
    [
      {
        identifier: NOTIFICATION_ACTIONS.DAILY_SETUP,
        buttonTitle: "Configurar jornada",
        options: { opensAppToForeground: true },
      },
    ],
  );
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  try {
    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
      name: DEFAULT_CHANNEL_ID,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  } catch (error) {
    log(
      "ROJO",
      "ERROR_CRITICO",
      "ERROR",
      "Error configurando canal en adapter",
      error,
    );
  }
}

export const notificationsAdapter: NotificationsAdapter = {
  async requestPermissions() {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === "granted") {
        if (Platform.OS === "android") await ensureAndroidChannel();
        await registerNotificationCategories();
      }

      return finalStatus as "granted" | "denied" | "unknown";
    } catch (error) {
      log(
        "ROJO",
        "ERROR_CRITICO",
        "ERROR",
        "Error solicitando permisos en adapter",
        error,
      );
      return "denied";
    }
  },

  async scheduleLunchReminder(atMs, sessionId, language = "es") {
    if (!(await checkPermissionSilently())) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(LUNCH_REMINDER_ID).catch(() => {});
      await ensureAndroidChannel();
      await Notifications.scheduleNotificationAsync({
        identifier: LUNCH_REMINDER_ID,
        content: {
          title: t(language, "lunch_reminder_title"),
          body: t(language, "lunch_reminder_body"),
          sound: true,
          data: { action: "LUNCH_REMINDER", sessionId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(atMs),
          channelId: Platform.OS === "android" ? DEFAULT_CHANNEL_ID : undefined,
        },
      });
      log("AZUL", "OPERACION_EXITOSA", "INFO", `Recordatorio de almuerzo programado (${new Date(atMs).toISOString()})`);
    } catch (error) {
      log("ROJO", "ERROR_CRITICO", "ERROR", "Error programando recordatorio de almuerzo", error);
    }
  },

  async cancelLunchReminder() {
    try {
      await Notifications.cancelScheduledNotificationAsync(LUNCH_REMINDER_ID);
    } catch {
      // nada que cancelar
    }
  },

  async scheduleDailyReminder(timeString: string): Promise<void> {
    if (!(await checkPermissionSilently())) {
      log(
        "AMARILLO",
        "ADVERTENCIA",
        "WARN",
        "Omitiendo recordatorio diario: sin permisos.",
      );
      return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});

      const [hourStr, minuteStr] = timeString.split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
      ) {
        log(
          "NARANJA",
          "ADVERTENCIA",
          "WARN",
          `Adapter: Hora inválida "${timeString}"`,
        );
        return;
      }

      await ensureAndroidChannel();

      await Notifications.scheduleNotificationAsync({
        identifier: DAILY_REMINDER_ID,
        content: {
          title: "¡Buenos días! ☀️",
          body: "Es hora de iniciar tu jornada en LEDTracker.",
          sound: true,
          data: { action: NOTIFICATION_ACTIONS.DAILY_SETUP },
          categoryIdentifier: NOTIFICATION_CATEGORIES.DAILY_REMINDER,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: Platform.OS === "android" ? DEFAULT_CHANNEL_ID : undefined,
        },
      });
    } catch (error) {
      log(
        "ROJO",
        "ERROR_CRITICO",
        "ERROR",
        "Error en adapter agendando recordatorio",
        error,
      );
    }
  },

  async notifyImmediate(
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    if (!title || !body) {
      log(
        "NARANJA",
        "ADVERTENCIA",
        "WARN",
        "Adapter: notifyImmediate ignorado por payload vacío.",
      );
      return;
    }

    if (!(await checkPermissionSilently())) {
      log(
        "AMARILLO",
        "ADVERTENCIA",
        "WARN",
        `Omitiendo notificación "${title}": sin permisos.`,
      );
      return;
    }

    try {
      await ensureAndroidChannel();

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          vibrate: [0, 500, 200, 500],
        },
        trigger: null,
      });
    } catch (error) {
      log(
        "ROJO",
        "ERROR_CRITICO",
        "ERROR",
        "Error en adapter lanzando notificación inmediata",
        error,
      );
    }
  },

  async notifyActionableExit(sessionId: number): Promise<void> {
    if (!(await checkPermissionSilently())) return;
    try {
      await ensureAndroidChannel();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Salida detectada 📍",
          body: "¿Qué deseas hacer? Detectamos que saliste del área de trabajo.",
          data: { sessionId },
          categoryIdentifier: NOTIFICATION_CATEGORIES.EXIT_DETECTION,
          sound: true,
          vibrate: [0, 500, 200, 500],
        },
        trigger: null,
      });
    } catch (error) {
      log(
        "ROJO",
        "ERROR_CRITICO",
        "ERROR",
        "Fallo al enviar notificación de salida en adapter",
        error,
      );
    }
  },

  async cancelAll(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      log(
        "ROJO",
        "ERROR_CRITICO",
        "ERROR",
        "Error en adapter cancelando notificaciones",
        error,
      );
    }
  },
};
