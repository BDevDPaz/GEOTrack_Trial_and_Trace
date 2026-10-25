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

describe("Item 3: tarjeta principal y home sin textos fijos", () => {
  const fs = require("fs");
  const path = require("path");
  const root = path.resolve(__dirname, "../../..");
  const files = ["src/components/ui/OperationalHeroCard.tsx", "app/(tabs)/index.tsx"];
  const HERO_KEYS = [
    "hero_pill_idle", "hero_pill_waiting", "hero_pill_travel", "hero_pill_active", "hero_pill_paused",
    "hero_pill_pending_exit", "hero_pill_closed", "hero_pill_unknown",
    "hero_setup", "hero_confirm_arrival", "hero_arrived", "hero_finish", "hero_pause", "hero_resume",
    "hero_other_job", "hero_finish_save", "hero_refresh", "hero_time_label", "hero_earnings_label",
    "home_subtitle", "home_controls", "home_setup", "home_confirm_arrival_manual", "home_pause",
    "home_finish", "home_resume", "home_other_job", "home_arrived", "home_finish_save",
  ];
  it("todas las claves existen en es y en", () => {
    for (const k of HERO_KEYS) {
      expect([k, k in translations.es]).toEqual([k, true]);
      expect([k, k in translations.en]).toEqual([k, true]);
    }
  });
  it("las props de texto usan t(), no literales", () => {
    const re = /\b(label|title|subtitle|pillLabel|primaryLabel|secondaryLabel)\s*[=:]\s*"([^"]*)"/g;
    for (const f of files) {
      const src = fs.readFileSync(path.join(root, f), "utf8");
      const hits = [...src.matchAll(re)].map((m) => m[2]).filter((v) => v !== "GEOTrack");
      expect([f, hits]).toEqual([f, []]);
      expect([f, /TIEMPO ACUMULADO|GANANCIA EST\./.test(src)]).toEqual([f, false]);
    }
  });
});
