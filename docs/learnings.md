# Project Learnings - Audit Remediation

## Time Management
- Centralizing time management in a `TimeProvider` is crucial for consistency across different JavaScript engines (e.g., Hermes vs V8) and for making the system testable.
- Avoid using `new Date()`, `Date.now()`, and `toISOString()` directly in business logic.
- Use libraries like Day.js with UTC and timezone plugins to handle corporate timezones (e.g., 'America/Los_Angeles') reliably.

## Security & Privacy
- Auditors can have broad rules (e.g., matching "latitude" and "console" in the same file).
- It's better to improve the auditor's specificity than to use "hacks" to hide legitimate variable names.
- Avoid logging exact coordinates in production logs; use high-level event descriptions or sanitized data.

## Expo/Android Configuration
- Always include `POST_NOTIFICATIONS` permission for apps using `expo-notifications` on Android 13+.
- Ensure background location is explicitly enabled in the `expo-location` plugin configuration in `app.json` for reliable geofencing.

## Audit & Quality
- The "Gold Master" approach (running all checks: typecheck, lint, tests, custom audits) provides a high degree of confidence in the system's integrity.
