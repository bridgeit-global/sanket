# Test Architecture

This document defines the Phase 2 test architecture for eOffice / Sanket. It
establishes test boundaries and safe future extension points; it does not claim
domain coverage for the application modules.

## Test Layers

| Layer | Runner | Environment | Current purpose |
|---|---|---|---|
| Unit | Vitest | Node | Pure utilities and test-harness infrastructure |
| Integration | Vitest | Node | Database safety, future local PostgreSQL/Supabase behavior |
| API | Vitest | Node | Request/response helper infrastructure; route coverage starts later |
| Component | Vitest + Testing Library | jsdom | One environment smoke test only |
| E2E | Playwright | Chromium + Next.js server | Existing template/browser behavior |

## Vitest Architecture

Vitest 5 is split into explicit configuration files so a Node test cannot
silently run as a browser test, and a component test cannot accidentally use a
database configuration:

- `vitest.config.ts` — unit tests, Node environment.
- `vitest.integration.config.ts` — integration tests, Node environment.
- `vitest.api.config.ts` — API tests, Node environment.
- `vitest.component.config.ts` — component tests, jsdom environment.
- `vitest.shared.ts` — path alias and the test-only `server-only` adapter.

All test configurations load only `.env.test` when it exists. They never load
`.env.local` or `.env.production`. The `server-only` alias is a test adapter;
production modules continue to contain the real `import 'server-only'` boundary.
The adapter is verified by `TEST-INFRA-SERVER-001`.

## Playwright Architecture

`playwright.config.ts` remains the existing browser configuration, including its
`e2e` and `routes` projects and local Next.js web server. The existing `pnpm
test` command remains the compatibility command for Playwright. `pnpm test:e2e`
is an explicit alias for that same behavior.

The template route and E2E tests are not reclassified as Sanket domain tests.
They remain template coverage until a later phase establishes domain fixtures
and safe route-level database boundaries.

## Directory Structure

```text
tests/
├── unit/
│   ├── infrastructure/
│   └── lib/
├── integration/
│   ├── db/
│   ├── auth/
│   └── modules/
├── api/
├── component/
├── fixtures/
│   └── factories/
├── helpers/
│   ├── database/
│   ├── auth/
│   └── api/
├── mocks/
│   ├── ai/
│   ├── blob/
│   ├── push/
│   ├── whatsapp/
│   └── print/
└── setup/
```

The existing Playwright directories (`tests/e2e`, `tests/routes`, `tests/pages`,
and related fixtures) remain in place.

## Commands

| Command | Purpose |
|---|---|
| `pnpm test:unit` | Run Node unit tests |
| `pnpm test:unit:watch` | Watch Node unit tests |
| `pnpm test:coverage` | Unit tests with V8 text, HTML, and lcov output |
| `pnpm test:unit:coverage` | Compatibility alias for `test:coverage` |
| `pnpm test:integration` | Run DB infrastructure tests and local connectivity probe |
| `pnpm test:api` | Run API harness tests |
| `pnpm test:component` | Run jsdom component tests |
| `pnpm test:e2e` | Run the existing Playwright command |
| `pnpm test` | Existing Playwright compatibility command |
| `pnpm test:all` | Run unit, integration, API, component, then E2E layers |

`pnpm test:all` is intentionally not a CI default yet because the existing
Playwright tests use the application’s current environment and database
assumptions. CI must provide a safe local/ephemeral environment first.

## Test ID Convention

Domain tests use `TEST-UNIT-[MODULE]-NNN`, `TEST-INT-[MODULE]-NNN`,
`TEST-API-[MODULE]-NNN`, `TEST-COMP-[MODULE]-NNN`, and
`TEST-E2E-[MODULE]-NNN`. Infrastructure tests use `TEST-INFRA-[AREA]-NNN`.
IDs are comments beside the relevant test and are recorded in
`docs/testing/TEST_INVENTORY.md`.

## Unit Test Policy

Unit tests are fast, deterministic, and free of network/database access. The
three existing pure-logic test files are preserved as **EARLY PHASE 3 TESTS**.
No additional domain unit tests are to be added during this Phase 2 handoff.

## Integration Test Policy

Integration tests will use real local/disposable PostgreSQL/Supabase behavior.
Mocks are not authoritative for database behavior. Tests must obtain their
connection through `getTestDb()`, which first calls `assertSafeTestDatabase()`.
No test may derive a connection from `DATABASE_URL`, `SUPABASE_DB_URL`,
`.env.local`, staging, or production settings.

## API Test Policy

API tests will exercise route handlers and HTTP contracts in a later phase.
The current API layer contains only reusable request/response helpers and their
infrastructure test. Future tests should cover 400, 401, 403, 404, 409, and
500 contracts without broad route coverage being implied by the harness.

## Component Test Policy

Testing Library and jsdom are installed and verified by one smoke test. Future
component tests must be behavior-oriented and must not turn the component
runner into a second E2E suite.

## E2E Policy

Playwright remains the browser-level runner. E2E tests should cover only
critical workflows once safe fixtures, authentication, and disposable database
provisioning exist. Physical printing and real external delivery are never
allowed in automated tests.

## Test Environment Separation

The intended separation is:

- Development: developer-local `.env.local` and ordinary development services.
- Test: `.env.test` with synthetic values and `TEST_DATABASE_URL` only.
- Staging: deployment environment, never an integration-test target.
- Production: deployment environment, never an integration-test target.

`.env.test.example` documents variable names only. Real credentials must not be
committed.

## Database Safety Guard

`tests/helpers/database/assert-safe-test-database.ts` fails closed unless the
caller provides a valid PostgreSQL URL and `TEST_DATABASE_ENVIRONMENT=test`.
Remote Supabase, production-like, staging-like, malformed, and unverified URLs
are rejected. The configured local Supabase database is `127.0.0.1:54422`.
Non-local disposable databases require explicit `disposable=true` and still
cannot be remote Supabase or production/staging targets.

The guard is tested with synthetic URLs only. It never logs credentials.

## Local Supabase Strategy

The repository’s `supabase/config.toml` is authoritative for local development:

- Project identifier: `sanket`.
- Local API port: `54421`.
- Local PostgreSQL port: `54422`.
- Shadow database port: `54420`.
- Migrations: enabled.
- Seed configuration: enabled in Supabase config, but test setup does not run a
  reset or seed automatically.

The local CLI/Docker service was not running during Phase 2 verification, so no
database connection was made. No staging or production fallback exists.

## DB Isolation/Cleanup Strategy

The future default is transaction rollback for tests that can keep all writes
inside one transaction, with deterministic fixture-owned cleanup for tests that
must cross transaction boundaries. `createTestTransaction()` rolls back its
successful callback by default. `resetKnownTestData()` is intentionally a
no-op until explicit table-specific cleanup handlers exist.

There is no global `TRUNCATE CASCADE`. A local Supabase reset is a deliberate
developer operation, never an implicit test hook, and must be run only against
the verified local project.

## Factory Strategy

`tests/fixtures/factories/` provides a small synthetic factory foundation:
`createTestUser`, `createTestVoter`, `createTestVisitor`, and
`createTestProject`. Factories accept overrides and use `.example.test` or
synthetic values. Entity-specific factories should be added only with the
corresponding test layer.

## Auth Test Harness

`tests/helpers/auth/session.ts` provides builders for an explicit unauthenticated
case, role-less authenticated users, admin, operator, Back Office, BLA,
module-authorized, and module-denied cases. These are test data builders only;
they do not change Auth.js production behavior.

## API Test Harness

`tests/helpers/api/requests.ts` provides `createJsonRequest`,
`createAuthenticatedRequest`, and `expectJsonResponse` for GET, POST, PUT,
PATCH, and DELETE requests. Bearer tokens are synthetic test inputs and are not
interpreted by production authentication code.

## External Mock Policy

- AI: reuse the existing `MockLanguageModelV2` fixtures in
  `lib/ai/models.test.ts` through `tests/mocks/ai`.
- Vercel Blob: use the in-memory transport mock; no storage network calls.
- Web Push: capture calls in memory; never reach push providers.
- WhatsApp: capture sender calls; never invoke an external worker.
- Print: record simulated intent; never access a physical printer.
- Database: do not mock authoritative local database integration.

## Timezone Strategy

Vitest sets `TZ=UTC` deliberately to match common Vercel server behavior. IST
business rules must use explicit Asia/Kolkata logic in application code and
future tests must use fixed clocks/explicit offsets. Changing `process.env.TZ`
after a module has loaded is not considered reliable. DEFECT-003 remains open.

## Coverage Strategy

`pnpm test:coverage` uses Vitest’s V8 provider and emits text, HTML, and lcov
reports. The report is currently informational and has no aggressive global
thresholds. The Phase 2 baseline is truthful but low because only a few pure
utilities are covered; it must not be presented as application domain coverage.

## CI Readiness

The runner/configuration foundation is CI-ready once CI supplies Node, pnpm,
Playwright browsers as needed, and a disposable local/ephemeral PostgreSQL or
Supabase service. CI must set a dedicated `TEST_DATABASE_URL` and
`TEST_DATABASE_ENVIRONMENT=test`; it must not pass deployment database URLs.
Coverage artifacts can be published from `coverage/`.

## TDD Red-Green-Refactor Workflow

1. Write a test with a stable ID and classify its layer.
2. Run the smallest relevant command and record the red result or confirmed
   baseline.
3. Make the smallest production change only when the phase authorizes it.
4. Run the focused test, then the relevant layer, then the safe full suite.
5. Update the inventory and progress documents without claiming module
   completion from infrastructure or template tests.

`replaceReferenceInHtml` remains in `app/api/letters/route.ts`. TESTABILITY-004
is documented, but extraction and DEFECT-001 characterization are deferred to
Phase 3 as required by the roadmap correction.
