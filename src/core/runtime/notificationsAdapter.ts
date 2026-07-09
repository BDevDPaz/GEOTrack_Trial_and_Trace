import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { log } from "../../utils/logger";

const DEFAULT_CHANNEL_ID = "default";

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
  cancelAll(): Promise<void>;
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

      if (finalStatus === "granted" && Platform.OS === "android") {
        await ensureAndroidChannel();
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
      await this.cancelAll();

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
        content: {
          title: "¡Buenos días! ☀️",
          body: "Es hora de iniciar tu jornada en LEDTracker.",
          sound: true,
          data: { action: "OPEN_DAILY_SETUP" },
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
