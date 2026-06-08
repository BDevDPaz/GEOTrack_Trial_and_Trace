import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DEFAULT_CHANNEL_ID = 'default';

/**
 * CONTRATO ESTRICTO:
 * Maneja puramente la API nativa de notificaciones.
 * NO debe consultar la base de datos (settings) directamente.
 */
export interface NotificationsAdapter {
  requestPermissions(): Promise<'granted' | 'denied' | 'unknown'>;
  scheduleDailyReminder(timeString: string): Promise<void>;
  notifyImmediate(title: string, body: string, data?: Record<string, unknown>): Promise<void>;
  cancelAll(): Promise<void>;
}

export const notificationsAdapter: NotificationsAdapter = {

  async requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Si se otorgan permisos y es Android, garantizamos el canal
    if (finalStatus === 'granted' && Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
        name: DEFAULT_CHANNEL_ID,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return finalStatus as 'granted' | 'denied' | 'unknown';
  },

  async scheduleDailyReminder(timeString: string): Promise<void> {
    try {
      await this.cancelAll(); // Limpiamos programaciones anteriores

      const [hourStr, minuteStr] = timeString.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`Hora inválida para notificación diaria: "${timeString}"`);
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '¡Buenos días! ☀️',
          body: 'Es hora de iniciar tu jornada en LEDTracker.',
          sound: true,
          data: { action: 'OPEN_DAILY_SETUP' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: Platform.OS === 'android' ? DEFAULT_CHANNEL_ID : undefined,
        },
      });
    } catch (error) {
      console.error('Error en notificationsAdapter agendando recordatorio:', error);
    }
  },

  async notifyImmediate(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          vibrate: [0, 500, 200, 500],
        },
        trigger: null, // trigger null hace que se dispare inmediatamente
      });
    } catch (error) {
      console.error('Error en notificationsAdapter lanzando notificación inmediata:', error);
    }
  },

  async cancelAll(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error en notificationsAdapter cancelando notificaciones:', error);
    }
  }
};
