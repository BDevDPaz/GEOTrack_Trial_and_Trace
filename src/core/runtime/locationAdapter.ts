import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../../utils/logger';

export const GEOFENCE_TASK = 'GEOFENCE_TRACKING_TASK';
export const EXIT_TIMESTAMP_KEY = 'LAST_GEOFENCE_EXIT_TIMESTAMP';

/**
 * CONTRATO ESTRICTO:
 * Maneja puramente el hardware del GPS y el almacenamiento efímero asociado.
 * NO debe contener lógica de negocio, ni llamar a la base de datos o notificaciones.
 * NOTA: Se permite el uso del logger del sistema para diagnóstico de errores de hardware.
 */
export interface LocationAdapter {
  requestPermissions(): Promise<{
    foreground: 'granted' | 'denied' | 'unknown';
    background: 'granted' | 'denied' | 'unknown';
  }>;
  startMonitoringArrival(
    identifier: string,
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<boolean>;
  stopMonitoring(): Promise<void>;
  
  // Manejo del estado efímero de salida (reemplaza las llamadas directas en toda la app)
  setLastExitTimestamp(timestampMs: number): Promise<void>;
  getLastExitTimestamp(): Promise<number | null>;
  clearLastExitTimestamp(): Promise<void>;
}

export const locationAdapter: LocationAdapter = {
  
  async requestPermissions() {
    try {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();

      let bgStatus: Location.PermissionStatus | 'unknown' = 'unknown';
      if (fgStatus === 'granted') {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        bgStatus = status;
      }

      return {
        foreground: fgStatus as 'granted' | 'denied' | 'unknown',
        background: bgStatus as 'granted' | 'denied' | 'unknown',
      };
    } catch (error) {
      log('ROJO', 'PERMISOS', 'ERROR', 'Fallo al solicitar permisos de ubicación', error);
      return {
        foreground: 'unknown',
        background: 'unknown',
      };
    }
  },

  async startMonitoringArrival(
    identifier: string,
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<boolean> {
    try {
      await Location.startGeofencingAsync(GEOFENCE_TASK, [
        {
          identifier,
          latitude,
          longitude,
          radius: radiusMeters,
          notifyOnEnter: true,
          notifyOnExit: true,
        },
      ]);

      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch((err) => {
        log('AMARILLO', 'UBICACION', 'WARN', 'GPS Warm-up falló en adapter', err);
      });

      return true;
    } catch (error) {
      log('ROJO', 'UBICACION', 'ERROR', 'Error iniciando Geofencing en adapter', error);
      return false;
    }
  },

  async stopMonitoring(): Promise<void> {
    try {
      await Promise.all([
        Location.stopGeofencingAsync(GEOFENCE_TASK).catch((err) => {
          log('AMARILLO', 'UBICACION', 'WARN', 'Error deteniendo geofencing en adapter', err);
        }),
        Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch((err) => {
          log('AMARILLO', 'UBICACION', 'WARN', 'Error deteniendo updates en adapter', err);
        }),
        this.clearLastExitTimestamp(),
      ]);
    } catch (error) {
      log('ROJO', 'UBICACION', 'ERROR', 'Fallo crítico en stopMonitoring del adapter', error);
    }
  },

  async setLastExitTimestamp(timestampMs: number): Promise<void> {
    try {
      await AsyncStorage.setItem(EXIT_TIMESTAMP_KEY, timestampMs.toString());
    } catch (error) {
      log('ROJO', 'SISTEMA', 'ERROR', 'Error guardando EXIT_TIMESTAMP en AsyncStorage', error);
    }
  },

  async getLastExitTimestamp(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(EXIT_TIMESTAMP_KEY);
      if (!value) return null;
      
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    } catch (error) {
      log('ROJO', 'SISTEMA', 'ERROR', 'Error leyendo EXIT_TIMESTAMP de AsyncStorage', error);
      return null;
    }
  },

  async clearLastExitTimestamp(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY);
    } catch (error) {
      log('ROJO', 'SISTEMA', 'ERROR', 'Error eliminando EXIT_TIMESTAMP de AsyncStorage', error);
    }
  }
};
