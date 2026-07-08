# ACTUALIZADO HASTA 08/07/2026
~/.../WT/GEOTrack_Trial_and_Trace $ git diff --check
~/.../WT/GEOTrack_Trial_and_Trace $ npm test

> w-tracker@1.0.0 test
> jest --coverage --no-watchman

PASS src/core/selectors/__tests__/selectors_harden.test.ts (13.387 s)
PASS src/core/__tests__/serializeError.test.ts (13.251 s)
PASS src/services/__tests__/Notifications.test.ts (13.105 s)
PASS src/core/__tests__/effects.test.ts (13.71 s)
PASS src/services/__tests__/LocationManager.test.ts (13.59 s)
PASS src/core/__tests__/geolocation_harden.test.ts (13.728 s)
PASS src/utils/__tests__/dateUtils.test.ts (14.059 s)
PASS src/utils/__tests__/geoUtils.test.ts
PASS src/core/runtime/__tests__/notificationsAdapter.test.ts
PASS src/utils/__tests__/payrollUtils.test.ts
PASS src/feedback/__tests__/logBridge.test.ts
PASS src/core/__tests__/reducer.test.ts
PASS src/core/__tests__/navigation.test.ts
PASS src/core/__tests__/engine.test.ts
--------------------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------------------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------------------------------
All files                 |    50.6 |    31.02 |   39.65 |   49.37 |
 core                     |   72.09 |    57.14 |   66.66 |   73.41 |
  workTrackerEngine.ts    |   72.09 |    57.14 |   66.66 |   73.41 | 59-74,116,127-128,134-137,149,158,173-174,192-216
 core/effects             |   45.29 |    51.85 |   46.66 |    46.1 |
  index.ts                |   45.29 |    51.85 |   46.66 |    46.1 | 24,74-110,183,245-346,431-489,569-623,645,704-768,831-911,1002
 core/reducer             |    43.8 |     37.9 |   58.33 |   46.08 |
  index.ts                |    43.8 |     37.9 |   58.33 |   46.08 | 68,114,117-143,159-177,187-190,199-209,213-234
 core/runtime             |   23.07 |      2.4 |   14.28 |   23.89 |
  notificationsAdapter.ts |   33.33 |    15.78 |   66.66 |   33.96 | 24-39,48-59,72-100,110-137
  sessionStoreAdapter.ts  |   14.28 |        0 |       0 |      15 | 89-211,226-311,324-332,336-342,346-347,351-359,369-377
 core/selectors           |   66.66 |       50 |   66.66 |   64.58 |
  index.ts                |   66.66 |       50 |   66.66 |   64.58 | 14-28,32-38,83,87
 core/state               |     100 |      100 |     100 |     100 |
  index.ts                |     100 |      100 |     100 |     100 |
  initialState.ts         |     100 |      100 |     100 |     100 |
 database                 |   33.83 |        0 |       0 |   26.54 |
  db.ts                   |   33.83 |        0 |       0 |   26.54 | ...-236,246-254,264-265,271-289,299-307,322-330,344-358,366,378-394,401-402,409-410,420-428,438-439,447-448
 feedback                 |   70.86 |    46.96 |    87.5 |   70.43 |
  logBridge.ts            |   70.86 |    46.96 |    87.5 |   70.43 | ...,138,145-162,174,178,182,186,190,194,198,202,206,210,214,218,222,226,230,234,238,242,246,250,254,258,262
 services                 |   51.25 |    35.84 |   61.53 |   51.29 |
  LocationManager.ts      |   30.55 |     7.14 |      40 |   30.43 | 44-129,142,152-171
  Notifications.ts        |   68.18 |       68 |      75 |   68.23 | 16-24,37-38,63-64,70-71,76-81,90-91,103-104,124,130-131,156,161-166
 utils                    |   59.06 |    33.33 |   43.47 |   56.11 |
  dateUtils.ts            |     100 |      100 |     100 |     100 |
  dayjsSetup.ts           |     100 |      100 |     100 |     100 |
  geoUtils.ts             |     100 |      100 |     100 |     100 |
  logger.ts               |   19.51 |        0 |       0 |   17.56 | 45-47,51-56,62-67,73-99,105-125,131-179,190-223
  payrollUtils.ts         |     100 |      100 |     100 |     100 |
  timeProvider.ts         |   81.81 |      100 |   42.85 |     100 |
--------------------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------------------------------

Test Suites: 14 passed, 14 total
Tests:       66 passed, 66 total
Snapshots:   0 total
Time:        16.943 s
Ran all test suites.
~/.../WT/GEOTrack_Trial_and_Trace $ npm run lint

> w-tracker@1.0.0 lint
> expo lint

~/.../WT/GEOTrack_Trial_and_Trace $ npm run typecheck

> w-tracker@1.0.0 typecheck
> tsc --noEmit

~/.../WT/GEOTrack_Trial_and_Trace $ git add app/_layout.tsx app/disclaimer.tsx app/onboarding.tsx src/core/runtime/sessionStoreAdapter.ts
~/.../WT/GEOTrack_Trial_and_Trace $
~/.../WT/GEOTrack_Trial_and_Trace $ git commit -m "fix(app): harden startup navigation and theme tokens" \
>   -m "Type route replacements with Href in the root navigation guard." \
>   -m "Align onboarding, disclaimer, and startup error text colors with semantic palette tokens." \
>   -m "Clean up session store formatting and keep AsyncStorage hydration/persistence resilient."
[main 11da6826] fix(app): harden startup navigation and theme tokens
 4 files changed, 53 insertions(+), 35 deletions(-)
~/.../WT/GEOTrack_Trial_and_Trace $ git push origin main
Enumerating objects: 19, done.
Counting objects: 100% (19/19), done.
Delta compression using up to 8 threads
Compressing objects: 100% (10/10), done.
Writing objects: 100% (10/10), 1.53 KiB | 1.53 MiB/s, done.
Total 10 (delta 8), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (8/8), completed with 8 local objects.
To github.com:BDevDPaz/GEOTrack_Trial_and_Trace.git
   3adec2fa..11da6826  main -> main
~/.../WT/GEOTrack_Trial_and_Trace $ git status
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
~/.../WT/GEOTrack_Trial_and_Trace $ git log --oneline --decorate -3
11da6826 (HEAD -> main, origin/main, origin/HEAD) fix(app): harden startup navigation and theme tokens
3adec2fa Merge pull request #15 from BDevDPaz/intelligent-ux-routing-5223173584163721355
5c5f1e37 Implement intelligent UX routing and adaptive navigation guards
~/.../WT/GEOTrack_Trial_and_Trace $ git tag -a v1.0.1 -m "Stable consolidation and startup navigation hardening"
~/.../WT/GEOTrack_Trial_and_Trace $ git push origin v1.0.1
Enumerating objects: 1, done.
Counting objects: 100% (1/1), done.
Writing objects: 100% (1/1), 198 bytes | 198.00 KiB/s, done.
Total 1 (delta 0), reused 0 (delta 0), pack-reused 0 (from 0)
To github.com:BDevDPaz/GEOTrack_Trial_and_Trace.git
 * [new tag]           v1.0.1 -> v1.0.1
~/.../WT/GEOTrack_Trial_and_Trace $ git switch main
Already on 'main'
Your branch is up to date with 'origin/main'.
~/.../WT/GEOTrack_Trial_and_Trace $ git pull --ff-only origin main
From github.com:BDevDPaz/GEOTrack_Trial_and_Trace
 * branch              main       -> FETCH_HEAD
Already up to date.
~/.../WT/GEOTrack_Trial_and_Trace $ git fetch --all --prune
~/.../WT/GEOTrack_Trial_and_Trace $ git diff --check                                                                                 ~/.../WT/GEOTrack_Trial_and_Trace $ npm audit                                                                                        # npm audit report

postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output - https://github.com/advisories/GHSA-qx2v-qp2m-jg93
fix available via `npm audit fix --force`
Will install expo@57.0.4, which is a breaking change
node_modules/postcss
  @expo/metro-config  <=0.0.1-canary-20240418-8d74597 || >=0.1.49-alpha.0
  Depends on vulnerable versions of @expo/config
  Depends on vulnerable versions of postcss
  node_modules/expo/node_modules/@expo/metro-config
    @expo/cli  <=0.0.0-canary-20231123-1b19f96-4 || >=0.0.1-canary-20231125-d600e44
    Depends on vulnerable versions of @expo/config
    Depends on vulnerable versions of @expo/config-plugins
    Depends on vulnerable versions of @expo/metro-config
    Depends on vulnerable versions of @expo/prebuild-config
    node_modules/expo/node_modules/@expo/cli
      expo  >=41.0.0-alpha.0
      Depends on vulnerable versions of @expo/cli
      Depends on vulnerable versions of @expo/config
      Depends on vulnerable versions of @expo/config-plugins
      Depends on vulnerable versions of @expo/metro-config
      Depends on vulnerable versions of expo-asset
      Depends on vulnerable versions of expo-constants
      node_modules/expo

uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via `npm audit fix --force`
Will install expo@57.0.4, which is a breaking change
node_modules/uuid
  xcode  >=0.9.2
  Depends on vulnerable versions of uuid
  node_modules/xcode
    @expo/config-plugins  *
    Depends on vulnerable versions of xcode
    node_modules/@expo/config-plugins
      @expo/config  <=0.0.1-canary-20240418-8d74597 || >=3.3.23-alpha.0
      Depends on vulnerable versions of @expo/config-plugins
      node_modules/@expo/config
        @expo/prebuild-config  *
        Depends on vulnerable versions of @expo/config
        Depends on vulnerable versions of @expo/config-plugins
        node_modules/@expo/prebuild-config
          expo-splash-screen  <=0.0.1-canary-20240418-8d74597 || 0.11.0 - 56.0.0-canary-20260506-964f25d
          Depends on vulnerable versions of @expo/prebuild-config
          node_modules/expo-splash-screen
        expo-constants  <=0.0.1-canary-20240418-8d74597 || 10.1.2 - 55.0.14 || 56.0.0-canary-20260212-4f61309 - 56.0.0-canary-20260506-964f25d
        Depends on vulnerable versions of @expo/config
        node_modules/expo-constants
          expo-asset  <=0.0.1-canary-20240418-8d74597 || 8.6.1 - 55.0.0-canary-20260223-05214f1 || 55.0.3-canary-20260128-67ce8d5 || 55.0.8-canary-20260424-7bedc9d - 55.0.8-canary-20260429-a5e59cf || 55.0.11-canary-20260327-0789fbc - 55.0.11-canary-20260402-9da566b || 56.0.0-canary-20260212-4f61309 - 56.0.0-canary-20260506-964f25d
          Depends on vulnerable versions of expo-constants
          node_modules/expo/node_modules/expo-asset
          expo-linking  <=0.0.1-canary-20240418-8d74597 || 2.2.2 - 55.0.0-canary-20260223-05214f1 || 55.0.4-canary-20260128-67ce8d5 || 55.0.8-canary-20260424-7bedc9d - 55.0.8-canary-20260429-a5e59cf || 55.0.10-canary-20260327-0789fbc - 55.0.10-canary-20260402-9da566b || 56.0.0-canary-20260212-4f61309 - 56.0.0-canary-20260506-964f25d || 56.0.13-canary-20260526-6cd5e37 - 56.0.13-canary-20260701-9100865 || 57.0.0-canary-20260526-13e89ca - 57.0.0-canary-20260623-1c70a78
          Depends on vulnerable versions of expo-constants
          node_modules/expo-linking
            expo-router  <=0.0.33 || 4.0.13-canary-20241211-61c49bd || 4.0.18-canary-20250124-42fe332 - 4.0.18-canary-20250306-d9d3e02 || 4.0.20-canary-20250320-7a205d3 || 4.0.21 - 5.0.2-preview.6 || 5.2.0-canary-20250611-f0afe80 - 55.0.0-canary-20260223-05214f1 || 55.0.3-canary-20260424-7bedc9d - 55.0.3-canary-20260429-a5e59cf || 55.0.9-canary-20260327-0789fbc - 55.0.9-canary-20260402-9da566b || 56.0.0-canary-20260212-4f61309 - 56.0.0-canary-20260506-964f25d || 56.2.8-canary-20260526-6cd5e37 - 56.2.8-canary-20260701-9100865
            Depends on vulnerable versions of expo-constants
            Depends on vulnerable versions of expo-linking
            node_modules/expo-router
          expo-notifications  <=0.0.1-canary-20240418-8d74597 || 0.11.4 - 55.0.0-canary-20260223-05214f1 || 55.0.5-canary-20260128-67ce8d5 || 55.0.11-canary-20260424-7bedc9d - 55.0.11-canary-20260429-a5e59cf || 55.0.15-canary-20260327-0789fbc - 55.0.15-canary-20260402-9da566b || 56.0.0-canary-20260212-4f61309 - 56.0.0-canary-20260506-964f25d || 57.0.0-canary-20260526-13e89ca - 57.0.0-canary-20260623-1c70a78
          Depends on vulnerable versions of expo-constants
          node_modules/expo-notifications
        expo-manifests  <=0.0.1-canary-20240418-8d74597 || 0.9.0 - 55.0.15 || 56.0.0-canary-20260212-4f61309 - 56.0.0-canary-20260506-964f25d
        Depends on vulnerable versions of @expo/config
        node_modules/expo-manifests
          expo-dev-client  <=0.0.1-canary-20240418-8d74597 || 3.1.0 - 55.0.0-canary-20260223-05214f1 || 55.0.4-canary-20260128-67ce8d5 || 55.0.20-canary-20260327-0789fbc - 55.0.20-canary-20260402-9da566b || 56.0.0-canary-20260212-4f61309 - 56.0.0-canary-20260506-964f25d
          Depends on vulnerable versions of expo-dev-launcher
          Depends on vulnerable versions of expo-manifests
          node_modules/expo-dev-client
          expo-dev-launcher  <=0.0.1-canary-20240418-8d74597 || 3.1.0 - 55.0.0-canary-20260223-05214f1 || 55.0.5-canary-20260128-67ce8d5 || 55.0.21-canary-20260327-0789fbc - 55.0.21-canary-20260402-9da566b || 56.0.0-canary-20260212-4f61309 - 56.0.0-canary-20260506-964f25d
          Depends on vulnerable versions of expo-manifests
          node_modules/expo-dev-launcher
        jest-expo  42.0.0 - 56.0.0-canary-20260506-964f25d
        Depends on vulnerable versions of @expo/config
        node_modules/jest-expo

> 19 moderate severity vulnerabilities

#
# OBSOLETO DESDE 07/07/2026
Test gm {
> w-tracker@1.0.0 gm
> npm run typecheck && npm run lint && npm run test && npm run audit:gm


> w-tracker@1.0.0 typecheck
> tsc --noEmit


> w-tracker@1.0.0 lint
> expo lint


> w-tracker@1.0.0 test
> jest --coverage --no-watchman

PASS src/core/__tests__/serializeError.test.ts (12.533 s)
PASS src/services/__tests__/Notifications.test.ts (12.983 s)
PASS src/core/__tests__/effects.test.ts (13.391 s)
PASS src/core/__tests__/reducer.test.ts
PASS src/services/__tests__/LocationManager.test.ts
PASS src/feedback/__tests__/logBridge.test.ts (13.605 s)
PASS src/core/selectors/__tests__/selectors_harden.test.ts (13.624 s)
PASS src/core/__tests__/geolocation_harden.test.ts (13.422 s)
PASS src/utils/__tests__/payrollUtils.test.ts
PASS src/core/__tests__/engine.test.ts (13.693 s)
PASS src/utils/__tests__/dateUtils.test.ts
PASS src/core/runtime/__tests__/notificationsAdapter.test.ts
PASS src/utils/__tests__/geoUtils.test.ts
--------------------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------------------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------------------------------
All files                 |   50.22 |     30.6 |   37.86 |   49.07 |
 core                     |   72.09 |    57.14 |   66.66 |   73.41 |
  workTrackerEngine.ts    |   72.09 |    57.14 |   66.66 |   73.41 | 59-74,116,127-128,134-137,149,158,173-174,192-216
 core/effects             |   43.97 |    51.85 |   42.85 |   44.78 |
  index.ts                |   43.97 |    51.85 |   42.85 |   44.78 | 24,74-110,183,245-346,431-489,569-623,645,704-768,831-911,953
 core/reducer             |   42.01 |    36.06 |   58.33 |   44.24 |
  index.ts                |   42.01 |    36.06 |   58.33 |   44.24 | 68,113-141,157-175,185-188,197-207,211-232
 core/runtime             |   24.29 |      2.4 |   14.28 |   25.24 |
  notificationsAdapter.ts |   33.33 |    15.78 |   66.66 |   33.96 | 24-39,48-59,72-100,110-137
  sessionStoreAdapter.ts  |   15.09 |        0 |       0 |      16 | 88-209,224-280,293-301,305-310,314-315,319-327,337-345
 core/selectors           |   61.11 |       50 |   55.55 |   59.52 |
  index.ts                |   61.11 |       50 |   55.55 |   59.52 | 14-28,32-38,83,87
 core/state               |     100 |      100 |     100 |     100 |
  index.ts                |     100 |      100 |     100 |     100 |
  initialState.ts         |     100 |      100 |     100 |     100 |
 database                 |   33.83 |        0 |       0 |   26.54 |
  db.ts                   |   33.83 |        0 |       0 |   26.54 | ...-236,246-254,264-265,271-289,299-307,322-330,344-358,366,378-394,401-402,409-410,420-428,438-439,447-448
 feedback                 |   70.86 |    46.96 |    87.5 |   70.43 |
  logBridge.ts            |   70.86 |    46.96 |    87.5 |   70.43 | ...,138,145-162,174,178,182,186,190,194,198,202,206,210,214,218,222,226,230,234,238,242,246,250,254,258,262
 services                 |   51.25 |    35.84 |   61.53 |   51.29 |
  LocationManager.ts      |   30.55 |     7.14 |      40 |   30.43 | 44-129,142,152-171
  Notifications.ts        |   68.18 |       68 |      75 |   68.23 | 16-24,37-38,63-64,70-71,76-81,90-91,103-104,124,130-131,156,161-166
 utils                    |   59.06 |    33.33 |   43.47 |   56.11 |
  dateUtils.ts            |     100 |      100 |     100 |     100 |
  dayjsSetup.ts           |     100 |      100 |     100 |     100 |
  geoUtils.ts             |     100 |      100 |     100 |     100 |
  logger.ts               |   19.51 |        0 |       0 |   17.56 | 45-47,51-56,62-67,73-99,105-125,131-179,190-223
  payrollUtils.ts         |     100 |      100 |     100 |     100 |
  timeProvider.ts         |   81.81 |      100 |   42.85 |     100 |
--------------------------|---------|----------|---------|---------|-------------------------------------------------------------------------------------------------------------

Test Suites: 13 passed, 13 total
Tests:       61 passed, 61 total
Snapshots:   0 total
Time:        16.301 s, estimated 24 s
Ran all test suites.

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

#tree
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
│   │       ├── audit-2026-07-08T01-25-13-280Z.json
│   │       ├── audit-2026-07-08T01-36-58-058Z.json
│   │       ├── audit-2026-07-08T01-36-58-060Z.md
│   │       ├── audit-2026-07-08T01-39-57-842Z.json
│   │       ├── audit-2026-07-08T01-39-57-843Z.md
│   │       ├── audit-2026-07-08T02-20-37-009Z.json
│   │       ├── audit-2026-07-08T02-20-37-011Z.md
│   │       ├── audit-2026-07-08T07-35-29-822Z.json
│   │       ├── audit-2026-07-08T07-35-29-823Z.md
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
└── tsconfig.json

# commit -m "100% sinc"
[main 4e4965f8] 100% sinc
 1 file changed, 937 deletions(-)
 delete mode 100644 src/core/effects/index.ts.txt

#
Enumerating objects: 9, done.
Counting objects: 100% (9/9), done.
Delta compression using up to 8 threads
Compressing objects: 100% (4/4), done.
Writing objects: 100% (5/5), 427 bytes | 427.00 KiB/s, done.
Total 5 (delta 3), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (3/3), completed with 3 local objects.
To github.com:BDevDPaz/GEOTrack_Trial_and_Trace.git
   933c06da..4e4965f8  main -> main
~/.../WT/GEOTrack_Trial_and_Trace $ git status
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean}
