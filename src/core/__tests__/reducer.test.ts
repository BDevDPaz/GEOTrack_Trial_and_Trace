import { workTrackerReducer } from '../reducer';
import { createInitialState } from '../state';
import { DomainEvent } from '../contracts';

describe('workTrackerReducer', () => {
  it('debe crear una sesión correctamente', () => {
    const state = createInitialState();

    const event: DomainEvent = {
      type: 'SESSION_CREATED',
      session: {
        id: 1,
        declaredStartAtMs: 1000,
        domainStatus: 'pending_arrival',
      },
    };

    const nextState = workTrackerReducer(state, event);

    expect(nextState.domain.sessions.byId['1']).toBeDefined();
    expect(nextState.domain.sessions.activeSessionId).toBe(1);
  });

  it('debe ignorar EVENT_RETRY_REQUESTED (no muta estado)', () => {
    const state = createInitialState();

    const event: DomainEvent = {
      type: 'EVENT_RETRY_REQUESTED',
      originalEvent: {
        type: 'SESSION_CREATED',
        session: {
          id: 99,
          declaredStartAtMs: 0,
          domainStatus: 'pending_arrival',
        },
      },
      retryCount: 1,
      reason: 'test',
    };

    const nextState = workTrackerReducer(state, event);

    expect(nextState).toEqual(state);
  });
});
