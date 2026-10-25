/**
 * Fase D (10): PIN de administrador.
 * - Se guarda solo hash(sal + PIN) con sal aleatoria por dispositivo.
 * - 5 fallos seguidos → bloqueo temporal (5 min); un acierto resetea.
 * - Sin PIN configurado, la validación falla (fail-secure).
 * Puro: almacenamiento, hash y sal se inyectan (SecureStore/expo-crypto en la app).
 */
export const PIN_HASH_KEY = "geotrack_admin_pin_hash";
export const PIN_SALT_KEY = "geotrack_admin_pin_salt";
export const PIN_FAILS_KEY = "geotrack_admin_pin_fails";
export const PIN_LOCK_UNTIL_KEY = "geotrack_admin_pin_lock_until";
export const PIN_MAX_FAILS = 5;
export const PIN_LOCK_MS = 5 * 60 * 1000;

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface PinDeps {
  store: KeyValueStore;
  sha256: (input: string) => Promise<string>;
  randomSalt: () => Promise<string>;
}

export type PinVerifyResult =
  | { ok: true; reason: "OK" }
  | { ok: false; reason: "NOT_SET" }
  | { ok: false; reason: "LOCKED"; lockedUntilMs: number }
  | { ok: false; reason: "WRONG"; remainingAttempts: number; lockedUntilMs: number | null };

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const hashPin = (deps: PinDeps, salt: string, pin: string) =>
  deps.sha256(`${salt}:${pin}`);

export async function hasAdminPin(deps: PinDeps): Promise<boolean> {
  return !!(await deps.store.get(PIN_HASH_KEY));
}

export async function setAdminPin(deps: PinDeps, pin: string): Promise<void> {
  const clean = pin.trim();
  if (!isValidPinFormat(clean)) throw new Error("PIN_FORMAT_INVALID");
  const salt = await deps.randomSalt();
  const hash = await hashPin(deps, salt, clean);
  await deps.store.set(PIN_SALT_KEY, salt);
  await deps.store.set(PIN_HASH_KEY, hash);
  await deps.store.remove(PIN_FAILS_KEY);
  await deps.store.remove(PIN_LOCK_UNTIL_KEY);
}

export async function verifyAdminPin(
  deps: PinDeps,
  candidate: string,
  nowMs: number,
): Promise<PinVerifyResult> {
  const [hash, salt] = await Promise.all([
    deps.store.get(PIN_HASH_KEY),
    deps.store.get(PIN_SALT_KEY),
  ]);
  if (!hash || !salt) return { ok: false, reason: "NOT_SET" };

  const lockUntil = Number((await deps.store.get(PIN_LOCK_UNTIL_KEY)) ?? 0);
  if (lockUntil > nowMs) return { ok: false, reason: "LOCKED", lockedUntilMs: lockUntil };

  const candidateHash = await hashPin(deps, salt, candidate.trim());
  if (safeEqual(candidateHash, hash)) {
    await deps.store.remove(PIN_FAILS_KEY);
    await deps.store.remove(PIN_LOCK_UNTIL_KEY);
    return { ok: true, reason: "OK" };
  }

  const fails = Number((await deps.store.get(PIN_FAILS_KEY)) ?? 0) + 1;
  if (fails >= PIN_MAX_FAILS) {
    const until = nowMs + PIN_LOCK_MS;
    await deps.store.set(PIN_LOCK_UNTIL_KEY, String(until));
    await deps.store.set(PIN_FAILS_KEY, "0");
    return { ok: false, reason: "WRONG", remainingAttempts: 0, lockedUntilMs: until };
  }
  await deps.store.set(PIN_FAILS_KEY, String(fails));
  return { ok: false, reason: "WRONG", remainingAttempts: PIN_MAX_FAILS - fails, lockedUntilMs: null };
}
