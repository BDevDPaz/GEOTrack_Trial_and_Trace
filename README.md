~/.../WT/GEOTrack_Trial_and_Trace $ grep -R "DATA_REFRESH_REQUESTED" app src --line-number
app/(tabs)/history.tsx:25:      dispatch({ type: 'DATA_REFRESH_REQUESTED' });
src/core/contracts/types.ts:254:  | { type: 'DATA_REFRESH_REQUESTED' }
src/core/effects/index.ts:852:  _event: Extract<DomainEvent, { type: 'DATA_REFRESH_REQUESTED' }>,
src/core/effects/index.ts:916:  DATA_REFRESH_REQUESTED: handleDataRefreshRequested,
~/.../WT/GEOTrack_Trial_and_Trace $ grep -R "PERMISSIONS_REFRESH_REQUESTED" app src --line-number
app/(tabs)/settings.tsx:29:      dispatch({ type: 'PERMISSIONS_REFRESH_REQUESTED' });
src/core/contracts/types.ts:253:  | { type: 'PERMISSIONS_REFRESH_REQUESTED' }
~/.../WT/GEOTrack_Trial_and_Trace $ grep -R "APP_RESUMED" app src --line-number
src/core/contracts/types.ts:250:  | { type: 'APP_RESUMED'; timestampMs: number }
~/.../WT/GEOTrack_Trial_and_Trace $
~/.../WT/GEOTrack_Trial_and_Trace $ npm run lint

> w-tracker@1.0.0 lint
> expo lint

~/.../WT/GEOTrack_Trial_and_Trace $ npm test

> w-tracker@1.0.0 test
> jest --coverage --no-watchman

PASS src/core/selectors/__tests__/selectors_harden.test.ts (14.04 s)
PASS src/services/__tests__/Notifications.test.ts (13.71 s)
PASS src/feedback/__tests__/logBridge.test.ts (14.169 s)
PASS src/core/__tests__/reducer.test.ts (14.182 s)
PASS src/utils/__tests__/payrollUtils.test.ts
PASS src/core/runtime/__tests__/notificationsAdapter.test.ts
PASS src/utils/__tests__/geoUtils.test.ts
PASS src/utils/__tests__/dateUtils.test.ts
PASS src/services/__tests__/LocationManager.test.ts (7.882 s)
PASS src/core/__tests__/serializeError.test.ts (22.411 s)
FAIL src/core/__tests__/effects.test.ts
  ● Test suite failed to run

    Jest encountered an unexpected token

    Jest failed to parse a file. This happens e.g. when your code or its dependencies use non-standard JavaScript syntax, or when Jest is not configured to support such syntax.

    Out of the box Jest supports Babel, which will be used to transform your files into valid JS based on your Babel configuration.

    By default "node_modules" folder is ignored by transformers.

    Here's what you can do:
     • If you are trying to use ECMAScript Modules, see https://jestjs.io/docs/ecmascript-modules for how to enable it.
     • If you are trying to use TypeScript, see https://jestjs.io/docs/getting-started#using-typescript
     • To have some of your "node_modules" files transformed, you can specify a custom "transformIgnorePatterns" in your config.
     • If you need a custom transformation specify a "transform" option in your config.
     • If you simply want to mock your non-JS modules (e.g. binary assets) you can stub them out with the "moduleNameMapper" config option.

    You'll find more details and examples of these config options in the docs:
    https://jestjs.io/docs/configuration
    For information about custom transformations, see:
    https://jestjs.io/docs/code-transformation

    Details:

    /data/data/com.termux/files/home/gh_reps/WT/GEOTrack_Trial_and_Trace/node_modules/expo-sqlite/build/index.js:1
    ({"Object.<anonymous>":function(module,exports,require,__dirname,__filename,jest){export * from './SQLiteDatabase';
                                                                                      ^^^^^^

    SyntaxError: Unexpected token 'export'

      1 | // --- src/database/db.ts ---
    > 2 | import * as SQLite from 'expo-sqlite';
        | ^
      3 | import dayjs from '../utils/dayjsSetup';
      4 | // types removed
      5 | import { log, logAudit, setLoggerDB, AUDIT_ACTIONS } from '../utils/logger';

      at Runtime.createScriptFromCode (node_modules/jest-runtime/build/index.js:1505:14)
      at Object.require (src/database/db.ts:2:1)
      at Object.require (src/core/runtime/sessionStoreAdapter.ts:9:1)
      at Object.require (src/core/effects/index.ts:2:1)
      at Object.<anonymous> (src/core/__tests__/effects.test.ts:1:1)

PASS src/core/__tests__/engine.test.ts (9.25 s)
PASS src/core/__tests__/geolocation_harden.test.ts (23.238 s)
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.
--------------------------|---------|----------|---------|---------|--------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------------|---------|----------|---------|---------|--------------------
All files                 |   44.89 |    26.15 |   33.72 |    43.3 |
 core                     |   72.09 |    57.14 |   66.66 |   73.41 |
  workTrackerEngine.ts    |   72.09 |    57.14 |   66.66 |   73.41 | ...173-174,192-216
 core/effects             |   10.84 |     9.25 |   21.42 |   11.04 |
  index.ts                |   10.84 |     9.25 |   21.42 |   11.04 | ...529,569-911,953
 core/reducer             |   38.65 |    34.42 |   58.33 |    40.7 |
  index.ts                |   38.65 |    34.42 |   58.33 |    40.7 | ...185-207,211-232
 core/runtime             |   24.29 |      2.4 |   14.28 |   25.24 |
  notificationsAdapter.ts |   33.33 |    15.78 |   66.66 |   33.96 | ...,72-100,110-137
  sessionStoreAdapter.ts  |   15.09 |        0 |       0 |      16 | ...319-327,337-345
 core/selectors           |   61.11 |       50 |   55.55 |   59.52 |
  index.ts                |   61.11 |       50 |   55.55 |   59.52 | 14-28,32-38,83,87
 core/state               |     100 |      100 |     100 |     100 |
  index.ts                |     100 |      100 |     100 |     100 |
  initialState.ts         |     100 |      100 |     100 |     100 |
 database                 |   33.83 |        0 |       0 |   26.54 |
  db.ts                   |   33.83 |        0 |       0 |   26.54 | ...438-439,447-448
 feedback                 |   70.86 |    46.96 |    87.5 |   70.43 |
  logBridge.ts            |   70.86 |    46.96 |    87.5 |   70.43 | ...250,254,258,262
 services                 |   51.25 |    35.84 |   61.53 |   51.29 |
  LocationManager.ts      |   30.55 |     7.14 |      40 |   30.43 | 44-129,142,152-171
  Notifications.ts        |   68.18 |       68 |      75 |   68.23 | ...131,156,161-166
 utils                    |   58.47 |    33.33 |   39.13 |   56.11 |
  dateUtils.ts            |     100 |      100 |     100 |     100 |
  dayjsSetup.ts           |     100 |      100 |     100 |     100 |
  geoUtils.ts             |     100 |      100 |     100 |     100 |
  logger.ts               |   19.51 |        0 |       0 |   17.56 | ...131-179,190-223
  payrollUtils.ts         |     100 |      100 |     100 |     100 |
  timeProvider.ts         |   77.27 |      100 |   28.57 |     100 |
--------------------------|---------|----------|---------|---------|--------------------

Test Suites: 1 failed, 12 passed, 13 total
Tests:       55 passed, 55 total
Snapshots:   0 total
Time:        26.607 s, estimated 31 s
Ran all test suites.
~/.../WT/GEOTrack_Trial_and_Trace $ npm run typecheck

> w-tracker@1.0.0 typecheck
> tsc --noEmit

~/.../WT/GEOTrack_Trial_and_Trace $ npm run audit:gm

> w-tracker@1.0.0 audit:gm
> tsx scripts/audit/gold-master.ts


🛡️ WTracker v2.2 - Gold Master
Gold Master audit completed.

Total: 0
🔴 Critical: 0
🟡 High: 0
🟢 Medium: 0
🔵 Low: 0
⚪️ Trace: 0

Reports generated:
- audit-report.json
- audit-report.md

✅ Gold Master audit passed.
~/.../WT/GEOTrack_Trial_and_Trace $
