export const MAX_ACCEPTABLE_ACCURACY_METERS = 50;
export const MAX_ENTRY_SPEED_KMH = 15;
export const MAX_EXIT_SPEED_KMH = 25;
export const REQUIRED_ENTRY_DWELL_TIME_MS = 10_000;
export const REQUIRED_EXIT_DWELL_TIME_MS = 10_000;
export const GEOFENCE_ANTI_REBOUNCE_MS = 5_000;
export const MAX_INSTANT_LOCATION_JUMP_METERS = 500;
export const IMPOSSIBLE_SPEED_KMH = 200;

/** Fase C (5): confirmación de salida por N lecturas consecutivas fuera. */
export const EXIT_CONFIRM_DEFAULT_READINGS = 3;
export const EXIT_CONFIRM_MIN_SPACING_MS = 30_000;
/** Histéresis de zona de presencia (idea de dual-tracker geofencePolicy). */
export const PRESENCE_HYSTERESIS_METERS = 50;
