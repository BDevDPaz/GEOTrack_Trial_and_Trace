import { executeEffects } from "../effects";
import { createInitialState } from "../state";
import { workTrackerReducer } from "../reducer";

jest.mock("../runtime/sessionStoreAdapter", () => ({
  loadSessionRecordsSnapshot: jest.fn().mockResolvedValue([]),
  loadSystemLogRecordsSnapshot: jest.fn().mockResolvedValue([]),
}));

const ready = () => {
  const s = createInitialState();
  s.meta.bootState.isRehydrating = false;
  (s.domain.sessions.byId as any)["7"] = {
    id: 7, destination: { setupLatitude: 1, setupLongitude: 2 },
    lifecycle: { domainStatus: "GEOFENCE_CREATED", isDeleted: false },
  };
  return s;
};

describe("Fase D (12) dirección inversa en el motor", () => {
  it("resuelve, persiste y emite SESSION_SETUP_ADDRESS_RESOLVED", async () => {
    const runtime: any = {
      location: { reverseGeocode: jest.fn().mockResolvedValue("Calle 1, Lima") },
      sessionStore: { updateSetupAddress: jest.fn() },
    };
    const ev: any = { type: "SESSION_SETUP_ADDRESS_REQUESTED", sessionId: 7, latitude: 1, longitude: 2 };
    const out = await executeEffects(ev, ready(), ready(), runtime);
    expect(runtime.sessionStore.updateSetupAddress).toHaveBeenCalledWith(7, "Calle 1, Lima");
    expect(out[0]).toEqual({ type: "SESSION_SETUP_ADDRESS_RESOLVED", sessionId: 7, address: "Calle 1, Lima" });
    const next = workTrackerReducer(ready(), out[0]);
    expect((next.domain.sessions.byId as any)["7"].destination.setupAddress).toBe("Calle 1, Lima");
  });
  it("si falla queda null: no persiste ni emite", async () => {
    const runtime: any = {
      location: { reverseGeocode: jest.fn().mockResolvedValue(null) },
      sessionStore: { updateSetupAddress: jest.fn() },
    };
    const ev: any = { type: "SESSION_SETUP_ADDRESS_REQUESTED", sessionId: 7, latitude: 1, longitude: 2 };
    const out = await executeEffects(ev, ready(), ready(), runtime);
    expect(runtime.sessionStore.updateSetupAddress).not.toHaveBeenCalled();
    expect(out.some((e: any) => e.type === "SESSION_SETUP_ADDRESS_RESOLVED")).toBe(false);
  });
});
