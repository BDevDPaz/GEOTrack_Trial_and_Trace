import { closeStaleSessions } from "../staleSessionGuard";

const H = 3_600_000;
const NOW = 1_800_000_000_000;

const deps = (rows: any[], known = true) => ({
  getOpenSessions: jest.fn().mockResolvedValue(rows),
  getNextSessionStart: jest.fn().mockResolvedValue(null),
  lastExitTimestampMs: null,
  engineKnows: jest.fn(() => known),
  dispatchStale: jest.fn(),
  persistStale: jest.fn(),
});

describe("closeStaleSessions (tarea de fondo)", () => {
  it("despacha el evento si el motor conoce la sesión", async () => {
    const d = deps([{ id: 7, status: "ACTIVE_WORK", start_time: NOW - 13 * H, actual_start_time: null, end_time: null }]);
    expect(await closeStaleSessions(d, NOW)).toEqual([7]);
    expect(d.dispatchStale).toHaveBeenCalledWith(7, NOW - H);
  });
  it("persiste directo si el motor no está rehidratado", async () => {
    const d = deps([{ id: 7, status: "PAUSED", start_time: NOW - 20 * H, actual_start_time: null, end_time: null, last_pause_start_ms: NOW - 18 * H }], false);
    await closeStaleSessions(d, NOW);
    expect(d.persistStale).toHaveBeenCalledWith(7, NOW - 18 * H);
  });
  it("no toca sesiones de menos de 12 h", async () => {
    const d = deps([{ id: 7, status: "ACTIVE_WORK", start_time: NOW - 2 * H, actual_start_time: null, end_time: null }]);
    expect(await closeStaleSessions(d, NOW)).toEqual([]);
  });
});
