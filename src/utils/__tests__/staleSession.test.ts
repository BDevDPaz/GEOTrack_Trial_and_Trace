import { computeStaleClose, STALE_SESSION_MAX_MS } from "../staleSession";

const H = 60 * 60 * 1000;
const start = 1_700_000_000_000;

describe("computeStaleClose (Fase B, 4)", () => {
  it("sesión de 13 h → cerrada en inicio + 12 h", () => {
    expect(
      computeStaleClose({ status: "ACTIVE_WORK", startAtMs: start, endAtMs: null }, start + 13 * H),
    ).toEqual({ endAtMs: start + STALE_SESSION_MAX_MS, reason: "STALE_12H" });
  });
  it("sesión de 11 h no se toca", () => {
    expect(
      computeStaleClose({ status: "ACTIVE_WORK", startAtMs: start, endAtMs: null }, start + 11 * H),
    ).toBeNull();
  });
  it("con salida registrada → cierra en la salida", () => {
    expect(
      computeStaleClose(
        { status: "ACTIVE_WORK", startAtMs: start, endAtMs: null, lastExitTimestampMs: start + 5 * H },
        start + 20 * H,
      )?.endAtMs,
    ).toBe(start + 5 * H);
  });
  it("en pausa → cierra en el inicio de la pausa", () => {
    expect(
      computeStaleClose(
        { status: "PAUSED", startAtMs: start, endAtMs: null, lastPauseStartMs: start + 3 * H },
        start + 14 * H,
      )?.endAtMs,
    ).toBe(start + 3 * H);
  });
  it("no se solapa con la jornada siguiente", () => {
    expect(
      computeStaleClose(
        { status: "TRAVEL", startAtMs: start, endAtMs: null, nextSessionStartMs: start + 9 * H },
        start + 30 * H,
      )?.endAtMs,
    ).toBe(start + 9 * H);
  });
  it("cerradas o borradas se ignoran", () => {
    expect(computeStaleClose({ status: "CLOSED", startAtMs: start, endAtMs: null }, start + 30 * H)).toBeNull();
    expect(
      computeStaleClose({ status: "ACTIVE_WORK", isDeleted: true, startAtMs: start, endAtMs: null }, start + 30 * H),
    ).toBeNull();
  });
});
