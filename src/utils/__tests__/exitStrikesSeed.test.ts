import { evaluateExitStrikes } from "../geoUtils";

const o = { maxAccuracyM: 50, minSpacingMs: 15_000, hysteresisM: 50, seedStrikeAtMs: 0 };
const r = (t: number, d: number, acc = 10) => ({ timestampMs: t, distanceM: d, accuracyM: acc });

describe("evento EXIT del SO como primer strike", () => {
  it("SO + 2 lecturas fuera a 15 s confirma en ~30 s", () => {
    const res = evaluateExitStrikes([r(0, 300), r(15_000, 300), r(30_000, 300)], 100, 3, o);
    expect(res).toEqual({ confirmed: true, strikes: 3, firstOutsideAtMs: 0 });
  });
  it("la lectura en la banda ±50 m no suma (pero el strike del SO sí)", () => {
    const res = evaluateExitStrikes([r(15_000, 120), r(30_000, 130)], 100, 3, o);
    expect(res.strikes).toBe(1);
    expect(res.confirmed).toBe(false);
  });
  it("una lectura dentro anula también el strike del SO", () => {
    const res = evaluateExitStrikes([r(0, 50), r(15_000, 300)], 100, 3, o);
    expect(res).toMatchObject({ strikes: 1, firstOutsideAtMs: 15_000 });
  });
  it("sin semilla el comportamiento previo no cambia", () => {
    const { seedStrikeAtMs, ...plain } = o;
    expect(evaluateExitStrikes([r(0, 300)], 100, 3, plain).strikes).toBe(1);
  });
});
