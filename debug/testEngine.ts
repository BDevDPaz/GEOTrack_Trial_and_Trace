import { workTrackerEngine } from '../src/core/workTrackerEngine';
import { bootApplication } from '../src/core/boot';

async function test() {
  await bootApplication();

  console.log('Estado después de boot:');
  console.log(workTrackerEngine.getState());

  await workTrackerEngine.dispatch({
    type: 'SESSION_CREATED',
    session: {
      id: 1,
      declaredStartAtMs: Date.now(),
      domainStatus: 'pending_arrival',
    },
  });

  console.log('Estado después de crear sesión:');
  console.log(workTrackerEngine.getState());
}

test();
