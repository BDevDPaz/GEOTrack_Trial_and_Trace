import { executeEffects } from "../effects";
import { createInitialState } from "../state";
import { workTrackerReducer } from "../reducer";
import { DomainEvent } from "../contracts";
import { toValidCoords } from "../../utils/geoUtils";

jest.mock("../runtime/sessionStoreAdapter", () => ({
  loadSessionRecordsSnapshot: jest.fn().mockResolvedValue([]),
  loadSystemLogRecordsSnapshot: jest.fn().mockResolvedValue([]),
}));

const runtime: any = {
  location: { startMonitoringArrival: jest.fn(), stopMonitoring: jest.fn() },
  logging: {
    appendAuditLog: jest.fn(),
    appendSystemLog: jest.fn(),
    mapLogToFeedback: jest.fn(() => null),
  },
  sessionStore: {
    createSession: jest.fn(),
    updateSessionManual: jest.fn(),
    checkOverlap: jest.fn().mockResolvedValue(false),
  },
};

const base = () => {
  const s = createInitialState();
  s.meta.bootState.isRehydrating = false;
  return s;
};

describe("A.4 sin coordenadas no hay monitoreo (nunca 0,0)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("toValidCoords rechaza null/NaN/fuera de rango y acepta 0 real", () => {
    expect(toValidCoords(null, 1)).toBeNull();
    expect(toValidCoords(undefined, undefined)).toBeNull();
    expect(toValidCoords(NaN, 1)).toBeNull();
    expect(toValidCoords(91, 0)).toBeNull();
    expect(toValidCoords(0, 0)).toEqual({ latitude: 0, longitude: 0 });
  });

  it("SESSION_CREATED sin coords: no GEOFENCE_MONITORING_STARTED, registra error", async () => {
    const prev = base();
    const event: DomainEvent = {
      type: "SESSION_CREATED",
      session: {
        id: 7,
        declaredStartAtMs: 1,
        domainStatus: "GEOFENCE_CREATED",
      },
    };
    const out = await executeEffects(
      event,
      prev,
      workTrackerReducer(prev, event),
      runtime,
    );
    expect(out.some((e) => e.type === "GEOFENCE_MONITORING_STARTED")).toBe(
      false,
    );
    expect(out).toContainEqual(
      expect.objectContaining({
        type: "SYSTEM_LOG_APPENDED",
        entry: expect.objectContaining({
          severity: "ERROR",
          reason: "MISSING_TARGET_COORDS",
        }),
      }),
    );
  });

  it("SESSION_CREATED toma coords de session.destination", async () => {
    const prev = base();
    const event: DomainEvent = {
      type: "SESSION_CREATED",
      session: {
        id: 8,
        declaredStartAtMs: 1,
        domainStatus: "GEOFENCE_CREATED",
        destination: { targetLatitude: 34.1, targetLongitude: -118.3 } as any,
      },
    };
    const out = await executeEffects(
      event,
      prev,
      workTrackerReducer(prev, event),
      runtime,
    );
    expect(out).toContainEqual(
      expect.objectContaining({
        type: "GEOFENCE_MONITORING_STARTED",
        latitude: 34.1,
        longitude: -118.3,
      }),
    );
  });

  it("SESSION_DESTINATION_SET sin coords: no arranca geocerca", async () => {
    const init = base();
    const create: DomainEvent = {
      type: "SESSION_CREATED",
      session: {
        id: 1,
        declaredStartAtMs: 1,
        domainStatus: "GEOFENCE_CREATED",
      },
    };
    const prev = workTrackerReducer(init, create);
    const event: DomainEvent = {
      type: "SESSION_DESTINATION_SET",
      sessionId: 1,
    };
    const out = await executeEffects(
      event,
      prev,
      workTrackerReducer(prev, event),
      runtime,
    );
    expect(runtime.location.startMonitoringArrival).not.toHaveBeenCalled();
    expect(out.some((e) => e.type === "GEOFENCE_MONITORING_STARTED")).toBe(
      false,
    );
  });
});
