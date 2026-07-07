import { now, currentDate } from "../utils/timeProvider";
// --- src/services/BackgroundTasks.ts ---
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { log } from '../utils/logger';
import {
  ensureDbReady,
} from '../database/db';
// types removed
import { generateWeeklyReport } from './ReportGenerator';
import { EXIT_TIMESTAMP_KEY } from './LocationManager';
import { workTrackerEngine } from '../core/workTrackerEngine';
type WorkSession = any;

const TASK_NAME = 'APP_BACKGROUND_SERVICES';
const REPORT_STORAGE_KEY = 'LAST_REPORT_WEEK_ID';
const FAILSAFE_THRESHOLD_MS = 15 * 60 * 1000;

// Mutex para evitar concurrencia del SO
let isTaskRunning = false;

TaskManager.defineTask(TASK_NAME, async () => {
  if (isTaskRunning) {
    log(
      'BLANCO',
      'SIN_CAMBIOS',
      'DEBUG',
      'Mutex bloqueado: Tarea omitida por ejecución concurrente.'
    );
    return BackgroundTask.BackgroundTaskResult.Success;
  }

  isTaskRunning = true;
  log('BLANCO', 'BACKGROUND_TASK', 'DEBUG', 'Tarea iniciada por el sistema...');

  let newDataProcessed = false;

  try {
    const db = await ensureDbReady();
    const nowTime = now();

    // -----------------------------
    // FAILSAFE AUTO CHECK-OUT GPS
    // -----------------------------
    try {
      const lastExitStr = await AsyncStorage.getItem(EXIT_TIMESTAMP_KEY);

      if (lastExitStr) {
        const exitTime = parseInt(lastExitStr, 10);

        if (Number.isNaN(exitTime) || exitTime > nowTime) {
          await AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY);
        } else {
          const timeDiff = nowTime - exitTime;

          if (timeDiff > FAILSAFE_THRESHOLD_MS) {
            const session = await db.getFirstAsync<WorkSession>(
              'SELECT * FROM work_sessions ORDER BY id DESC LIMIT 1'
            );

            if (session?.id && session.status === 'active') {
              log(
                'AMARILLO',
                'ADVERTENCIA',
                'WARN',
                `Auto Check-out (GPS) necesario para sesión #${session.id} por inactividad. Notificando engine...`
              );

              // Se notifica al engine para que ejecute el flujo completo (DB + side effects)
              await workTrackerEngine.dispatch({
                  type: 'SESSION_AUTO_CHECKOUT_GPS',
                  sessionId: session.id,
                  endAtMs: exitTime // Preserva la hora real de salida
              });

              newDataProcessed = true;
            } else {
              await AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY);
            }
          }
        }
      }
    } catch (failsafeError) {
      log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error en Failsafe', failsafeError);
    }

    // -----------------------------
    // REPORTE SEMANAL
    // -----------------------------
    try {
      const today = currentDate();
      const day = today.day();

      const isReportWindow =
        (day === 0 && today.hour() >= 20) || day === 1 || day === 2;

      if (isReportWindow) {
        const targetWeek = day === 0 ? today : today.subtract(1, 'week');
        const startTs = targetWeek.startOf('isoWeek').valueOf();
        const endTs = targetWeek.endOf('isoWeek').valueOf();
        const currentWeekId = targetWeek.startOf('isoWeek').format('YYYY-MM-DD');
        const lastReported = await AsyncStorage.getItem(REPORT_STORAGE_KEY);

        if (lastReported !== currentWeekId) {
          // NOTA: Se mantiene generateWeeklyReport aquí por ser una tarea pesada de background,
          // pero se podría mover a un efecto disparado por un evento del engine si fuera necesario.
          // Por ahora alineamos solo el flujo de sesión.
          const pdfUri = await generateWeeklyReport(false, {
            start: startTs,
            end: endTs,
          });

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

    if (newDataProcessed) {
      log('BLANCO', 'BACKGROUND_TASK', 'INFO', 'Tarea completada con trabajo útil.');
    } else {
      log('BLANCO', 'SIN_CAMBIOS', 'DEBUG', 'Tarea completada sin cambios.');
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (criticalError) {
    log(
      'ROJO',
      'ERROR_CRITICO',
      'ERROR',
      'Error Crítico General en BackgroundTasks',
      criticalError
    );
    return BackgroundTask.BackgroundTaskResult.Failed;
  } finally {
    isTaskRunning = false;
  }
});

export const BackgroundTasks = {
  register: async () => {
    try {
      const status = await BackgroundTask.getStatusAsync();

      if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
        log('AMARILLO', 'ADVERTENCIA', 'WARN', 'Background Task restringido por el SO.');
        return;
      }

      const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);

      if (!isRegistered) {
        await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
        log(
          'VERDE',
          'SERVICIOS_ACTIVOS',
          'INFO',
          'Servicios de fondo (Failsafe + Reportes) registrados.'
        );
      } else {
        log(
          'VERDE',
          'SERVICIOS_ACTIVOS',
          'INFO',
          'Servicios de fondo ya estaban registrados.'
        );
      }
    } catch (e) {
      log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error registrando background tasks', e);
    }
  },

  unregister: async () => {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);

      if (isRegistered) {
        await BackgroundTask.unregisterTaskAsync(TASK_NAME);
      }

      log('ROJO', 'MONITOREO_DETENIDO', 'ERROR', 'Servicios de fondo detenidos.');
    } catch (e) {
      log('ROJO', 'ERROR_CRITICO', 'ERROR', 'Error al desregistrar tarea', e);
    }
  },

  triggerForTesting: async () => {
    if (__DEV__) {
      try {
        await BackgroundTask.triggerTaskWorkerForTestingAsync();
        log(
          'BLANCO',
          'BACKGROUND_TASK',
          'DEBUG',
          'Background task disparado manualmente para pruebas.'
        );
      } catch (e) {
        log(
          'ROJO',
          'ERROR_CRITICO',
          'ERROR',
          'Error disparando background task de prueba',
          e
        );
      }
    } else {
      log(
        'AMARILLO',
        'ADVERTENCIA',
        'WARN',
        'triggerForTesting solo está disponible en builds de desarrollo.'
      );
    }
  },
};
