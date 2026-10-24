// src/services/AddressResolver.ts
//
// Resuelve la dirección de una jornada a coordenadas reales antes de iniciar.
// Idea tomada de LEDTracker 270126 (handleStartDay / DailySetupModal.handleStart),
// rehecha para GEOTrack: lógica pura y testeable, sin UI. La UI decide cómo
// mostrar cada resultado (bloquear, confirmar, advertir).
import * as Location from "expo-location";
import { getDistanceFromLatLonInMeters } from "../utils/geoUtils";
import { log } from "../utils/logger";

export const DEFAULT_DISTANCE_WARNING_METERS = 2000;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type AddressResolution =
  | { status: "ok"; coords: Coordinates; formattedAddress: string }
  | { status: "empty" }
  | { status: "not_found" }
  | { status: "error" };

export type CurrentPositionResult =
  | { status: "ok"; coords: Coordinates }
  | { status: "permission_denied" }
  | { status: "unavailable" };

export type StartCheck =
  | {
      kind: "blocked";
      reason: "empty" | "not_found" | "geocode_error" | "permission_denied";
    }
  | {
      kind: "ready";
      target: Coordinates;
      formattedAddress: string;
      current: Coordinates | null;
      distanceMeters: number | null;
      isFar: boolean;
    };

export const isValidCoords = (
  c: Partial<Coordinates> | null | undefined,
): c is Coordinates =>
  !!c &&
  typeof c.latitude === "number" &&
  typeof c.longitude === "number" &&
  Number.isFinite(c.latitude) &&
  Number.isFinite(c.longitude) &&
  c.latitude >= -90 &&
  c.latitude <= 90 &&
  c.longitude >= -180 &&
  c.longitude <= 180;

function formatReverse(
  r: Location.LocationGeocodedAddress | undefined,
): string | null {
  if (!r) return null;
  if (r.formattedAddress) return r.formattedAddress;
  const street = [r.streetNumber, r.street].filter(Boolean).join(" ");
  const parts = [street || r.name, r.city, r.region, r.postalCode].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : null;
}

export async function resolveAddress(
  address: string,
): Promise<AddressResolution> {
  const trimmed = (address ?? "").trim();
  if (!trimmed) return { status: "empty" };
  try {
    const results = await Location.geocodeAsync(trimmed);
    const first = results?.find((r) => isValidCoords(r));
    if (!first) return { status: "not_found" };
    const coords = { latitude: first.latitude, longitude: first.longitude };
    let formatted: string | null = null;
    try {
      const rev = await Location.reverseGeocodeAsync(coords);
      formatted = formatReverse(rev?.[0]);
    } catch (err) {
      log(
        "AMARILLO",
        "UBICACION",
        "WARN",
        "reverseGeocode falló; se usa el texto ingresado",
        err,
      );
    }
    return { status: "ok", coords, formattedAddress: formatted ?? trimmed };
  } catch (err) {
    log("ROJO", "UBICACION", "ERROR", "geocodeAsync falló", err);
    return { status: "error" };
  }
}

export async function getCurrentCoords(): Promise<CurrentPositionResult> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted")
      perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return { status: "permission_denied" };
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    };
    return isValidCoords(coords)
      ? { status: "ok", coords }
      : { status: "unavailable" };
  } catch (err) {
    log(
      "AMARILLO",
      "UBICACION",
      "WARN",
      "No se pudo obtener la ubicación actual",
      err,
    );
    return { status: "unavailable" };
  }
}

export function evaluateDistance(
  target: Coordinates,
  current: Coordinates | null,
  thresholdMeters: number,
): { distanceMeters: number | null; isFar: boolean } {
  if (!current || !isValidCoords(current) || !isValidCoords(target)) {
    return { distanceMeters: null, isFar: false };
  }
  const d = getDistanceFromLatLonInMeters(
    current.latitude,
    current.longitude,
    target.latitude,
    target.longitude,
  );
  const limit =
    Number.isFinite(thresholdMeters) && thresholdMeters > 0
      ? thresholdMeters
      : DEFAULT_DISTANCE_WARNING_METERS;
  return { distanceMeters: d, isFar: d > limit };
}

/**
 * Verificación completa previa al inicio:
 * - Dirección vacía / no encontrada / error de geocoder -> bloqueado.
 * - Permiso de ubicación denegado -> bloqueado (sin permiso no hay geocerca).
 * - GPS no disponible momentáneamente -> listo, sin distancia (no se advierte).
 */
export async function checkStart(
  address: string,
  thresholdMeters: number,
): Promise<StartCheck> {
  const res = await resolveAddress(address);
  if (res.status === "empty") return { kind: "blocked", reason: "empty" };
  if (res.status === "not_found")
    return { kind: "blocked", reason: "not_found" };
  if (res.status === "error")
    return { kind: "blocked", reason: "geocode_error" };

  const pos = await getCurrentCoords();
  if (pos.status === "permission_denied")
    return { kind: "blocked", reason: "permission_denied" };
  const current = pos.status === "ok" ? pos.coords : null;
  const { distanceMeters, isFar } = evaluateDistance(
    res.coords,
    current,
    thresholdMeters,
  );
  return {
    kind: "ready",
    target: res.coords,
    formattedAddress: res.formattedAddress,
    current,
    distanceMeters,
    isFar,
  };
}
