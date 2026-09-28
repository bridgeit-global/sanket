# TDD Progress Tracker

This is the living progress tracker for the eOffice / Sanket TDD Automation Project.
It reflects the verified current state of the codebase. Do not mark modules complete merely because template or boilerplate tests exist.

---

## Current Phase

**PHASE 2 — TEST ARCHITECTURE & FOUNDATIONAL INFRASTRUCTURE (COMPLETE)**

Next Phase: **PHASE 3 — FOUNDATIONAL UNIT TESTING & DEFECT REPRODUCTION**

---

## Global Test Status

The counts below distinguish infrastructure from the early Phase 3 tests and
must not be interpreted as module completion.

- **Unit Tests:** 36 tests in 6 files; 29 early Phase 3 tests and 7 infrastructure tests.
- **Integration Tests:** 6 infrastructure tests in 2 files; 5 passed and 1 skipped because local Supabase was unavailable.
- **API Tests:** 7 infrastructure-harness tests in 1 file, plus 2 existing Playwright template route files.
- **Component Tests:** 1 infrastructure smoke test in 1 file.
- **E2E Tests:** 4 existing Playwright template files.
- **Coverage:** 1.22% statements, 1.16% branches, 0.84% functions, 1.12% lines (truthful Phase 2 baseline).
- **Meaningful domain coverage:** **0.0%**.

### Phase 2 Verification Status

- Vitest unit, API, component, and database safety suites execute in separate environments.
- The declared pnpm 9.12.3 toolchain is available through Corepack and all four
  Phase 2 Vitest commands pass.
- The local database connectivity probe is intentionally skipped without an explicit `.env.test` `TEST_DATABASE_URL`.
- Supabase local API `54421` and PostgreSQL `54422` were not listening; no database connection was attempted.
- No domain database, API route, component, authentication, or defect-reproduction coverage was started in Phase 2.

### Early Phase 3 Tests

These files were created before the roadmap correction and are preserved. They
are classified as **EARLY PHASE 3 WORK**, not Phase 2 infrastructure:

- `tests/unit/lib/indian-mobile.test.ts`
- `tests/unit/lib/epic/extract-epic-from-payload.test.ts`
- `tests/unit/lib/epic/decode-voter-barcode.test.ts`

They currently pass against the actual source implementation. Their URL
assertions use plain `https://wa.me/...` strings. No production source was
changed to make them pass.

---

## Module Progress Matrix

| Module | Priority | Unit | Integration | API | Component | E2E | Coverage | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Auth & Session Management** | P0 | 0 | 0 | 0 | 0 | 1 | 5% | NOT STARTED | Only basic template credentials test; no BLA or role tests |
| **User Management & Permissions** | P0 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Role matrix, user module permissions, epoch resets |
| **ADM (Asset Dev & Funds)** | P0 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | High financial risk; allocations, technical sanctions |
| **I/O Register (Inward & Outward)** | P0 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Official correspondence, document sequence allocation |
| **Letter Generation** | P0 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Critical defect in HTML string replace (DEFECT-001) |
| **Operator (Beneficiary Mgmt)** | P1 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Service token race condition (DEFECT-002, DEFECT-003) |
| **Visitor Workflow** | P1 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Token generation retry loop, visitor service conversion |
| **Voter Master & Search** | P1 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Barcode/EPIC decoding, family grouping, booth mapping |
| **Back-Office (Profile Update)** | P1 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Phone update history, mobile validation, profiling audit |
| **Daily Programme** | P1 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | IST calendar boundaries, attendee linking, reordering |
| **Projects (MLA Projects)** | P1 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Geo mapping, milestones (Bhoomi Pujan, Lokarpan), NOC |
| **Voting Participation** | P1 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Single & bulk marking, election stats |
| **Cadre Hierarchy** | P1 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Tree hierarchy, wing depth, post assignments |
| **Cadre WhatsApp Broadcast** | P1 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Queue atomicity risk (RISK-001), worker auth |
| **Dashboard** | P2 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Metrics aggregation, birthday reminders |
| **Service Catalog** | P2 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Category hierarchy, letter type linking |
| **SIR (Special Intensive Revision)** | P2 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Verification workflows, activity logs |
| **Data Export** | P2 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Background export jobs, CSV/Excel/PDF streaming |
| **Push Notifications** | P2 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | VAPID keys, web push subscriptions |
| **Field Visitor** | P2 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | Booth area field data collection |
| **Short URL Service** | P2 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | S3/Storage signed URL generation, expiration |
| **Chat / Analytics (AI)** | P3 | 0 | 0 | 2 | 0 | 3 | 25% | NOT STARTED | Template tests present; no domain SQL query tests |
| **Profile & Settings** | P3 | 0 | 0 | 0 | 0 | 0 | 0% | NOT STARTED | User personal profile and password reset |

---

## Allowed Status Values

- `NOT STARTED`: No domain-specific tests implemented.
- `IN PROGRESS`: Test cases currently being written under TDD.
- `BLOCKED`: Blocked by external dependency, environment, or architectural defect.
- `BASELINE COVERED`: Foundational unit and integration tests active.
- `COMPLETE`: Full test pyramid achieved with passing CI gates and regression coverage.

---

## Instructions for Future Sprints

1. Update this table after every TDD session.
2. Never increment test counts without adding real test files to `docs/testing/TEST_INVENTORY.md`.
3. Keep this file in sync with automated test execution reports.
