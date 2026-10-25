import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import {
  hasAdminPin, setAdminPin, verifyAdminPin, isValidPinFormat,
  PIN_HASH_KEY, PIN_LOCK_MS, PinDeps,
} from "../adminPin";

function deps(): PinDeps & { mem: Map<string, string> } {
  const mem = new Map<string, string>();
  let n = 0;
  return {
    mem,
    store: {
      get: async (k) => mem.get(k) ?? null,
      set: async (k, v) => void mem.set(k, v),
      remove: async (k) => void mem.delete(k),
    },
    sha256: async (s) => createHash("sha256").update(s).digest("hex"),
    randomSalt: async () => `salt${++n}`,
  };
}

describe("PIN admin (Fase D 10)", () => {
  it("sin PIN configurado falla (fail-secure)", async () => {
    const d = deps();
    expect(await hasAdminPin(d)).toBe(false);
    expect((await verifyAdminPin(d, "1234", 0)).reason).toBe("NOT_SET");
  });
  it("guarda solo hash con sal, nunca el PIN", async () => {
    const d = deps();
    await setAdminPin(d, "4821");
    expect([...d.mem.values()].some((v) => v.includes("4821"))).toBe(false);
    const plain = createHash("sha256").update("4821").digest("hex");
    expect(d.mem.get(PIN_HASH_KEY)).not.toBe(plain);
    expect((await verifyAdminPin(d, "4821", 0)).ok).toBe(true);
  });
  it("rechaza formatos inválidos", async () => {
    expect(isValidPinFormat("12a4")).toBe(false);
    expect(isValidPinFormat("123")).toBe(false);
    await expect(setAdminPin(deps(), "12")).rejects.toThrow();
  });
  it("bloquea tras 5 fallos y desbloquea al expirar", async () => {
    const d = deps();
    await setAdminPin(d, "4821");
    for (let i = 0; i < 4; i++) expect((await verifyAdminPin(d, "0000", 0)).reason).toBe("WRONG");
    const fifth = await verifyAdminPin(d, "0000", 0);
    expect(fifth).toMatchObject({ reason: "WRONG", remainingAttempts: 0 });
    expect((await verifyAdminPin(d, "4821", 1000)).reason).toBe("LOCKED");
    expect((await verifyAdminPin(d, "4821", PIN_LOCK_MS + 1)).ok).toBe(true);
  });
  it("un acierto resetea el contador", async () => {
    const d = deps();
    await setAdminPin(d, "4821");
    for (let i = 0; i < 4; i++) await verifyAdminPin(d, "0000", 0);
    await verifyAdminPin(d, "4821", 0);
    expect((await verifyAdminPin(d, "0000", 0))).toMatchObject({ remainingAttempts: 4 });
  });
});

describe("no hay PIN literal en el código (Fase D 10)", () => {
  const root = path.resolve(__dirname, "../../..");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === "__tests__" || e.name.startsWith(".")) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(root, "src"));
  walk(path.join(root, "app"));
  it.each([
    /DEMO_ADMIN_PIN/,
    /pin\w*\s*===?\s*["'`]\d{4,8}["'`]/i,
    /["'`]03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4["'`]/,
  ])("ningún archivo contiene %s", (re) => {
    const hits = files.filter((f) => re.test(fs.readFileSync(f, "utf8")));
    expect(hits.map((f) => path.relative(root, f))).toEqual([]);
  });
});
