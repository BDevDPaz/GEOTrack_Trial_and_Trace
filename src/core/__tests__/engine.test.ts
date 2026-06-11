jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

import { workTrackerEngine } from '../workTrackerEngine';

const mockRuntime = {
  sessionStore: {
    createSession: jest.fn(),
  },
  location: {
    startMonitoringArrival: jest.fn(),
  },
  notifications: {
    notifyImmediate: jest.fn(),
  },
  reports: {},
  security: {},
  logging: {
    appendAuditLog: jest.fn(),
    appendSystemLog: jest.fn(),
    mapLogToFeedback: jest.fn(() => null),
  },
};

describe('engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    workTrackerEngine.initialize(mockRuntime as any);
  });

  it('debe procesar evento completo', async () => {
    await workTrackerEngine.dispatch({
      type: 'SESSION_CREATED',
      session: {
        id: 1,
        declaredStartAtMs: Date.now(),
        domainStatus: 'pending_arrival',
      },
    } as any);

    const state = workTrackerEngine.getState();

    expect(state.domain.sessions.activeSessionId).toBe(1);
  });
});
