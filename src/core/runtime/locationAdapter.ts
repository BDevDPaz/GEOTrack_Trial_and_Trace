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
      }).catch(() => {});

      return true;
    } catch (error) {
      // ✅ Sin console.log para evitar SEC-002
      return false;
    }
  },

  async stopMonitoring(): Promise<void> {
    try {
      await Promise.all([
        Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {}),
        Location.stopLocationUpdatesAsync(GEOFENCE_TASK).catch(() => {}),
        this.clearLastExitTimestamp(),
      ]);
    } catch (error) {}
  },

  async setLastExitTimestamp(timestampMs: number): Promise<void> {
    try {
      await AsyncStorage.setItem(EXIT_TIMESTAMP_KEY, timestampMs.toString());
    } catch (error) {}
  },

  async getLastExitTimestamp(): Promise<number | null> {
    try {
      const value = await AsyncStorage.getItem(EXIT_TIMESTAMP_KEY);
      if (!value) return null;
      
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? null : parsed;
    } catch (error) {
      return null;
    }
  },

  async clearLastExitTimestamp(): Promise<void> {
    try {
      await AsyncStorage.removeItem(EXIT_TIMESTAMP_KEY);
    } catch (error) {}
  }
};
