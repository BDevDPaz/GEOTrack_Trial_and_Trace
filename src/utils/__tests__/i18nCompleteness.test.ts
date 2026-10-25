import { translations, t } from "../i18n";

describe("i18n — Fase D (9)", () => {
  it("es y en tienen exactamente las mismas claves", () => {
    const es = Object.keys(translations.es).sort();
    const en = Object.keys(translations.en).sort();
    expect(en.filter((k) => !es.includes(k))).toEqual([]);
    expect(es.filter((k) => !en.includes(k))).toEqual([]);
  });
  it("ninguna traducción está vacía", () => {
    for (const lang of ["es", "en"] as const)
      for (const [k, v] of Object.entries(translations[lang]))
        expect([k, String(v).trim().length > 0]).toEqual([k, true]);
  });
  it("los placeholders {x} coinciden entre idiomas", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const k of Object.keys(translations.es) as (keyof typeof translations.es)[])
      expect([k, ph((translations.en as any)[k])]).toEqual([k, ph(translations.es[k])]);
  });
  it("interpola variables", () => {
    expect(t("en", "modal_exit_desc", { time: "3:00 PM" })).toContain("3:00 PM");
  });
});
