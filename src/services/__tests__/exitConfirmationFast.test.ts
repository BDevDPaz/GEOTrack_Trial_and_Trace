import { confirmExit } from "../exitConfirmation";

it("segundo plano: EXIT del SO + 2 lecturas a 15 s confirma (~30 s) y reporta progreso", async () => {
  let t = 0;
  const sleeps: number[] = [];
  const progress: number[] = [];
  const res = await confirmExit(
    [{ distanceM: 300, accuracyM: 10, timestampMs: 0 }],
    { radiusM: 100, requiredReadings: 3, maxAccuracyM: 50, minSpacingMs: 15_000, hysteresisM: 50, seedStrikeAtMs: 0 },
    {
      sleep: async (ms) => { sleeps.push(ms); t += ms; },
      readPosition: async () => ({ distanceM: 300, accuracyM: 10, timestampMs: t }),
      onProgress: (r) => { progress.push(r.strikes); },
    },
  );
  expect(res.confirmed).toBe(true);
  expect(sleeps.reduce((a, b) => a + b, 0)).toBe(30_000);
  expect(progress).toEqual([2, 3]);
  expect(res.firstOutsideAtMs).toBe(0);
});
