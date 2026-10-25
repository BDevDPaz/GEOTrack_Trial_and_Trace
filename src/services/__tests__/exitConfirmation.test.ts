import { confirmExit } from "../exitConfirmation";

const opts = { radiusM: 100, requiredReadings: 3, maxAccuracyM: 50, minSpacingMs: 30_000, hysteresisM: 50 };
function deps(dists: (number | null)[]) {
  let t = 0;
  const queue = [...dists];
  return {
    sleep: jest.fn(async (ms: number) => { t += ms; }),
    readPosition: jest.fn(async () => {
      const d = queue.shift();
      return d == null ? null : { distanceM: d, accuracyM: 10, timestampMs: t };
    }),
  };
}

describe("confirmExit (Fase C 5)", () => {
  it("confirma con la primera lectura fuera como timestamp", async () => {
    const d = deps([300, 300]);
    const r = await confirmExit([{ distanceM: 300, accuracyM: 10, timestampMs: 0 }], opts, d);
    expect(r.confirmed).toBe(true);
    expect(r.firstOutsideAtMs).toBe(0);
    expect(d.readPosition).toHaveBeenCalledTimes(2);
  });
  it("no confirma si vuelve a entrar y agota intentos", async () => {
    const d = deps([50, 50, 50, 50, 50]);
    const r = await confirmExit([{ distanceM: 300, accuracyM: 10, timestampMs: 0 }], opts, d);
    expect(r.confirmed).toBe(false);
    expect(d.readPosition).toHaveBeenCalledTimes(5);
  });
  it("tolera fallos de lectura", async () => {
    const d = deps([null, 300, 300]);
    const r = await confirmExit([{ distanceM: 300, accuracyM: 10, timestampMs: 0 }], opts, d);
    expect(r.confirmed).toBe(true);
  });
});
