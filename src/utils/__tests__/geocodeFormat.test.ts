import { formatReverseGeocode, reverseGeocodeSafe } from "../geocodeFormat";

describe("Fase D (12) geocodificación inversa", () => {
  it("compone calle + número, ciudad, región", () => {
    expect(formatReverseGeocode({ street: "Av. Reforma", streetNumber: "222", city: "CDMX", region: "CDMX" }))
      .toBe("Av. Reforma 222, CDMX");
    expect(formatReverseGeocode({ name: "Plaza", city: "Lima", region: "Lima Metropolitana" }))
      .toBe("Plaza, Lima, Lima Metropolitana");
  });
  it("null si no hay datos", () => {
    expect(formatReverseGeocode(null)).toBeNull();
    expect(formatReverseGeocode({})).toBeNull();
  });
  it("reverseGeocodeSafe devuelve null ante error o timeout", async () => {
    expect(await reverseGeocodeSafe(async () => { throw new Error("x"); }, 1, 2)).toBeNull();
    expect(await reverseGeocodeSafe(() => new Promise(() => {}), 1, 2, 10)).toBeNull();
    expect(await reverseGeocodeSafe(async () => [{ city: "Quito" }], 1, 2)).toBe("Quito");
    expect(await reverseGeocodeSafe(async () => [], 1, 2)).toBeNull();
  });
});
