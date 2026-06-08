import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GEOFENCE_TASK = 'GEOFENCE_TRACKING_TASK';
export const EXIT_TIMESTAMP_KEY = 'LAST_GEOFENCE_EXIT_TIMESTAMP';

/**
 * CONTRATO ESTRICTO:
 * Maneja puramente el hardware del GPS y el almacenamiento efímero asociado.
 * NO debe contener lógica de negocio, ni llamar a la base de datos o notificaciones.
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
    // 1. Pedimos permisos en primer plano
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    
    // 2. Pedimos permisos en segundo plano (requeridos para geocercas)
    let bgStatus: Location.PermissionStatus | 'unknown' = 'unknown';
    if (fgStatus === 'granted') {
      const { status } = await Location.requestBackgroundPermissionsAsync();
      bgStatus = status;
    }

    return {
      foreground: fgStatus as 'granted' | 'denied' | 'unknown',
      background: bgStatus as 'granted' | 'denied' | 'unknown',
    };
  },

  async startMonitoringArrival(
    identifier: string,
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<boolean> {
    try {
      // Configuramos la geocerca nativa
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

      // "Warm-up" del GPS para asegurar precisión inicial
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch(() => { /* Ignoramos fallos de calentamiento */ });

      return true;
    } catch (error) {
      console.error('Error iniciando geocerca en LocationAdapter:', error);
      return false;
    }
  },

  async stopMonitoring(): Promise<void> {
    try {
      await Promise.all([
        Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {}),
        Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {}),
        this.clearLastExitTimestamp(), // Limpieza implícita al detener
      ]);
    } catch (error) {
      console.error('Error deteniendo monitoreo en LocationAdapter:', error);
    }
  },

  // --- Abstracción del AsyncStorage para el Timestamp de Salida ---

  async setLastExitTimestamp(timestampMs: number): Promise<void> {
    try {
      await AsyncStorage.setItem(EXIT_TIMESTAMP_KEY, timestampMs.toString());
    } catch (error) {
      console.error('Error guardando EXIT_TIMESTAMP:', error);
    }
  },

  async getLastExitTimestamp(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(EXIT_TIMESTAMP_KEY);
      if (!value) return null;
      
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    } catch (error) {
      console.error('Error leyendo EXIT_TIMESTAMP:', error);
      return null;
    }
  },

  async clearLastExitTimestamp(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error limpiando EXIT_TIMESTAMP:', error);
    }
  }
};
