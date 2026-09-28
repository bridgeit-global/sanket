# Test Inventory

This document provides the current Phase 2 inventory of tests and test
infrastructure. It distinguishes infrastructure, early Phase 3 work, and
template coverage so future TDD sprints do not duplicate or misclassify tests.

---

## Summary of Current Test Suite

- **Unit Framework:** Vitest 5 (`vitest.config.ts`)
- **Coverage:** V8 via `@vitest/coverage-v8`; text, HTML, and lcov reporters
- **Component tooling:** `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.7, `@testing-library/jest-dom` 7.0.1, and `jsdom` 30.1.0
- **Unit Test Files:** 6 (3 early Phase 3 files, 3 infrastructure files)
- **Unit Tests:** 36 total (29 early Phase 3, 7 infrastructure)
- **Integration Test Files:** 2 infrastructure files; local connectivity is skipped unless explicitly configured
- **API Test Files:** 1 infrastructure harness file, plus 2 existing Playwright template route files
- **Component Test Files:** 1 jsdom infrastructure smoke test
- **E2E Test Files:** 4 existing Playwright template browser flows
- **Meaningful Domain Tests for eOffice / Sanket:** 0
- **Current Meaningful Domain Code Coverage:** **0.0%**

## Phase 2 Infrastructure Inventory

### Test Configurations and Environments

| Item | File / Location | Classification | Status |
|---|---|---|---|
| Unit Vitest config | `vitest.config.ts` | Infrastructure | PASS |
| Integration Vitest config | `vitest.integration.config.ts` | Infrastructure | PASS |
| API Vitest config | `vitest.api.config.ts` | Infrastructure | PASS |
| Component Vitest config | `vitest.component.config.ts` | Infrastructure | PASS |
| Shared aliases / server-only adapter | `vitest.shared.ts`, `tests/mocks/server-only.ts` | Infrastructure | PASS |
| Unit setup and UTC policy | `tests/unit/setup.ts` | Infrastructure | PASS |
| Component setup and jest-dom | `tests/setup/component.setup.ts` | Infrastructure | PASS |
| Test environment setup | `tests/setup/test-environment.ts` | Infrastructure | PASS |
| Environment template | `.env.test.example` | Infrastructure | PASS; names only |
| Component smoke test | `tests/component/infrastructure-smoke.test.ts` | Infrastructure | PASS |

### Infrastructure Tests

| Test area | Files | IDs / result |
|---|---|---|
| Database safety guard | `tests/integration/db/assert-safe-test-database.test.ts` | `TEST-INFRA-DB-001` through `005`; 5 passing |
| Local DB connectivity probe | `tests/integration/db/connectivity.test.ts` | `TEST-INFRA-DB-006`; skipped because local Supabase was not running |
| Auth session builders | `tests/unit/infrastructure/auth-harness.test.ts` | `TEST-INFRA-AUTH-000` through `003`; 4 passing |
| API request helpers | `tests/api/harness.test.ts` | `TEST-INFRA-API-001` through `003`; 7 passing |
| Factories and external mocks | `tests/unit/infrastructure/factories-and-mocks.test.ts` | `TEST-INFRA-FACTORY-001`, `TEST-INFRA-MOCK-001`; 2 passing |
| Server-only import boundary | `tests/unit/infrastructure/server-only-import.test.ts` | `TEST-INFRA-SERVER-001`; 1 passing |

### Foundational Helpers and Boundaries

- **DB safety / harness:** `tests/helpers/database/assert-safe-test-database.ts` exports `assertSafeTestDatabase`, `getTestDb`, a rollback-by-default `createTestTransaction`, and a deliberately no-op `resetKnownTestData` until table-specific cleanup exists.
- **Factories:** `tests/fixtures/factories/index.ts` provides synthetic user, voter, visitor, and project builders.
- **Auth:** `tests/helpers/auth/session.ts` provides unauthenticated, role-less, admin, operator, Back Office, BLA, module-authorized, and module-denied session builders.
- **API:** `tests/helpers/api/requests.ts` provides JSON request, authenticated request, and JSON response helpers for GET/POST/PUT/PATCH/DELETE.
- **Mocks:** `tests/mocks/ai`, `blob`, `push`, `whatsapp`, and `print` define safe external boundaries. AI reuses the existing `MockLanguageModelV2` infrastructure.
- **Server-only:** production protection remains unchanged; Vitest maps only its test import to an empty adapter.

These are **INFRASTRUCTURE TESTS**, not domain tests.

---

## Existing Tests Catalog

### 1. E2E Tests (`tests/e2e/`)

#### Test: `artifacts.test.ts`
- **Test:** Artifact creation and version switching
- **File:** `sanket/tests/e2e/artifacts.test.ts`
- **Module:** chat (Template Artifacts)
- **Layer:** E2E
- **Behavior Protected:**
  Verifies that when prompt triggers an artifact creation (code/markdown), the document panel opens and switching versions shows diff/history.
- **Dependencies:** Playwright, local Next.js dev server, mock model stream
- **Mocked:** AI LLM stream via `lib/ai/models.test.ts` (`MockLanguageModelV2`)
- **Real:** Chromium browser, Next.js server, DOM rendering
- **Status:** PASSING (Template feature, unrelated to eOffice business operations)

#### Test: `chat.test.ts`
- **Test:** Chat message submission, streaming, voting
- **File:** `sanket/tests/e2e/chat.test.ts`
- **Module:** chat (Template Chat)
- **Layer:** E2E
- **Behavior Protected:**
  Verifies user can type a prompt, receive streamed token response, and toggle upvote/downvote buttons.
- **Dependencies:** Playwright, Next.js dev server, mock model stream
- **Mocked:** AI LLM stream via `MockLanguageModelV2`
- **Real:** Chromium browser, Next.js frontend, WebSocket/HTTP streaming
- **Status:** PASSING (Template feature)

#### Test: `reasoning.test.ts`
- **Test:** Reasoning model collapsible thought display
- **File:** `sanket/tests/e2e/reasoning.test.ts`
- **Module:** chat (Template Chat)
- **Layer:** E2E
- **Behavior Protected:**
  Verifies that reasoning stream shows collapsible "Thinking..." block before generating final response.
- **Dependencies:** Playwright, Next.js dev server, mock reasoning stream
- **Mocked:** AI LLM stream
- **Real:** Chromium browser, UI accordion components
- **Status:** PASSING (Template feature)

#### Test: `session.test.ts`
- **Test:** Guest and user session creation and persistence
- **File:** `sanket/tests/e2e/session.test.ts`
- **Module:** chat / auth (Template Session)
- **Layer:** E2E
- **Behavior Protected:**
  Verifies unauthenticated guest can start a session, see login prompt on restricted actions, and login via form.
- **Dependencies:** Playwright, Next.js dev server, NextAuth credentials provider
- **Mocked:** AI models
- **Real:** Chromium browser, NextAuth session cookies
- **Status:** PASSING (Template auth workflow, does not test Sanket role matrix or BLA login)

---

### 2. API Route Tests (`tests/routes/`)

#### Test: `routes/chat.test.ts`
- **Test:** `POST /api/chat` request validation and response streaming
- **File:** `sanket/tests/routes/chat.test.ts`
- **Module:** chat
- **Layer:** API
- **Behavior Protected:**
  Validates request payload schema, ensures authenticated session or guest token, and checks stream response headers.
- **Dependencies:** Playwright `request` fixture, Next.js server
- **Mocked:** AI language models
- **Real:** Next.js Route Handler, NextAuth session validation
- **Status:** PASSING (Template API)

#### Test: `routes/document.test.ts`
- **Test:** Document CRUD and suggestion creation
- **File:** `sanket/tests/routes/document.test.ts`
- **Module:** chat (Documents/Artifacts)
- **Layer:** API
- **Behavior Protected:**
  Verifies `GET /api/document`, `POST /api/document`, and `POST /api/suggestions` endpoints save and retrieve document versions.
- **Dependencies:** Playwright `request` fixture, Next.js server, PostgreSQL database
- **Mocked:** None
- **Real:** PostgreSQL `Document` and `Suggestion` tables
- **Status:** PASSING (Template API)

---

## Behavior Coverage

| System Feature | Tested by Existing Tests? | Notes |
|---|---|---|
| AI Chat Interface | Partial | Covered by template tests |
| AI Artifacts & Code View | Partial | Covered by template tests |
| User Authentication (Login/Register) | Minimal | Only basic template credentials login; no BLA or role tests |
| Role & Module Authorization Matrix | **NO** | 0% coverage |
| Voter Search & EPIC Barcode Decoding | **NO** | 0% coverage |
| Voter Profile Updates & Mobile Tracking | **NO** | 0% coverage |
| Visitor Registration & Daily Token Sequence | **NO** | 0% coverage |
| Beneficiary Services & Token Generation | **NO** | 0% coverage |
| Service Catalog & Category Assignment | **NO** | 0% coverage |
| Daily Programme Scheduling & Attendees | **NO** | 0% coverage |
| Inward/Outward Register Entry & File Attachments | **NO** | 0% coverage |
| Document Type Sequencing & Reference Format | **NO** | 0% coverage |
| Letter Generation & Template HTML Rendering | **NO** | 0% coverage |
| Address Master & Position Linking | **NO** | 0% coverage |
| MLA Projects, Status Lifecycle & Approvals | **NO** | 0% coverage |
| ADM Fund Records, Allocations & Sanctions | **NO** | 0% coverage |
| Voting Participation Marking (Single & Bulk) | **NO** | 0% coverage |
| Cadre Hierarchy (Wings, Levels, Members) | **NO** | 0% coverage |
| WhatsApp Broadcasts & Message Queue Draining | **NO** | 0% coverage |
| Push Notifications & VAPID Registration | **NO** | 0% coverage |
| Short URL Generation & S3/Storage Signing | **NO** | 0% coverage |
| SIR Verification & Activity Logging | **NO** | 0% coverage |
| Data Export Jobs & Filtering | **NO** | 0% coverage |

---

## Missing Critical Behaviors

1. **Authentication & Role Authorization:**
   - Multi-role permission checks (`RoleModulePermissions`, `UserModulePermissions`).
   - BLA role-restricted login flow (`blaLogin`).
   - API protection when session exists but user lacks module entitlements.
2. **Data Integrity & Concurrency:**
   - Concurrency race conditions on token generation (`createBeneficiaryService`, `createVisitor`).
   - Atomic sequence allocation and rollback on `allocateDocumentTypeSequence`.
   - Multi-record transaction atomicity for WhatsApp broadcast queues.
3. **Core Business Validation:**
   - Indian mobile number normalization and validation (`normalizeIndianMobileDigits`).
   - IST calendar date calculations (`startOfDayIST`, `differenceInCalendarDaysYmd`).
   - EPIC format parsing and barcode extraction.
   - Reference number parsing and formatting (`parseReference`, `formatReference`).
4. **Letter Generation & PDF Export:**
   - HTML template placeholder interpolation without corrupting CSS or digits.
   - Paper size calculations (`a4`, `a5`, `b5`).
   - Address block string formatting with Marathi and English bilingual lines.

---

## Test Infrastructure

- **Unit / integration / API / component runner:** Vitest 5 with explicit configs listed above.
- **Coverage:** V8 provider with text, HTML, and lcov reports; no aggressive thresholds.
- **Browser runner:** Playwright Test (`@playwright/test`) with `playwright.config.ts`.
- **Playwright command:** `pnpm test` (sets `PLAYWRIGHT=True && pnpm exec playwright test`); preserved for compatibility.
- **Environment handling:** Vitest loads only `.env.test`; Playwright retains its existing `.env.local` behavior and is not an authoritative domain integration runner.
- **Database handling:** local/disposable PostgreSQL/Supabase only, protected by the fail-closed test database guard. No staging/production fallback.

---

## Future Test IDs Convention

Every future TDD test MUST be tagged with a standardized ID:

- `TEST-UNIT-[MODULE]-[NUMBER]` (e.g. `TEST-UNIT-LETTERS-001`)
- `TEST-INT-[MODULE]-[NUMBER]` (e.g. `TEST-INT-OPERATOR-001`)
- `TEST-API-[MODULE]-[NUMBER]` (e.g. `TEST-API-REGISTER-001`)
- `TEST-COMP-[MODULE]-[NUMBER]` (e.g. `TEST-COMP-VISITOR-001`)
- `TEST-E2E-[MODULE]-[NUMBER]` (e.g. `TEST-E2E-BENEFICIARY-001`)
- `TEST-INFRA-[AREA]-[NUMBER]` for test infrastructure (e.g. `TEST-INFRA-DB-001`)

This guarantees exact mapping between requirements, defect reproduction, and implementation coverage.
