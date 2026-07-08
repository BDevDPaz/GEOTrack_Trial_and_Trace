# AGENTS.md

## Project

GEOTrack_Trial_and_Trace is an Expo / React Native / TypeScript app focused on work tracking, geolocation, sessions, reporting, integrity, payroll/time utilities and notifications.

## Engineering principles

- Preserve business logic.
- Prefer incremental refactors.
- Keep TypeScript strict.
- Avoid hardcoded UI values.
- Use centralized Design System tokens.
- Keep Expo Router compatibility.
- Run tests, lint, typecheck and audits when available.

## UI principles

- All screens, modals, toasts and feedback components should use shared Design System tokens.
- Prefer primitives from `src/components/ui`.
- Avoid duplicated styles.
- Use semantic colors and variants.
- Keep accessibility in mind: contrast, touch targets, labels and readable typography.
