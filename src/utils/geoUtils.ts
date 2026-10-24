// src/utils/geoUtils.ts

/**
 * Calcula la distancia en metros entre dos coordenadas.
 * Usa la fórmula de Haversine.
 */
export const getDistanceFromLatLonInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

  const R = 6371e3; // Radio de la tierra en metros
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en metros
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

/**
 * Devuelve coordenadas válidas o null. Nunca sustituye por 0,0
 * (0,0 es un punto real en el océano y crearía una geocerca falsa).
 */
export const toValidCoords = (
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): { latitude: number; longitude: number } | null => {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
};
