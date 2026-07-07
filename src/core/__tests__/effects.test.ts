import { executeEffects } from '../effects';
import { createInitialState } from '../state';
import { workTrackerReducer } from '../reducer';
import { DomainEvent, WorkTrackerCanonicalState } from '../contracts';

describe('effects', () => {
  const mockRuntime: any = {
    location: {
      startMonitoringArrival: jest.fn(),
      stopMonitoring: jest.fn(),
    },
    logging: {
      appendAuditLog: jest.fn(),
      appendSystemLog: jest.fn(),
      mapLogToFeedback: jest.fn(() => null),
    },
    sessionStore: {
      createSession: jest.fn(),
    },
    notifications: {
        notifyImmediate: jest.fn(),
    }
  };

  const getNonRehydratingState = (): WorkTrackerCanonicalState => {
      const state = createInitialState();
      state.meta.bootState.isRehydrating = false;
      return state;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('SESSION_DESTINATION_SET debe disparar GEOFENCE_MONITORING_STARTED si el estado lo permite', async () => {
    const initialState = getNonRehydratingState();
    const createEvent: DomainEvent = {
      type: 'SESSION_CREATED',
      session: { id: 1, declaredStartAtMs: 1000, domainStatus: 'pending_arrival' }
    };

    let prevState = workTrackerReducer(initialState, createEvent);

    const event: DomainEvent = {
      type: 'SESSION_DESTINATION_SET',
      sessionId: 1,
      targetLatitude: 10,
      targetLongitude: 20
    };

    const nextState = workTrackerReducer(prevState, event);

    const secondaryEvents = await executeEffects(event, prevState, nextState, mockRuntime);

    expect(mockRuntime.location.startMonitoringArrival).toHaveBeenCalledWith(
      'WORK_ZONE', 10, 20, nextState.domain.settings.toleranceRadiusMeters
    );
    expect(secondaryEvents).toContainEqual(expect.objectContaining({
      type: 'GEOFENCE_MONITORING_STARTED',
      latitude: 10,
      longitude: 20
    }));
  });

  it('GEOFENCE_MONITORING_STARTED debe registrar log del sistema', async () => {
    const state = getNonRehydratingState();
    const event: DomainEvent = {
      type: 'GEOFENCE_MONITORING_STARTED',
      taskName: 'task',
      identifier: 'ZONE',
      latitude: 1,
      longitude: 2,
      radiusMeters: 100
    };

    const secondaryEvents = await executeEffects(event, state, state, mockRuntime);

    expect(secondaryEvents).toContainEqual(expect.objectContaining({
      type: 'SYSTEM_LOG_APPENDED'
    }));
  });

  it('GEOFENCE_MONITORING_STOPPED debe llamar al adapter y registrar log', async () => {
    const state = getNonRehydratingState();
    const event: DomainEvent = {
      type: 'GEOFENCE_MONITORING_STOPPED'
    };

    const secondaryEvents = await executeEffects(event, state, state, mockRuntime);

    expect(mockRuntime.location.stopMonitoring).toHaveBeenCalled();
    expect(secondaryEvents).toContainEqual(expect.objectContaining({
      type: 'SYSTEM_LOG_APPENDED'
    }));
  });
});
