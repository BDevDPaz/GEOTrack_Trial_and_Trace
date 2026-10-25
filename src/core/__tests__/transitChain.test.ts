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
    createSession: jest.fn().mockResolvedValue(1),
    linkTransitLeg: jest.fn(),
    updateLunch: jest.fn(),
  },
  notifications: { notifyImmediate: jest.fn() },
};

const ready = (): WorkTrackerCanonicalState => {
  const s = createInitialState();
  s.meta.bootState.isRehydrating = false;
  return s;
};

beforeEach(() => jest.clearAllMocks());
import { buildChainedTransitEvent, effectiveStartMs } from "../transit/chainTransit";
import { chainedTransitStartMs } from "../../utils/dateUtils";

const M = 60_000;
const T0 = Date.now() - 5 * H;

describe("Fase C (7) tránsito encadenado", () => {
  it("regla de encadenado: hueco < 30 min empieza en el fin previo; si no, ahora", () => {
    expect(chainedTransitStartMs(1000, 1000 + 29 * M)).toBe(1000);
    expect(chainedTransitStartMs(1000, 1000 + 31 * M)).toBe(1000 + 31 * M);
  });

  it("cierra la actual en la última salida y abre un tramo TRAVEL hijo", async () => {
    const prev = workTrackerReducer(ready(), {
      type: "SESSIONS_REHYDRATED",
      sessions: [rec({ declaredStartAtMs: T0, actualStartAtMs: T0, pay: { hourlyRate: 20, overtimeMultiplier: 1.5 } })],
    } as any);
    const exit = T0 + 4 * H;
    const ev = buildChainedTransitEvent(prev.domain.sessions.byId["1"], {
      nowMs: exit + 10 * M,
      lastExitTimestampMs: exit,
      newId: 2,
    })!;
    expect(ev.endAtMs).toBe(exit);
    expect(ev.newSession.declaredStartAtMs).toBe(exit);
    const next = workTrackerReducer(prev, ev);
    const old = next.domain.sessions.byId["1"];
    const leg = next.domain.sessions.byId["2"];
    expect(old.lifecycle.domainStatus).toBe("CLOSED");
    expect(old.lifecycle.closeReason).toBe("TRANSIT");
    expect(leg.lifecycle.domainStatus).toBe("TRAVEL");
    expect(leg.parentSessionId).toBe(1);
    expect(leg.pay?.hourlyRate).toBe(20);
    expect(next.domain.sessions.activeSessionId).toBe(2);
    const out = await executeEffects(ev, prev, next, runtime);
    expect(runtime.sessionStore.closeSession).toHaveBeenCalledWith(1, exit, "TRANSIT");
    expect(runtime.sessionStore.createSession).toHaveBeenCalledWith(expect.objectContaining({ id: 2, parentSessionId: 1 }));
    expect(runtime.sessionStore.linkTransitLeg).toHaveBeenCalledWith(2, 1);
    expect(runtime.location.stopMonitoring).toHaveBeenCalled();
    expect(out.some((e) => e.type === "AUDIT_LOG_APPENDED")).toBe(true);
  });

  it("sin salida registrada, cierra ahora", () => {
    const s = rec({ declaredStartAtMs: T0, actualStartAtMs: T0 });
    const ev = buildChainedTransitEvent(s, { nowMs: T0 + H, lastExitTimestampMs: null, newId: 2 })!;
    expect(ev.endAtMs).toBe(T0 + H);
  });

  it("no encadena desde GEOFENCE_CREATED ni CLOSED", () => {
    expect(buildChainedTransitEvent(rec({ status: "GEOFENCE_CREATED" } as any), { nowMs: 1, lastExitTimestampMs: null, newId: 2 })).toBeNull();
    const prev = workTrackerReducer(ready(), { type: "SESSIONS_REHYDRATED", sessions: [rec({ status: "CLOSED" } as any)] } as any);
    const forced: any = { type: "SESSION_TRANSIT_CHAINED", sessionId: 1, endAtMs: 1, newSession: { ...rec(), id: 2 } };
    expect(workTrackerReducer(prev, forced)).toBe(prev);
  });

  it("al llegar, el tramo se paga desde su inicio declarado (incluye el tránsito)", () => {
    const leg = { declaredStartAtMs: 100, actualStartAtMs: 500, parentSessionId: 1 };
    expect(effectiveStartMs(leg)).toBe(100);
    expect(effectiveStartMs({ ...leg, parentSessionId: null })).toBe(500);
  });

  it("el almuerzo se descuenta una sola vez por día", async () => {
    const day = "2026-10-24";
    const a = rec({ id: 1, status: "CLOSED", bookkeeping: { dateString: day }, lunch: { taken: true, startAtMs: null, endAtMs: null, deductedMinutes: 30 } } as any);
    const b = rec({ id: 2, bookkeeping: { dateString: day } } as any);
    const prev = workTrackerReducer(ready(), { type: "SESSIONS_REHYDRATED", sessions: [a, b] } as any);
    const ev: any = { type: "SESSION_LUNCH_RECORDED", sessionId: 2, deductedMinutes: 30 };
    const next = workTrackerReducer(prev, ev);
    expect(next.domain.sessions.byId["2"].lunch.taken).toBe(false);
    await executeEffects(ev, prev, next, runtime);
    expect(runtime.sessionStore.updateLunch).not.toHaveBeenCalled();
  });
});

describe("Item 3: updateLunch persiste instantes reales + minutos", () => {
  it("almuerzo de 30 min desde el modal no escribe 0/0", async () => {
    const s0 = workTrackerReducer(ready(), { type: "SESSIONS_REHYDRATED", sessions: [rec({ bookkeeping: { dateString: "2026-10-24" } })] } as any);
    const ev = { type: "SESSION_LUNCH_RECORDED", sessionId: 1, deductedMinutes: 30 } as DomainEvent;
    const s1 = workTrackerReducer(s0, ev);
    await executeEffects(ev, s0, s1, runtime);
    const [id, start, end, minutes] = runtime.sessionStore.updateLunch.mock.calls[0];
    expect(id).toBe(1);
    expect(start).toBeGreaterThan(0);
    expect(end - start).toBe(30 * 60_000);
    expect(minutes).toBe(30);
  });
});
