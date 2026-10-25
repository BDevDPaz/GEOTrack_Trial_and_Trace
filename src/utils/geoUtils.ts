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

// ─── Fase C (5): confirmación de salida por strikes ─────────────────────────
// Idea de dual-tracker (geofencePolicy.ts: zona de presencia con histéresis),
// adaptada: aquí solo se usa para CONFIRMAR una salida ya detectada por el SO.

export type PresenceZone = "INSIDE" | "OUTSIDE" | "UNKNOWN";

export interface PositionReading {
  distanceM: number;
  accuracyM: number | null | undefined;
  timestampMs: number;
}

/**
 * INSIDE: dentro del radio. OUTSIDE: más allá de radio + histéresis.
 * Franja intermedia o precisión mala → UNKNOWN (no cuenta ni resetea).
 */
export function presenceZone(
  r: PositionReading,
  radiusM: number,
  maxAccuracyM: number,
  hysteresisM = 50,
): PresenceZone {
  if (
    typeof r.accuracyM !== "number" ||
    !Number.isFinite(r.accuracyM) ||
    r.accuracyM > maxAccuracyM ||
    !Number.isFinite(r.distanceM)
  ) {
    return "UNKNOWN";
  }
  if (r.distanceM <= radiusM) return "INSIDE";
  if (r.distanceM >= radiusM + hysteresisM) return "OUTSIDE";
  return "UNKNOWN";
}

export interface ExitStrikeResult {
  confirmed: boolean;
  strikes: number;
  /** Momento de la primera lectura fuera de la racha vigente. */
  firstOutsideAtMs: number | null;
}

/**
 * Cuenta lecturas "fuera" consecutivas. Una lectura dentro resetea; las
 * imprecisas se ignoran; dos lecturas fuera a menos de minSpacingMs cuentan
 * como una sola.
 */
export function evaluateExitStrikes(
  readings: PositionReading[],
  radiusM: number,
  requiredReadings: number,
  opts: { maxAccuracyM: number; minSpacingMs?: number; hysteresisM?: number },
): ExitStrikeResult {
  const spacing = opts.minSpacingMs ?? 30_000;
  const required = Math.max(1, Math.floor(requiredReadings || 1));
  let strikes = 0;
  let first: number | null = null;
  let lastCounted: number | null = null;
  const sorted = [...readings].sort((a, b) => a.timestampMs - b.timestampMs);
  for (const r of sorted) {
    const zone = presenceZone(r, radiusM, opts.maxAccuracyM, opts.hysteresisM);
    if (zone === "INSIDE") {
      strikes = 0;
      first = null;
      lastCounted = null;
      continue;
    }
    if (zone === "UNKNOWN") continue;
    if (lastCounted !== null && r.timestampMs - lastCounted < spacing) continue;
    strikes += 1;
    lastCounted = r.timestampMs;
    if (first === null) first = r.timestampMs;
  }
  return { confirmed: strikes >= required, strikes, firstOutsideAtMs: first };
}
