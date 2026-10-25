import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import {
  hasAdminPin,
  setAdminPin,
  verifyAdminPin,
  PinDeps,
  PinVerifyResult,
} from "../../security/adminPin";

/**
 * CONTRATO ESTRICTO:
 * Maneja puramente la validación criptográfica y de credenciales.
 * NO debe mantener el estado visual de "desbloqueado" ni mostrar alertas.
 * Fase D (10): PIN configurado por el usuario, hash con sal en SecureStore.
 */
export interface SecurityAdapter {
  validateAdminPin(candidatePin: string): Promise<boolean>;
  verifyAdminPinDetailed(candidatePin: string): Promise<PinVerifyResult>;
  hasAdminPin(): Promise<boolean>;
  setAdminPin(pin: string): Promise<void>;
}

const secureDeps: PinDeps = {
  store: {
    get: (k) => SecureStore.getItemAsync(k),
    set: (k, v) => SecureStore.setItemAsync(k, v),
    remove: (k) => SecureStore.deleteItemAsync(k),
  },
  sha256: (s) =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, s),
  randomSalt: async () =>
    Array.from(Crypto.getRandomBytes(16))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
};

export function createSecurityAdapter(deps: PinDeps): SecurityAdapter {
  const detailed = async (pin: string): Promise<PinVerifyResult> => {
    try {
      // Retardo protector contra fuerza bruta
      await new Promise<void>((resolve) => setTimeout(resolve, 650));
      return await verifyAdminPin(deps, pin, Date.now());
    } catch (error) {
      console.error("Fallo en la validación dentro de securityAdapter:", error);
      return { ok: false, reason: "NOT_SET" }; // fail-secure
    }
  };
  return {
    verifyAdminPinDetailed: detailed,
    validateAdminPin: async (pin) => (await detailed(pin)).ok,
    hasAdminPin: async () => {
      try {
        return await hasAdminPin(deps);
      } catch {
        return false;
      }
    },
    setAdminPin: (pin) => setAdminPin(deps, pin),
  };
}

export const securityAdapter: SecurityAdapter = createSecurityAdapter(secureDeps);
