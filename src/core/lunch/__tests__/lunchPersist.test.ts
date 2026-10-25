import { resolveLunchPersist } from "../lunchPersist";

const M = 60_000;
describe("persistencia real del almuerzo", () => {
  it("con inicio y fin registrados usa esos instantes y sus minutos", () => {
    expect(resolveLunchPersist({ taken: true, startAtMs: 1000, endAtMs: 1000 + 45 * M, deductedMinutes: null }, 9e9))
      .toEqual({ startAtMs: 1000, endAtMs: 1000 + 45 * M, minutes: 45 });
  });
  it("solo minutos (modal de cierre): fin = referencia, inicio = fin − minutos", () => {
    expect(resolveLunchPersist({ taken: true, startAtMs: null, endAtMs: null, deductedMinutes: 30 }, 100 * M))
      .toEqual({ startAtMs: 70 * M, endAtMs: 100 * M, minutes: 30 });
  });
  it("minutos explícitos mandan sobre el intervalo", () => {
    expect(resolveLunchPersist({ taken: true, startAtMs: 0, endAtMs: 60 * M, deductedMinutes: 40 }, 0).minutes).toBe(40);
  });
  it("nunca escribe 0/0 ni minutos negativos", () => {
    const r = resolveLunchPersist({ taken: true, startAtMs: null, endAtMs: null, deductedMinutes: null }, 5 * M);
    expect(r).toEqual({ startAtMs: 5 * M, endAtMs: 5 * M, minutes: 0 });
  });
});
