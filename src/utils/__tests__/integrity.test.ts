import { classifyIntegrity, integrityColor, integrityToBadgeType, isExcludedFromPayroll } from "../integrity";

describe("classifyIntegrity (Fase B, 6)", () => {
  it.each([
    [{}, "INTACT"],
    [{ closeReason: "GPS" }, "INTACT"],
    [{ isManualEdit: 1 }, "EDITED"],
    [{ isDeleted: true }, "DELETED"],
    [{ isDeleted: true, closeReason: "CANCELLED" }, "CANCELLED"],
    [{ closeReason: "STALE_12H" }, "AUTO_CLOSED"],
    [{ closeReason: "FAILSAFE_15M" }, "AUTO_CLOSED"],
    [{ parentSessionId: 3 }, "TRANSIT"],
    [{ isDeleted: 1, isManualEdit: 1 }, "DELETED"],
  ])("%j → %s", (input, expected) => {
    expect(classifyIntegrity(input as any)).toBe(expected);
  });
  it("colores del tema", () => {
    expect(integrityColor("INTACT")).toBe("#D1E7DD");
    expect(integrityColor("EDITED")).toBe("#FFF3CD");
    expect(integrityColor("DELETED")).toBe("#F8D7DA");
  });
  it("eliminadas/canceladas no suman; mapeo a insignia", () => {
    expect(isExcludedFromPayroll("DELETED")).toBe(true);
    expect(isExcludedFromPayroll("AUTO_CLOSED")).toBe(false);
    expect(integrityToBadgeType("EDITED")).toBe("manual");
    expect(integrityToBadgeType("CANCELLED")).toBe("error");
  });
});
