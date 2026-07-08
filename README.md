~/.../WT/GEOTrack_Trial_and_Trace $ tree -I node_modules
.
├── README.md
├── app
│   ├── (tabs)
│   │   ├── _layout.tsx
│   │   ├── history.tsx
│   │   ├── index.tsx
│   │   ├── report.tsx
│   │   └── settings.tsx
│   ├── _layout.tsx
│   └── session
│       └── [id].tsx
├── app.json
├── assets
│   └── images
│       ├── adaptive-icon.png
│       ├── favicon.png
│       ├── icon.png
│       ├── splash-icon.png
│       └── splash.png
├── coverage
│   ├── clover.xml
│   ├── coverage-final.json
│   ├── lcov-report
│   │   ├── base.css
│   │   ├── block-navigation.js
│   │   ├── core
│   │   │   ├── effects
│   │   │   │   ├── index.html
│   │   │   │   └── index.ts.html
│   │   │   ├── index.html
│   │   │   ├── reducer
│   │   │   │   ├── index.html
│   │   │   │   └── index.ts.html
│   │   │   ├── runtime
│   │   │   │   ├── index.html
│   │   │   │   ├── notificationsAdapter.ts.html
│   │   │   │   └── sessionStoreAdapter.ts.html
│   │   │   ├── selectors
│   │   │   │   ├── index.html
│   │   │   │   └── index.ts.html
│   │   │   ├── state
│   │   │   │   ├── index.html
│   │   │   │   ├── index.ts.html
│   │   │   │   └── initialState.ts.html
│   │   │   └── workTrackerEngine.ts.html
│   │   ├── database
│   │   │   ├── db.ts.html
│   │   │   └── index.html
│   │   ├── favicon.png
│   │   ├── feedback
│   │   │   ├── index.html
│   │   │   └── logBridge.ts.html
│   │   ├── index.html
│   │   ├── prettify.css
│   │   ├── prettify.js
│   │   ├── services
│   │   │   ├── LocationManager.ts.html
│   │   │   ├── Notifications.ts.html
│   │   │   └── index.html
│   │   ├── sort-arrow-sprite.png
│   │   ├── sorter.js
│   │   └── utils
│   │       ├── dateUtils.ts.html
│   │       ├── dayjsSetup.ts.html
│   │       ├── geoUtils.ts.html
│   │       ├── index.html
│   │       ├── logger.ts.html
│   │       ├── payrollUtils.ts.html
│   │       └── timeProvider.ts.html
│   └── lcov.info
├── eas.json
├── eslint.config.js
├── expo-env.d.ts
├── jest.config.js
├── metro.config.js
├── package-lock.json
├── package.json
├── scripts
│   ├── audit
│   │   ├── audits
│   │   │   ├── android.audit.ts
│   │   │   ├── concurrency.audit.ts
│   │   │   ├── database.audit.ts
│   │   │   ├── geofencing.audit.ts
│   │   │   ├── logger.audit.ts
│   │   │   ├── payroll.audit.ts
│   │   │   ├── security.audit.ts
│   │   │   ├── time.audit.ts
│   │   │   └── ui.audit.ts
│   │   ├── core
│   │   │   ├── config.ts
│   │   │   ├── fileScanner.ts
│   │   │   ├── finding.ts
│   │   │   ├── reporter.ts
│   │   │   ├── severity.ts
│   │   │   └── shell.ts
│   │   ├── export_audit_files.sh
│   │   ├── gold-master.ts
│   │   └── reports
│   │       ├── audit-2026-07-08T01-12-31-301Z.json
│   │       ├── audit-2026-07-08T01-25-13-280Z.json
│   │       ├── audit-2026-07-08T01-25-13-281Z.md
│   │       ├── audit-2026-07-08T01-36-58-058Z.json
│   │       ├── audit-2026-07-08T01-36-58-060Z.md
│   │       ├── audit-2026-07-08T01-39-57-842Z.json
│   │       ├── audit-2026-07-08T01-39-57-843Z.md
│   │       ├── audit-2026-07-08T02-20-37-009Z.json
│   │       ├── audit-2026-07-08T02-20-37-011Z.md
│   │       ├── audit-report.json
│   │       └── audit-report.md
│   ├── fix
│   │   └── apply-gm-audit-fixes.cjs
│   └── images
│       ├── convert_icons.sh
│       └── svg
│           ├── adaptive-icon.svg
│           ├── icon.svg
│           ├── splash-icon.svg
│           └── splash.svg
├── src
│   ├── components
│   │   ├── modals
│   │   │   ├── AddNoteModal.tsx
│   │   │   ├── DailySetupModal.tsx
│   │   │   ├── DeleteSessionModal.tsx
│   │   │   ├── EditSessionModal.tsx
│   │   │   ├── ExitDetectionModal.tsx
│   │   │   └── LunchModal.tsx
│   │   └── ui
│   │       ├── AppBrandTitle.tsx
│   │       ├── Button.tsx
│   │       ├── DailySummaryBlock.tsx
│   │       ├── DocumentPreviewWidget.tsx
│   │       ├── IntegrityBadge.tsx
│   │       ├── LoadingOverlay.tsx
│   │       ├── OperationalHeroCard.tsx
│   │       ├── PageHeader.tsx
│   │       ├── ScreenContainer.tsx
│   │       ├── Section.tsx
│   │       ├── SessionTimeline.tsx
│   │       ├── StatusPill.tsx
│   │       ├── SystemHealthBlock.tsx
│   │       └── index.ts
│   ├── constants
│   │   ├── animations.ts
│   │   ├── icons.ts
│   │   └── theme.ts
│   ├── context
│   │   ├── ThemeContext.tsx
│   │   └── ToastContext.tsx
│   ├── core
│   │   ├── __tests__
│   │   │   ├── effects.test.ts
│   │   │   ├── engine.test.ts
│   │   │   ├── geolocation_harden.test.ts
│   │   │   ├── reducer.test.ts
│   │   │   └── serializeError.test.ts
│   │   ├── boot.ts
│   │   ├── contracts
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── effects
│   │   │   └── index.ts
│   │   ├── hooks
│   │   │   ├── index.ts
│   │   │   └── useWorkTracker.ts
│   │   ├── reducer
│   │   │   └── index.ts
│   │   ├── runtime
│   │   │   ├── __tests__
│   │   │   │   └── notificationsAdapter.test.ts
│   │   │   ├── index.ts
│   │   │   ├── locationAdapter.ts
│   │   │   ├── loggingAdapter.ts
│   │   │   ├── notificationsAdapter.ts
│   │   │   ├── reportsAdapter.ts
│   │   │   ├── securityAdapter.ts
│   │   │   └── sessionStoreAdapter.ts
│   │   ├── selectors
│   │   │   ├── __tests__
│   │   │   │   └── selectors_harden.test.ts
│   │   │   └── index.ts
│   │   ├── state
│   │   │   ├── index.ts
│   │   │   └── initialState.ts
│   │   └── workTrackerEngine.ts
│   ├── database
│   │   └── db.ts
│   ├── feedback
│   │   ├── __tests__
│   │   │   └── logBridge.test.ts
│   │   ├── index.ts
│   │   ├── logBridge.ts
│   │   └── useLogFeedback.ts
│   ├── services
│   │   ├── BackgroundTasks.ts
│   │   ├── LocationManager.ts
│   │   ├── Notifications.ts
│   │   ├── ReportGenerator.ts
│   │   └── __tests__
│   │       ├── LocationManager.benchmark.ts
│   │       ├── LocationManager.test.ts
│   │       └── Notifications.test.ts
│   └── utils
│       ├── __tests__
│       │   ├── dateUtils.test.ts
│       │   ├── geoUtils.test.ts
│       │   └── payrollUtils.test.ts
│       ├── dateUtils.ts
│       ├── dayjsSetup.ts
│       ├── geoUtils.ts
│       ├── i18n.ts
│       ├── logger.ts
│       ├── payrollUtils.ts
│       └── timeProvider.ts
├── tsconfig.json
└── update_reducer.py

50 directories, 168 files
~/.../WT/GEOTrack_Trial_and_Trace $ git add .
~/.../WT/GEOTrack_Trial_and_Trace $ git commit -m "consolidacion final"
[main 8b93935c] consolidacion final
 1 file changed, 144 insertions(+)
 create mode 100644 README.md
~/.../WT/GEOTrack_Trial_and_Trace $ git push
Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.
Delta compression using up to 8 threads
Compressing objects: 100% (3/3), done.
Writing objects: 100% (3/3), 2.90 KiB | 2.90 MiB/s, done.
Total 3 (delta 1), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (1/1), completed with 1 local object.
To github.com:BDevDPaz/GEOTrack_Trial_and_Trace.git
   3d389174..8b93935c  main -> main
~/.../WT/GEOTrack_Trial_and_Trace $ npm run lint

> w-tracker@1.0.0 lint
> expo lint

~/.../WT/GEOTrack_Trial_and_Trace $ npm test

> w-tracker@1.0.0 test
> jest --coverage --no-watchman

PASS src/feedback/__tests__/logBridge.test.ts (11.17 s)
PASS src/core/selectors/__tests__/selectors_harden.test.ts (11.242 s)
PASS src/core/__tests__/reducer.test.ts (10.92 s)
PASS src/utils/__tests__/dateUtils.test.ts
PASS src/core/__tests__/serializeError.test.ts (19.614 s)
PASS src/services/__tests__/Notifications.test.ts (19.722 s)
PASS src/utils/__tests__/geoUtils.test.ts
PASS src/core/__tests__/effects.test.ts (10.859 s)
PASS src/utils/__tests__/payrollUtils.test.ts
PASS src/core/runtime/__tests__/notificationsAdapter.test.ts
PASS src/services/__tests__/LocationManager.test.ts (10.72 s)
PASS src/core/__tests__/geolocation_harden.test.ts (23.305 s)
PASS src/core/__tests__/engine.test.ts (12.087 s)
A worker process has failed to exit gracefully and has been force exited. This is likely caused by tests leaking due to improper teardown. Try running with --detectOpenHandles to find leaks. Active timers can also cause this, ensure that .unref() was called on them.
--------------------------|---------|----------|---------|---------|--------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------------|---------|----------|---------|---------|--------------------
All files                 |    49.3 |    28.28 |   40.24 |   48.49 |
 core                     |   72.09 |    57.14 |   66.66 |   73.41 |
  workTrackerEngine.ts    |   72.09 |    57.14 |   66.66 |   73.41 | ...173-174,192-216
 core/effects             |   36.64 |    29.78 |   48.27 |   39.28 |
  index.ts                |   36.64 |    29.78 |   48.27 |   39.28 | ...200,222-226,268
 core/reducer             |   38.65 |    35.24 |   58.33 |    40.7 |
  index.ts                |   38.65 |    35.24 |   58.33 |    40.7 | ...185-207,211-232
 core/runtime             |   24.76 |      2.4 |   15.38 |   25.74 |
  notificationsAdapter.ts |   33.33 |    15.78 |   66.66 |   33.96 | ...,72-100,110-137
  sessionStoreAdapter.ts  |   15.68 |        0 |       0 |   16.66 | ...310-318,328-336
 core/selectors           |   61.11 |       50 |   55.55 |   59.52 |
  index.ts                |   61.11 |       50 |   55.55 |   59.52 | 14-28,32-38,83,87
 core/state               |     100 |      100 |     100 |     100 |
  index.ts                |     100 |      100 |     100 |     100 |
  initialState.ts         |     100 |      100 |     100 |     100 |
 database                 |   33.06 |        0 |       0 |   26.41 |
  db.ts                   |   33.06 |        0 |       0 |   26.41 | ...409-410,419-420
 feedback                 |   70.86 |    46.96 |    87.5 |   70.43 |
  logBridge.ts            |   70.86 |    46.96 |    87.5 |   70.43 | ...250,254,258,262
 services                 |   51.25 |    35.84 |   61.53 |   51.29 |
  LocationManager.ts      |   30.55 |     7.14 |      40 |   30.43 | 44-129,142,152-171
  Notifications.ts        |   68.18 |       68 |      75 |   68.23 | ...131,156,161-166
 utils                    |   59.06 |    33.33 |   43.47 |   56.11 |
  dateUtils.ts            |     100 |      100 |     100 |     100 |
  dayjsSetup.ts           |     100 |      100 |     100 |     100 |
  geoUtils.ts             |     100 |      100 |     100 |     100 |
  logger.ts               |   19.51 |        0 |       0 |   17.56 | ...131-179,190-223
  payrollUtils.ts         |     100 |      100 |     100 |     100 |
  timeProvider.ts         |   81.81 |      100 |   42.85 |     100 |
--------------------------|---------|----------|---------|---------|--------------------

Test Suites: 13 passed, 13 total
Tests:       62 passed, 62 total
Snapshots:   0 total
Time:        26.151 s
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
~/.../WT/GEOTrack_Trial_and_Trace $ npx expo-doctor
Running 18 checks on your project...
18/18 checks passed. No issues detected!
~/.../WT/GEOTrack_Trial_and_Trace $
