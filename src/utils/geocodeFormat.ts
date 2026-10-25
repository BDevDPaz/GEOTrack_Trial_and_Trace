/**
 * Fase D (12): dirección legible del punto donde se configuró la jornada.
 * Idea de LED 270126 (dirección inversa en el resumen), adaptada: nunca
 * bloquea ni falla la creación; ante error/timeout devuelve null.
 */
export interface GeocodeLike {
  name?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  city?: string | null;
  district?: string | null;
  region?: string | null;
}

export function formatReverseGeocode(r: GeocodeLike | null | undefined): string | null {
  if (!r) return null;
  const street = [r.street, r.streetNumber].filter(Boolean).join(" ").trim();
  const parts = [street || r.name, r.city || r.district, r.region]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  const unique = parts.filter((p, i) => parts.indexOf(p) === i);
  return unique.length ? unique.join(", ") : null;
}

export const REVERSE_GEOCODE_TIMEOUT_MS = 8000;

export async function reverseGeocodeSafe(
  fn: (coords: { latitude: number; longitude: number }) => Promise<GeocodeLike[]>,
  latitude: number,
  longitude: number,
  timeoutMs: number = REVERSE_GEOCODE_TIMEOUT_MS,
): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    const results = await Promise.race([fn({ latitude, longitude }), timeout]);
    return Array.isArray(results) ? formatReverseGeocode(results[0]) : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
