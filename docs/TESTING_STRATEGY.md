# 🧪 Testing Strategy

This document maps test types to the **root** `package.json` scripts and outlines the
runtime prerequisites needed to execute each suite reliably.

## Test Types → Commands → Prerequisites

| Test type | Command (run from repo root) | Runtime prerequisites |
| --- | --- | --- |
| Full test suite | `npm test` | Backend + frontend dependencies installed. Environment variables available (see `env.example`). |
| Backend unit/integration | `npm run test:backend` | Backend dependencies installed. `DATABASE_URL` and other required backend env vars set (even if mocked). |
| Frontend unit/component | `npm run test:frontend` | Frontend dependencies installed. Uses Jest/RTL defaults (`--watchAll=false`). |
| End-to-end (Playwright) | `npm run test:e2e` | **Frontend + backend servers running** (e.g., `npm run dev` or Docker). Database available/seeded as needed. Playwright browsers installed (`npx playwright install`). |
| E2E (UI runner) | `npm run test:e2e:ui` | Same prerequisites as E2E; launches Playwright UI. |
| E2E (headed) | `npm run test:e2e:headed` | Same prerequisites as E2E; opens a visible browser. |
| E2E report | `npm run test:e2e:report` | Run after Playwright tests to view results. |

## Notes

- **Prefer root scripts** to keep execution consistent across environments.
- **Environment variables:** use `env.example` as the base and ensure backend test
  config (notably `DATABASE_URL`) is available.
- **E2E prerequisites:** Playwright tests assume the app is already running and
  reachable; start servers first and ensure any required seed data exists.
