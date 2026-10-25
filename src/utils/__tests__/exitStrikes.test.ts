import { evaluateExitStrikes, presenceZone } from "../geoUtils";

const opts = { maxAccuracyM: 50, minSpacingMs: 30_000, hysteresisM: 50 };
const R = (d: number, t: number, a: number | null = 10) => ({ distanceM: d, accuracyM: a, timestampMs: t * 1000 });

describe("Fase C (5) — confirmación de salida por N lecturas", () => {
  it("3 lecturas fuera espaciadas ≥30s confirman y devuelven la primera", () => {
    const r = evaluateExitStrikes([R(300, 0), R(300, 30), R(300, 60)], 100, 3, opts);
    expect(r).toEqual({ confirmed: true, strikes: 3, firstOutsideAtMs: 0 });
  });
  it("una lectura dentro resetea el conteo", () => {
    const r = evaluateExitStrikes([R(300, 0), R(300, 30), R(50, 60), R(300, 90)], 100, 3, opts);
    expect(r.confirmed).toBe(false);
    expect(r.strikes).toBe(1);
    expect(r.firstOutsideAtMs).toBe(90_000);
  });
  it("lecturas imprecisas no cuentan ni resetean", () => {
    const r = evaluateExitStrikes([R(300, 0), R(50, 30, 200), R(300, 60), R(300, 90, null), R(300, 120)], 100, 3, opts);
    expect(r.confirmed).toBe(true);
  });
  it("lecturas a menos de 30s cuentan como una", () => {
    const r = evaluateExitStrikes([R(300, 0), R(300, 10), R(300, 20)], 100, 3, opts);
    expect(r.strikes).toBe(1);
  });
  it("la franja de histéresis (radio..radio+50) es UNKNOWN", () => {
    expect(presenceZone(R(120, 0), 100, 50, 50)).toBe("UNKNOWN");
    expect(presenceZone(R(150, 0), 100, 50, 50)).toBe("OUTSIDE");
    expect(presenceZone(R(100, 0), 100, 50, 50)).toBe("INSIDE");
  });
  it("N inválido se trata como 1", () => {
    expect(evaluateExitStrikes([R(300, 0)], 100, 0, opts).confirmed).toBe(true);
  });
});
