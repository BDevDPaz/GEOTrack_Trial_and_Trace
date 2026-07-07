import { now, currentDate } from "../utils/timeProvider";
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../utils/logger';
import { ensureDbReady } from '../database/db';
import { generateWeeklyReport } from './ReportGenerator';
import { EXIT_TIMESTAMP_KEY } from './LocationManager';
import { workTrackerEngine } from '../core/workTrackerEngine';

type WorkSession = any;
const TASK_NAME = 'APP_BACKGROUND_SERVICES';
const REPORT_STORAGE_KEY = 'LAST_REPORT_WEEK_ID';
const FAILSAFE_THRESHOLD_MS = 15 * 60 * 1000;

let isTaskRunning = false;

TaskManager.defineTask(TASK_NAME, async () => {
  if (isTaskRunning) return BackgroundTask.BackgroundTaskResult.Success;
  isTaskRunning = true;
  let newDataProcessed = false;

  try {
    const db = await ensureDbReady();
    const nowTime = now();
    await workTrackerEngine.dispatch({ type: 'BACKGROUND_TASK_STARTED' });

    try {
      const lastExitStr = await AsyncStorage.getItem(EXIT_TIMESTAMP_KEY);
      if (lastExitStr) {
        const exitTime = parseInt(lastExitStr, 10);
        if (Number.isNaN(exitTime) || exitTime > nowTime) {
          await AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY);
        } else if ((nowTime - exitTime) > FAILSAFE_THRESHOLD_MS) {
          const session = await db.getFirstAsync<WorkSession>(
            'SELECT * FROM work_sessions WHERE isDeleted = 0 ORDER BY id DESC LIMIT 1'
          );
          if (session?.id && session.status === 'active') {
            log('AMARILLO', 'ADVERTENCIA', 'WARN', `Auto Check-out (GPS) necesario para sesión #${session.id}. Notificando engine...`);
            await workTrackerEngine.dispatch({
                type: 'SESSION_AUTO_CHECKOUT_GPS',
                sessionId: session.id,
                endAtMs: exitTime
            });
            newDataProcessed = true;
          } else {
            await AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY);
          }
        }
      }
    } catch (failsafeError) {
      log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error en Failsafe de fondo', failsafeError);
    }

    // Weekly Report logic
    try {
      const today = currentDate();
      const day = today.day();
      const isReportWindow = (day === 0 && today.hour() >= 20) || day === 1 || day === 2;
      if (isReportWindow) {
        const targetWeek = day === 0 ? today : today.subtract(1, 'week');
        const startTs = targetWeek.startOf('isoWeek').valueOf();
        const endTs = targetWeek.endOf('isoWeek').valueOf();
        const currentWeekId = targetWeek.startOf('isoWeek').format('YYYY-MM-DD');
        const lastReported = await AsyncStorage.getItem(REPORT_STORAGE_KEY);

        if (lastReported !== currentWeekId) {
          const pdfUri = await generateWeeklyReport(false, { start: startTs, end: endTs });
          if (pdfUri) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '📄 Reporte Semanal Listo',
                body: 'Toca para revisar y enviar tu nómina.',
                data: { action: 'GENERATE_REPORT_PROMPT' },
                sound: true,
              },
              trigger: null,
            });
            await AsyncStorage.setItem(REPORT_STORAGE_KEY, currentWeekId);
            newDataProcessed = true;
          }
        }
      }
    } catch (reportError) {
      log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error en Reporte', reportError);
    }

    await workTrackerEngine.dispatch({ type: 'BACKGROUND_TASK_FINISHED' });
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (criticalError) {
    log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error en BackgroundTasks', criticalError);
    return BackgroundTask.BackgroundTaskResult.Failed;
  } finally {
    isTaskRunning = false;
  }
});

export const BackgroundTasks = {
  register: async () => {
    try {
      const status = await BackgroundTask.getStatusAsync();
      if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;
      const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
      if (!isRegistered) {
        await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
        log('VERDE', 'SERVICIOS_ACTIVOS', 'INFO', 'Servicios de fondo registrados.');
      }
    } catch (e) {
      log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error registrando tasks', e);
    }
  },
  unregister: async () => {
    try {
      if (await TaskManager.isTaskRegisteredAsync(TASK_NAME)) {
        await BackgroundTask.unregisterTaskAsync(TASK_NAME);
      }
    } catch (e) {
      log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error unregistering', e);
    }
  },
  triggerForTesting: async () => {
    if (__DEV__) await BackgroundTask.triggerTaskWorkerForTestingAsync();
  },
};
