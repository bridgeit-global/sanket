# TDD Defect Register

This register documents defects, credible risks, and architectural vulnerabilities identified during the Phase 1 TDD Readiness Audit.
**DO NOT FIX THESE DEFECTS IN PHASE 1.** Phase 1 is strictly discovery and audit. These records guide test case design in subsequent TDD phases to expose and verify these failure modes before refactoring.

---

## Confirmed Defects

### DEFECT-001: Destructive Substring Replacement in Letter HTML Generation
- **ID:** DEFECT-001
- **Module:** letter-generation
- **Severity:** CRITICAL
- **Status:** CONFIRMED DEFECT
- **File:** `sanket/app/api/letters/route.ts`
- **Function:** `replaceReferenceInHtml(html: string, oldNumber: string, newNumber: number, locale: string)`
- **Observed Behavior:**
  ```ts
  const oldWestern = toWesternDigits(oldNumber).replace(/\D/g, '');
  ...
  return html
    .split(oldLocalized).join(newLocalized)
    .split(oldWestern).join(newWestern);
  ```
  The function performs a global substring replace on the entire rendered HTML string using raw digit strings. If `oldWestern` is `"1"`, every occurrence of the character `"1"` in the entire HTML document is replaced with `newWestern` (e.g. `"42"`).
- **Expected Behavior:**
  Only the specific reference number element/placeholder in the document DOM/HTML should be updated, or reference numbers should be injected into the template before rendering HTML.
- **Evidence:**
  `sanket/app/api/letters/route.ts` lines 19–35. If a letter has reference number "1", inline styles like `font-size: 14px;` become `font-size: 424px;`, hex colors `#111111` become `#424242424242`, dates like `01-01-2024` become `042-042-2024`, and voter EPICs containing "1" get corrupted.
- **Test Required:**
  Unit test `replaceReferenceInHtml` with HTML containing CSS styles, dates, and text containing the digit `1` while replacing reference `1` with `42`. Verify HTML structure and styles remain uncorrupted.
- **Recommended Future Action:**
  Refactor template rendering so reference numbers are injected into data models prior to template compilation, or use targeted DOM/AST replacement rather than global string splitting.

---

### DEFECT-002: Race Condition and Duplicate Generation in Service Token Generation
- **ID:** DEFECT-002
- **Module:** operator (Beneficiary Management)
- **Severity:** HIGH
- **Status:** CONFIRMED DEFECT
- **File:** `sanket/lib/db/queries-crud.ts`
- **Function:** `generateServiceToken(programmeId?: string | null)`
- **Observed Behavior:**
  ```ts
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  ...
  const [result] = await pgSql`
    SELECT COUNT(*)::int AS count
    FROM "BeneficiaryService"
    WHERE created_at >= ${todayStart}
  `;
  const nextNumber = (Number(result?.count) || 0) + 1;
  return `${datePrefix}-${String(nextNumber).padStart(4, '0')}`;
  ```
  Token sequence is computed via `SELECT COUNT(*)`. Unlike `createVisitor` which has a 5-attempt retry loop on unique violations, `createBeneficiaryService` has NO retry loop. If two operators create a beneficiary service concurrently, both execute `SELECT COUNT(*)`, obtain the same count, and generate the identical token string.
- **Expected Behavior:**
  Atomic sequence generation using PostgreSQL sequences, or an atomic counter table / locking row update (as done in `allocateDocumentTypeSequence`).
- **Evidence:**
  `sanket/lib/db/queries-crud.ts` lines 159–190 and lines 1377–1438.
- **Test Required:**
  Integration test executing concurrent `createBeneficiaryService` calls (e.g. 5 parallel promises). Assert unique tokens and zero unhandled database collisions.
- **Recommended Future Action:**
  Replace `SELECT COUNT(*)` with an atomic PostgreSQL sequence or table counter with `RETURNING`.

---

### DEFECT-003: Server Timezone Drift in Service Token Date Prefix
- **ID:** DEFECT-003
- **Module:** operator (Beneficiary Management)
- **Severity:** MEDIUM
- **Status:** CONFIRMED DEFECT
- **File:** `sanket/lib/db/queries-crud.ts`
- **Function:** `generateServiceToken`
- **Observed Behavior:**
  `generateServiceToken` uses `new Date()` directly to compute `todayStart.setHours(0, 0, 0, 0)` and `now.getDate()` using server local time (UTC on Vercel), rather than the application standard `getCalendarYmd` from `lib/ist-date.ts`.
- **Expected Behavior:**
  Constituency operations run on Indian Standard Time (UTC+05:30). The date prefix and daily boundary must use `startOfDayIST()` / `getTodayDateStringIST()`.
- **Evidence:**
  Between 12:00 AM IST and 05:30 AM IST (18:30–23:59 UTC previous day), `generateServiceToken` generates a date prefix for the previous day, and queries for records created since UTC midnight rather than IST midnight. In contrast, `istDatePrefix()` in `sanket/lib/db/visitor-queries.ts` lines 45–51 correctly uses `getCalendarYmd()`.
- **Test Required:**
  Unit test `generateServiceToken` with a simulated UTC clock at 01:00 AM IST (2026-09-18 01:00 IST = 2026-09-17 19:30 UTC) and verify the date prefix is `180926`, not `170926`.
- **Recommended Future Action:**
  Harmonize token date prefix generation to use `lib/ist-date.ts` across all modules.

---

## Likely Risks

### RISK-001: Non-Transactional WhatsApp Broadcast Enqueuing
- **ID:** RISK-001
- **Module:** hierarchy (WhatsApp Broadcast)
- **Severity:** HIGH
- **Status:** LIKELY RISK
- **File:** `sanket/lib/db/cadre-whatsapp-queries.ts`
- **Function:** `enqueueCadreWhatsAppBroadcast`
- **Observed Behavior:**
  Broadcast row is inserted first into `CadreWhatsAppBroadcast`. Then recipient messages are chunked into batches of 100 and inserted into `CadreWhatsAppMessage` via multiple `supabase.from(...).insert()` calls without a database transaction.
- **Failure Scenario:**
  If a network failure, database timeout, or process termination occurs on batch 2 of 5, the broadcast record shows `recipient_count: 500`, but only 100 messages exist in the queue. The remaining 400 recipients are silently dropped.
- **Impact:**
  Partial delivery, corrupted broadcast metrics, orphaned records.
- **Test Required:**
  Integration test with simulated failure on the second batch insert. Verify transaction rollback.
- **Recommended Future Action:**
  Wrap broadcast creation and message queue insertion in a single PostgreSQL transaction using `pgSql.begin(...)`.

---

### RISK-002: Service Role Bypass of PostgreSQL Row Level Security (RLS)
- **ID:** RISK-002
- **Module:** cross-cutting (Data Access Layer)
- **Severity:** HIGH
- **Status:** LIKELY RISK
- **File:** `sanket/lib/supabase/server.ts`
- **Function:** `getClient()`
- **Observed Behavior:**
  Server-side queries use `resolveServiceRoleKey()`, creating a Supabase client with the PostgreSQL `service_role` key. In Supabase, `service_role` completely bypasses RLS policies.
- **Failure Scenario:**
  If an API route forgets to explicitly check `session.user` or specific module permissions (or has a bug in its WHERE clause), the database layer offers zero defense-in-depth protection.
- **Impact:**
  Privilege escalation, unauthorized data access.
- **Test Required:**
  API authorization test suite verifying every route handler enforces authorization before touching database queries.
- **Recommended Future Action:**
  Implement standardized route-handler authorization wrappers (`withModuleAuth('module-key', handler)`).

---

### RISK-003: Unauthenticated or Over-Permissive Read Access on Voter API
- **ID:** RISK-003
- **Module:** voter / back-office
- **Severity:** MEDIUM
- **Status:** LIKELY RISK
- **File:** `sanket/app/api/voter/[epicNumber]/route.ts`
- **Function:** `GET`
- **Observed Behavior:**
  `GET` checks `if (!session?.user) return 401`. However, unlike `PUT` (which verifies `session.user.modules` contains `'operator'` or `'back-office'`), `GET` does not check ANY module permissions.
- **Failure Scenario:**
  Any authenticated user with any role (e.g. a regular user with only `profile` access) can query full voter profiles, mobile numbers, family relations, and service histories for any EPIC number.
- **Impact:**
  Constituency PII leakage across user tiers.
- **Test Required:**
  API test requesting `GET /api/voter/ABC1234567` with a user session having only `profile` module access; assert `403 Forbidden`.
- **Recommended Future Action:**
  Enforce explicit module access checks (`back-office`, `operator`, `user-management`) on `GET /api/voter/[epicNumber]`.

---

### RISK-004: Gaps in Document Reference Sequencing on Failed Letter Saves
- **ID:** RISK-004
- **Module:** letter-generation / io-register
- **Severity:** MEDIUM
- **Status:** LIKELY RISK
- **File:** `sanket/app/api/letters/route.ts` and `sanket/lib/db/queries-crud.ts`
- **Function:** `POST` and `resolveDocumentTypeReferenceForSave`
- **Observed Behavior:**
  `allocateDocumentTypeSequence` immediately and irreversibly increments `last_sequence` in `DocumentTypeMaster`. If the subsequent `createLetter` or `createRegisterEntry` fails (validation error, DB constraint error, duplicate reference check), the sequence number is permanently lost.
- **Failure Scenario:**
  Official letters or outward registers end up with missing sequence numbers (e.g. ref 101, 103, 104; 102 missing), raising audit concerns in government correspondence.
- **Impact:**
  Audit non-compliance in official correspondence registers.
- **Test Required:**
  Integration test triggering a failed letter creation after sequence allocation; verify whether sequence counter leaked.
- **Recommended Future Action:**
  Sequence allocation should either occur inside the save transaction or provide a rollback/recycle mechanism for uncommitted sequence numbers.

---

### RISK-005: Outward Register Requires Document Type While Inward Does Not
- **ID:** RISK-005
- **Module:** io-register
- **Severity:** LOW
- **Status:** LIKELY RISK
- **File:** `sanket/app/api/register/route.ts`
- **Function:** `POST`
- **Observed Behavior:**
  `if (!documentType && type === 'outward') return 400`. For inward, `documentType` is optional. However, UI form fields or legacy imports might submit without `documentType` and receive an unhandled error.
- **Impact:**
  Client confusion and potential form rejection for outward entries.
- **Test Required:**
  API test for `POST /api/register` with `type: 'outward'` without `documentType`, asserting validation contract.
- **Recommended Future Action:**
  Ensure UI provides a default document type (e.g. 'General') when creating outward entries.

---

## Needs Verification

### VERIFY-001: Mobile Number Deduplication Across Voter Updates
- **ID:** VERIFY-001
- **Module:** voter / back-office
- **Severity:** MEDIUM
- **Status:** NEEDS VERIFICATION
- **File:** `sanket/app/api/voter/[epicNumber]/route.ts` and `sanket/lib/db/queries-crud.ts`
- **Function:** `updateVoter`
- **Observed Behavior:**
  `PUT /api/voter/[epicNumber]` accepts up to 5 mobile numbers and writes them to `VoterMobileNumber`.
- **Verification Needed:**
  Verify if duplicate phone numbers across different voters are prevented, allowed, or trigger unhandled unique constraints, and whether `PhoneUpdateHistory` records changes accurately.
- **Test Required:**
  Integration test updating two voters with the same primary mobile number.

---

### VERIFY-002: NextAuth JWT Session Module Sync on Permission Change
- **ID:** VERIFY-002
- **Module:** user-management / auth
- **Severity:** MEDIUM
- **Status:** NEEDS VERIFICATION
- **File:** `sanket/app/(auth)/auth.ts` and `sanket/middleware.ts`
- **Function:** `jwt` and `session` callbacks
- **Observed Behavior:**
  `token.modules` is populated at `authorize` time when the user logs in. The JWT session has a maxAge of 8 hours.
- **Verification Needed:**
  When an admin changes a user's permissions or role in `RoleModulePermissions` or `UserModulePermissions`, verify whether the active session retains old permissions for up to 8 hours or if session invalidation (`AUTH_SESSION_EPOCH`) is triggered.
- **Test Required:**
  E2E/API test changing a user's permissions in DB and attempting to access the revoked module with the existing JWT.
