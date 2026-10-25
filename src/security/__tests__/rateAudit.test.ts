import { buildRateChangeAudit } from "../rateAudit";

describe("buildRateChangeAudit", () => {
  it("null si no cambia la tarifa", () => {
    expect(buildRateChangeAudit({ hourlyRate: 20, overtimeMultiplier: 1.5 }, { hourlyRate: 20, overtimeMultiplier: 1.5 }, 1)).toBeNull();
  });
  it("registra valores anterior y nuevo", () => {
    const a = buildRateChangeAudit({ hourlyRate: 20, overtimeMultiplier: 1.5 }, { hourlyRate: 25, overtimeMultiplier: 2 }, 99)!;
    expect(a.actionType).toBe("RATE_CHANGED");
    expect(a.details).toContain("hourlyRate 20 -> 25");
    expect(a.details).toContain("overtimeMultiplier 1.5 -> 2");
    expect(a.timestampMs).toBe(99);
  });
});
