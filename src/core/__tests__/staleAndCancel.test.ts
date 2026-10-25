import { executeEffects } from "../effects";
import { createInitialState } from "../state";
import { workTrackerReducer } from "../reducer";
import { DomainEvent, SessionRecord, WorkTrackerCanonicalState } from "../contracts";
import { loadSessionRecordsSnapshot } from "../runtime/sessionStoreAdapter";

jest.mock("../runtime/sessionStoreAdapter", () => ({
  loadSessionRecordsSnapshot: jest.fn().mockResolvedValue([]),
  loadSystemLogRecordsSnapshot: jest.fn().mockResolvedValue([]),
}));

const H = 3_600_000;

const rec = (over: Partial<SessionRecord> & { status?: any } = {}): SessionRecord => ({
  id: 1,
  declaredStartAtMs: Date.now() - 13 * H,
  actualStartAtMs: Date.now() - 13 * H,
  endAtMs: null,
  lifecycle: {
    domainStatus: over.status ?? "ACTIVE_WORK",
    isDeleted: false,
    isManualEdit: false,
    locationConfirmed: true,
    totalPausedMs: 0,
    lastPauseStartMs: null,
  },
  destination: {
    address: "X",
    clientName: null,
    targetLatitude: 10,
    targetLongitude: 20,
    setupLatitude: null,
    setupLongitude: null,
  },
  capturedLocation: { latitude: null, longitude: null },
  lunch: { taken: false, startAtMs: null, endAtMs: null, deductedMinutes: null },
  notes: { manualNote: null },
  bookkeeping: { dateString: null },
  ...over,
});

const runtime: any = {
  location: {
    stopMonitoring: jest.fn(),
    clearLastExitTimestamp: jest.fn(),
    getLastExitTimestamp: jest.fn().mockResolvedValue(null),
  },
  logging: { getAuditLogs: jest.fn().mockResolvedValue([]), appendAuditLog: jest.fn() },
  sessionStore: {
    getSettings: jest.fn().mockResolvedValue(null),
    closeSession: jest.fn(),
    deleteSession: jest.fn(),
    cancelPendingSession: jest.fn(),
  },
  notifications: { notifyImmediate: jest.fn() },
};

const ready = (): WorkTrackerCanonicalState => {
  const s = createInitialState();
  s.meta.bootState.isRehydrating = false;
  return s;
};

beforeEach(() => jest.clearAllMocks());

describe("Fase B (4) jornadas huérfanas", () => {
  it("al arrancar, una sesión de 13 h emite SESSION_AUTO_CLOSED_STALE y no reinicia geocerca", async () => {
    const s = rec();
    (loadSessionRecordsSnapshot as jest.Mock).mockResolvedValueOnce([s]);
    const st = createInitialState();
    const out = await executeEffects({ type: "APP_BOOT_STARTED" } as any, st, st, runtime);
    const stale = out.find((e) => e.type === "SESSION_AUTO_CLOSED_STALE") as any;
    expect(stale.endAtMs).toBe(s.actualStartAtMs! + 12 * H);
    expect(out.some((e) => e.type === "GEOFENCE_MONITORING_STARTED")).toBe(false);
  });

  it("al arrancar, una sesión de 11 h se restaura normalmente", async () => {
    const s = rec({ declaredStartAtMs: Date.now() - 11 * H, actualStartAtMs: Date.now() - 11 * H });
    (loadSessionRecordsSnapshot as jest.Mock).mockResolvedValueOnce([s]);
    const st = createInitialState();
    const out = await executeEffects({ type: "APP_BOOT_STARTED" } as any, st, st, runtime);
    expect(out.some((e) => e.type === "SESSION_AUTO_CLOSED_STALE")).toBe(false);
    expect(out.some((e) => e.type === "GEOFENCE_MONITORING_STARTED")).toBe(true);
  });

  it("reducer + efecto: cierra con STALE_12H, persiste el motivo y deja log AMARILLO", async () => {
    const prev = workTrackerReducer(ready(), { type: "SESSIONS_REHYDRATED", sessions: [rec()] } as any);
    const ev: DomainEvent = { type: "SESSION_AUTO_CLOSED_STALE", sessionId: 1, endAtMs: 123 };
    const next = workTrackerReducer(prev, ev);
    expect(next.domain.sessions.byId["1"].lifecycle.domainStatus).toBe("CLOSED");
    expect(next.domain.sessions.byId["1"].lifecycle.closeReason).toBe("STALE_12H");
    expect(next.domain.sessions.byId["1"].lifecycle.isManualEdit).toBe(false);
    expect(next.domain.sessions.activeSessionId).toBeNull();
    const out = await executeEffects(ev, prev, next, runtime);
    expect(runtime.sessionStore.closeSession).toHaveBeenCalledWith(1, 123, "STALE_12H");
    expect(out).toContainEqual(
      expect.objectContaining({ type: "SYSTEM_LOG_APPENDED", entry: expect.objectContaining({ color: "AMARILLO" }) }),
    );
    expect(out.some((e) => e.type === "AUDIT_LOG_APPENDED")).toBe(true);
  });
});

describe("Fase C (8) cancelar trayecto", () => {
  it("cancela una sesión GEOFENCE_CREATED sin llegada", async () => {
    const prev = workTrackerReducer(ready(), {
      type: "SESSIONS_REHYDRATED",
      sessions: [rec({ status: "GEOFENCE_CREATED", actualStartAtMs: null } as any)],
    } as any);
    const ev: DomainEvent = { type: "SESSION_PENDING_CANCELLED", sessionId: 1 };
    const next = workTrackerReducer(prev, ev);
    const s = next.domain.sessions.byId["1"];
    expect(s.lifecycle.isDeleted).toBe(true);
    expect(s.lifecycle.closeReason).toBe("CANCELLED");
    expect(next.domain.sessions.activeSessionId).toBeNull();
    await executeEffects(ev, prev, next, runtime);
    expect(runtime.sessionStore.cancelPendingSession).toHaveBeenCalledWith(1);
    expect(runtime.location.stopMonitoring).toHaveBeenCalled();
  });

  it("no permite cancelar una jornada ya iniciada", () => {
    const prev = workTrackerReducer(ready(), { type: "SESSIONS_REHYDRATED", sessions: [rec()] } as any);
    const next = workTrackerReducer(prev, { type: "SESSION_PENDING_CANCELLED", sessionId: 1 });
    expect(next).toBe(prev);
  });
});

describe("motivos de cierre", () => {
  it("cierre manual guarda MANUAL", async () => {
    const prev = workTrackerReducer(ready(), {
      type: "SESSIONS_REHYDRATED",
      sessions: [rec({ declaredStartAtMs: Date.now() - H, actualStartAtMs: Date.now() - H })],
    } as any);
    const ev = { type: "SESSION_CLOSED_MANUAL", sessionId: 1, endAtMs: 5 } as DomainEvent;
    const next = workTrackerReducer(prev, ev);
    expect(next.domain.sessions.byId["1"].lifecycle.closeReason).toBe("MANUAL");
    await executeEffects(ev, prev, next, runtime);
    expect(runtime.sessionStore.closeSession).toHaveBeenCalledWith(1, 5, "MANUAL");
  });
});
