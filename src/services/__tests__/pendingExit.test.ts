import { resolvePendingExit, savePendingExit, loadPendingExit, PendingExit } from "../pendingExit";

const P: PendingExit = { sessionId: 5, firstExitAtMs: 1_000, radiusM: 100, regionLatitude: 1, regionLongitude: 2, strikes: 1, required: 3 };

function deps(over: any = {}) {
  const mem = new Map<string, string>();
  const d: any = {
    storage: { getItem: async (k: string) => mem.get(k) ?? null, setItem: async (k: string, v: string) => void mem.set(k, v), removeItem: async (k: string) => void mem.delete(k) },
    nowMs: 60_000, maxAgeMs: 12 * 3600_000, maxAccuracyM: 50, hysteresisM: 50,
    getSessionStatus: jest.fn().mockResolvedValue("ACTIVE_WORK"),
    readPosition: jest.fn().mockResolvedValue({ distanceM: 400, accuracyM: 10, timestampMs: 60_000 }),
    dispatchExit: jest.fn(),
    ...over,
  };
  return { d, mem };
}

describe("salida pendiente al reabrir", () => {
  it("sin pendiente → NONE", async () => {
    expect(await resolvePendingExit(deps().d)).toBe("NONE");
  });
  it("fuera (≥ radio+50) → emite salida con la hora del primer EXIT y limpia", async () => {
    const { d } = deps(); await savePendingExit(d, P);
    expect(await resolvePendingExit(d)).toBe("EXIT_DISPATCHED");
    expect(d.dispatchExit).toHaveBeenCalledWith(5, 1_000);
    expect(await loadPendingExit(d)).toBeNull();
  });
  it("dentro → descarta, la jornada sigue", async () => {
    const { d } = deps({ readPosition: jest.fn().mockResolvedValue({ distanceM: 20, accuracyM: 10, timestampMs: 1 }) });
    await savePendingExit(d, P);
    expect(await resolvePendingExit(d)).toBe("DISCARDED_INSIDE");
    expect(d.dispatchExit).not.toHaveBeenCalled();
  });
  it("banda ±50 m o sin GPS → se conserva para el siguiente intento", async () => {
    const { d } = deps({ readPosition: jest.fn().mockResolvedValue({ distanceM: 120, accuracyM: 10, timestampMs: 1 }) });
    await savePendingExit(d, P);
    expect(await resolvePendingExit(d)).toBe("KEPT_UNKNOWN");
    expect(await loadPendingExit(d)).not.toBeNull();
    d.readPosition = jest.fn().mockRejectedValue(new Error("gps"));
    expect(await resolvePendingExit(d)).toBe("KEPT_UNKNOWN");
  });
  it("en pausa, cerrada o vieja → descarta sin emitir", async () => {
    for (const [status, now, out] of [["PAUSED", 60_000, "DISCARDED_PAUSED"], [null, 60_000, "DISCARDED_SESSION"], ["ACTIVE_WORK", 13 * 3600_000, "DISCARDED_STALE"]] as const) {
      const { d } = deps({ getSessionStatus: jest.fn().mockResolvedValue(status), nowMs: now });
      await savePendingExit(d, P);
      expect(await resolvePendingExit(d)).toBe(out);
      expect(d.dispatchExit).not.toHaveBeenCalled();
    }
  });
});
