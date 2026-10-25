import { createInitialState } from "../../state";
import { SessionRecord, WorkTrackerCanonicalState } from "../../contracts";
import { decideLunchReminder, lunchReminderTriggerMs } from "../lunchReminder";
import { executeEffects } from "../../effects";

jest.mock("../../runtime/sessionStoreAdapter", () => ({
  loadSessionRecordsSnapshot: jest.fn().mockResolvedValue([]),
  loadSystemLogRecordsSnapshot: jest.fn().mockResolvedValue([]),
}));

const at = (h: number, m = 0) => new Date(2026, 9, 20, h, m, 0, 0).getTime();

const rec = (status: any, lunchTaken = false, id = 1): SessionRecord => ({
  id,
  declaredStartAtMs: at(8),
  actualStartAtMs: at(8),
  endAtMs: null,
  lifecycle: { domainStatus: status, isDeleted: false, isManualEdit: false, locationConfirmed: true, totalPausedMs: 0, lastPauseStartMs: null },
  destination: { address: "X", clientName: null, targetLatitude: 1, targetLongitude: 2, setupLatitude: null, setupLongitude: null },
  capturedLocation: { latitude: null, longitude: null },
  lunch: { taken: lunchTaken, startAtMs: null, endAtMs: null, deductedMinutes: lunchTaken ? 30 : null },
  notes: { manualNote: null },
  bookkeeping: { dateString: "2026-10-20" },
});

const st = (s: SessionRecord | null, enabled = true, time = "12:00"): WorkTrackerCanonicalState => {
  const base = createInitialState();
  base.domain.settings = { ...base.domain.settings, lunchReminderEnabled: enabled, lunchReminderTime: time };
  if (s) {
    (base.domain.sessions.byId as any) = { [s.id]: s };
    base.domain.sessions.activeSessionId = s.id;
  }
  return base;
};

describe("Fase D (11) recordatorio de almuerzo", () => {
  it("desactivado por defecto → nunca programa", () => {
    expect(createInitialState().domain.settings.lunchReminderEnabled ?? false).toBe(false);
    expect(lunchReminderTriggerMs({ lunchReminderEnabled: false }, at(9))).toBeNull();
  });
  it("hora por defecto 12:00, solo si aún no pasó", () => {
    expect(lunchReminderTriggerMs({ lunchReminderEnabled: true }, at(9))).toBe(at(12));
    expect(lunchReminderTriggerMs({ lunchReminderEnabled: true }, at(13))).toBeNull();
    expect(lunchReminderTriggerMs({ lunchReminderEnabled: true, lunchReminderTime: "25:00" }, at(9))).toBeNull();
  });
  it("programa al entrar a ACTIVE_WORK", () => {
    expect(decideLunchReminder(st(rec("TRAVEL")), st(rec("ACTIVE_WORK")), at(9)))
      .toEqual({ type: "schedule", atMs: at(12), sessionId: 1 });
  });
  it("cancela al registrar almuerzo, pausar o cerrar", () => {
    expect(decideLunchReminder(st(rec("ACTIVE_WORK")), st(rec("ACTIVE_WORK", true)), at(10))).toEqual({ type: "cancel" });
    expect(decideLunchReminder(st(rec("ACTIVE_WORK")), st(rec("PAUSED")), at(10))).toEqual({ type: "cancel" });
    expect(decideLunchReminder(st(rec("ACTIVE_WORK")), st(null), at(10))).toEqual({ type: "cancel" });
  });
  it("no programa si el almuerzo ya se tomó ese día en otra jornada", () => {
    const next = st(rec("ACTIVE_WORK", false, 2));
    (next.domain.sessions.byId as any)[1] = { ...rec("CLOSED", true, 1) };
    expect(decideLunchReminder(st(null), next, at(9))).toBeNull();
  });
  it("sin cambios relevantes → no hace nada", () => {
    expect(decideLunchReminder(st(rec("ACTIVE_WORK")), st(rec("ACTIVE_WORK")), at(9))).toBeNull();
  });
  it("executeEffects aplica la acción en el adaptador de notificaciones", async () => {
    jest.useFakeTimers().setSystemTime(at(9));
    const runtime: any = {
      notifications: { scheduleLunchReminder: jest.fn(), cancelLunchReminder: jest.fn() },
    };
    await executeEffects({ type: "NOOP_TEST" } as any, st(rec("TRAVEL")), st(rec("ACTIVE_WORK")), runtime);
    expect(runtime.notifications.scheduleLunchReminder).toHaveBeenCalledWith(at(12), 1, "es");
    jest.useRealTimers();
  });
});

describe("SETTINGS_SAVED (Fase D 11)", () => {
  it("actualiza el estado y persiste los ajustes", async () => {
    const { workTrackerReducer } = require("../../reducer");
    const prev = st(null, false);
    const settings = { ...prev.domain.settings, lunchReminderEnabled: true, lunchReminderTime: "13:00" };
    const ev: any = { type: "SETTINGS_SAVED", settings };
    const next = workTrackerReducer(prev, ev);
    expect(next.domain.settings.lunchReminderTime).toBe("13:00");
    const runtime: any = { sessionStore: { saveSettings: jest.fn() }, notifications: {} };
    await executeEffects(ev, prev, next, runtime);
    expect(runtime.sessionStore.saveSettings).toHaveBeenCalledWith(settings);
  });
});
