# Project TDD Readiness Audit

**Document Version:** 1.0.0  
**Audit Date:** September 17, 2026  
**Status:** Baseline Authority for TDD Automation  
**Author:** Senior Staff Software & QA Automation Architect

---

## Executive Summary

This audit establishes the definitive baseline for a Test-Driven Development (TDD) automation initiative across the **eOffice / Sanket** repository (`d:/Amaan/eOffice/sanket`).

The application is an enterprise-grade constituency management, legislative operations, and political office automation platform for a Member of the Legislative Assembly (MLA) in Maharashtra, India. It handles voter intelligence, public grievances, visitor queuing, financial asset development allocations (ADM), official government correspondence (I/O Register and Letter Generation with Marathi/English bilingual support), cadre political hierarchies, WhatsApp broadcasts, and daily programme scheduling.

### Key Audit Findings:
1. **Current Domain Test Coverage is 0.0%**: The existing test suite contains only 6 tests inherited from the upstream Vercel AI Chatbot template (`tests/e2e/` and `tests/routes/`). Zero tests protect voter profiling, beneficiary management, letters, financial sanctions, or cadre operations.
2. **23 Distinct Functional Modules Identified**: Comprising 5 P0 modules (security, financial, official correspondence), 9 P1 modules (core constituency workflows), 7 P2 modules (supporting operations), and 2 P3 modules.
3. **Critical Defect Discovered in Letter Generation (DEFECT-001)**: The letter HTML generation endpoint (`sanket/app/api/letters/route.ts`) performs a global substring replace on rendered HTML using single-digit strings (`split.join`), corrupting CSS font sizes, hex colors, dates, and voter IDs whenever a reference number contains common single digits like "1".
4. **Race Conditions in Token Sequence Generation (DEFECT-002)**: Service token generation uses `SELECT COUNT(*)` without transactions or locking, guaranteeing collisions under concurrent submissions.
5. **Architectural Security Gap (RISK-002)**: The server data layer operates entirely with the Supabase `service_role` key, completely bypassing PostgreSQL Row-Level Security (RLS) policies and relying solely on application route-level guards.
6. **No Unit/Integration Test Infrastructure Exists**: The repository has `@playwright/test` for E2E tests, but lacks a fast unit/integration runner (such as Vitest) or test database harness.

---

## Repository Inventory

The codebase resides primarily under `d:/Amaan/eOffice/sanket`.

```text
d:/Amaan/eOffice/sanket/
├── app/                  # Next.js 15 App Router (Route handlers, layouts, pages)
│   ├── (auth)/           # Authentication actions, NextAuth handlers, login/register
│   ├── (chat)/           # Template AI chat pages and artifacts
│   ├── admin/            # Legacy redirect routes to /modules/chat
│   ├── api/              # 33 REST API route directories
│   ├── back-office/      # Legacy redirect to /modules/back-office
│   ├── bla-login/        # Dedicated Booth Level Agent login flow
│   ├── calendar/         # Legacy redirect / calendar view
│   ├── home/             # Authenticated role-based redirect landing
│   ├── modules/          # 20 module subdirectories (ADM, Voter, Letters, etc.)
│   ├── operator/         # Legacy redirect to /modules/operator
│   ├── s/                # Public short-link redirect service ([code])
│   └── unauthorized/     # 403 Forbidden landing page
├── components/           # React UI components (Radix primitives, forms, dashboards)
├── hooks/                # Custom React hooks (translations, forms, virtual scrolling)
├── lib/                  # Core business logic, DB queries, utilities
│   ├── aadhaar/          # QR payload parsing
│   ├── adm/              # Fund allocation & budget computations
│   ├── ai/               # AI models & prompt handling
│   ├── db/               # PostgreSQL & Supabase queries, mappers, migrations
│   ├── epic/             # EPIC barcode decoding & validation
│   ├── hierarchy/        # Cadre tree navigation & role assignments
│   ├── letters/          # Template engines, reference sequencing, address blocks
│   ├── push/             # Web Push notifications (VAPID)
│   ├── register/         # Inward/Outward register access logic
│   ├── supabase/         # Server/client Supabase factories, config validation
│   ├── visitor/          # Visitor queueing & token logic
│   ├── whatsapp/         # WhatsApp queue & worker authentication
│   ├── ist-date.ts       # Asia/Kolkata timezone & calendar calculations
│   ├── locale-digits.ts  # Devanagari (०-९) to Western (0-9) conversions
│   ├── module-access.ts  # User/role permission resolution
│   ├── module-constants.ts# Module registry & metadata definitions
│   └── validations.ts    # Zod schemas for forms and mutations
├── public/               # Static assets, fonts, icons, PWA manifest
├── scripts/              # Migration, seeding, and maintenance scripts
├── supabase/             # 82 PostgreSQL migrations and config
├── tests/                # Playwright E2E and route tests (template only)
├── package.json          # Dependency specifications
├── pnpm-lock.yaml        # Locked dependency tree
├── playwright.config.ts  # Playwright test configuration
├── next.config.ts        # Next.js build & PWA configuration
└── tsconfig.json         # TypeScript configuration
```

### High Complexity Files:
- `lib/db/queries-crud.ts`: 249 KB (7,795 lines) – Core monolith containing CRUD for 50 tables.
- `lib/db/cadre-queries.ts`: 83 KB – Graph tree traversal for political cadre hierarchies.
- `lib/db/raw-queries.ts`: 80 KB – Complex voter demographic and booth analytical SQL queries.
- `lib/db/mappers.ts`: 50 KB – Bidirectional PascalCase to camelCase/snake_case ORM mapping.
- `lib/letters/ward-issue-presets.ts`: 49 KB – Government departmental and ward complaint presets.
- `app/globals.css`: 48 KB – Custom CSS variables, typography, and thermal printer print media rules.

---

## Technology Stack

Verified directly against `package.json` and config files:

- **Runtime:** Node.js (tested against LTS)
- **Framework:** Next.js 15.3.6 (App Router with Turbo dev server)
- **Language:** TypeScript 5.6.3 (strict mode enabled)
- **UI Library:** React 19.0.0-rc (React 19 Server Components & Actions)
- **Styling:** Tailwind CSS 3.4.1, Radix UI Primitives, Lucide Icons, Framer Motion
- **Database Access:**
  - `postgres` (v3.4.4): Raw SQL client used for transactions, complex aggregations, and atomic updates.
  - `@supabase/supabase-js` (v2.108.1): Supabase JS client for table CRUD and storage operations.
- **Database Engine:** PostgreSQL 15+ hosted on Supabase (with pg_cron, pg_net, PostGIS).
- **Authentication:** NextAuth.js v5 (`5.0.0-beta.25`) with JWT sessions (8-hour expiration).
- **Password Hashing:** `bcrypt-ts` (v5.0.2).
- **Validation:** `zod` (v3.25.68).
- **State Management & Fetching:** SWR 2.2.5, React 19 `useActionState`, Server Actions.
- **Document / PDF Generation:** `jspdf` (4.2.1), `html2canvas` (1.4.1), server-rendered HTML templates.
- **AI / LLM:** Vercel AI SDK (`ai` v5.0.0-beta.6, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/xai`).
- **Barcode & Hardware Integration:** `@zxing/browser` (v0.1.5), `react-barcode-scanner` (v4.0.1), ESC/POS thermal printing.
- **PWA / Service Worker:** `serwist` (v9.5.11) with offline caching.
- **Testing:** `@playwright/test` (v1.50.1). *No unit test framework currently installed.*
- **Package Manager:** `pnpm@9.12.3`.

---

## Application Architecture

The system follows a layered architecture leveraging Next.js 15 App Router:

```text
[ Browser / PWA Client ]
       │
       ▼
[ Next.js Middleware (sanket/middleware.ts) ]
   ├── PWA & Static Asset Bypass
   ├── Cron / API Key Route Bypass (/api/cron/*, /api/push/vapid-public-key)
   ├── Public Short-Links (/s/*) & Landing (/)
   ├── Unauthenticated Token Check & Redirect to /login
   ├── Session Epoch Check (AUTH_SESSION_EPOCH)
   └── Route Guard for /modules/* (Checks token.modules array)
       │
       ├──────────────────────────────────────────┐
       ▼                                          ▼
[ React Server Components / Pages ]       [ API Route Handlers (app/api/*) ]
       │                                          │
       ▼                                          ▼
[ Client Components / Hooks ]            [ Route Auth & Module Guards ]
       │                                          │
       ▼                                          ▼
[ Server Actions (app/(auth)/actions.ts) ] [ Input Validation (Zod) ]
       │                                          │
       └──────────────────┬───────────────────────┘
                          │
                          ▼
             [ Domain Services / Lib ]
             ├── letters/ (Reference numbering, templates)
             ├── visitor/ (Token numbering, queuing)
             ├── adm/ (Budgets, allocations)
             └── ist-date.ts (IST timezone enforcement)
                          │
                          ▼
             [ Data Access Layer (lib/db/) ]
             ├── postgres.ts (pgSql raw pooler)
             ├── queries-crud.ts (Supabase service-role client)
             └── mappers.ts (Row-to-Domain transformers)
                          │
                          ▼
            [ Supabase / PostgreSQL 15 ]
            ├── 50 Database Tables
            ├── 82 Applied SQL Migrations
            └── Supabase Storage Buckets
```

---

## Domain Module Inventory

The repository contains **23 distinct functional modules**:

### P0 Modules (Critical Data Integrity, Security, Financial, Legal)

#### 1. Authentication & Session Management
- **Purpose:** Secure user login, session lifecycle, BLA (Booth Level Agent) entrypoint, password verification, session epoch resets.
- **Pages:** `/login`, `/register`, `/bla-login`.
- **API Routes / Actions:** `app/(auth)/actions.ts` (`login`, `blaLogin`, `register`, `signOutAction`), `app/api/auth/[...nextauth]/route.ts`.
- **Database Tables:** `User`, `Role`.
- **Risk Level:** P0.

#### 2. User Management & Role Authorization
- **Purpose:** Manage admin and operator accounts, configure role permissions, granular user module overrides, booth part assignments.
- **Pages:** `/modules/user-management`.
- **API Routes:** `/api/admin/users`, `/api/admin/roles`, `/api/admin/module-permissions`, `/api/admin/user-parts`.
- **Database Tables:** `User`, `Role`, `RoleModulePermissions`, `UserModulePermissions`, `UserPartAssignment`.
- **Risk Level:** P0.

#### 3. ADM (Asset Development & Fund Management)
- **Purpose:** Management of government funds (MLA Funds, MP Funds, Special Grants), allocation of budgets to constituency development projects, tracking technical sanctions, and demand letters.
- **Pages:** `/modules/adm`.
- **API Routes:** `/api/adm/funds`, `/api/adm/allocations`, `/api/adm/categories`, `/api/adm/projects`, `/api/adm/demand-letters`, `/api/adm/dashboard`.
- **Database Tables:** `AdmFundingCategory`, `AdmFundRecord`, `AdmFundAllocation`, `AdmDocument`, `AdmDemandLetter`, `MlaProject`.
- **Risk Level:** P0.

#### 4. I/O Register (Inward & Outward Correspondence)
- **Purpose:** Official register of all incoming and outgoing government and citizen correspondence, tracking document numbers, departments, file attachments, and linking to ADM sanctions.
- **Pages:** `/modules/io-register`, `/modules/inward`, `/modules/outward`.
- **API Routes:** `/api/register`, `/api/register/[id]`, `/api/document-types`.
- **Database Tables:** `RegisterEntry`, `RegisterAttachment`, `DocumentTypeMaster`.
- **Risk Level:** P0.

#### 5. Letter Generation
- **Purpose:** Generation of official MLA recommendation and demand letters in English and Marathi, reference sequence allocation, HTML/PDF rendering, address book linking, and paper sizing (A4/A5/B5).
- **Pages:** `/modules/letter-generation`.
- **API Routes:** `/api/letters`, `/api/letters/[id]`, `/api/letter-masters`, `/api/letter-types`, `/api/addresses`, `/api/address-types`, `/api/address-blocks`, `/api/positions`, `/api/letter-address-links`.
- **Database Tables:** `Letter`, `LetterMaster`, `LetterTypeMaster`, `AddressMaster`, `AddressTypeMaster`, `AddressBlock`, `PositionMaster`, `LetterAddressTypeLink`.
- **Risk Level:** P0 (Active DEFECT-001 present).

---

### P1 Modules (Major Constituency Operations)

#### 6. Operator (Beneficiary Management)
- **Purpose:** Intake of citizen service requests, token generation, assignment, status tracking (`pending` -> `in_progress` -> `completed`), and audit history.
- **Pages:** `/modules/operator`.
- **API Routes:** `/api/visitor/services`, `/api/service-catalog`.
- **Database Tables:** `BeneficiaryService`, `BeneficiaryServiceAttachment`, `BeneficiaryServiceHistory`, `ServiceCatalog`.
- **Risk Level:** P1 (Active DEFECT-002 present).

#### 7. Visitor Workflow & Queuing
- **Purpose:** On-site constituency office visitor registration, daily token generation, thermal printing slip, quick voter lookup, and converting visits into beneficiary services.
- **Pages:** `/modules/operator` (Visitor tab).
- **API Routes:** `/api/visitor`, `/api/visitor/[id]`, `/api/visitor/search-voter`, `/api/visitor/today-programmes`, `/api/visitor/update-voter-phone`.
- **Database Tables:** `Visitor`, `VisitorService`, `BeneficiaryService`.
- **Risk Level:** P1.

#### 8. Voter Master & Search
- **Purpose:** Search and retrieval of 200,000+ electoral roll voters by EPIC number, name, barcode, mobile, ward, booth, and family relationships.
- **Pages:** Integrated across Operator, Back-Office, SIR, and Voter modules.
- **API Routes:** `/api/voter/[epicNumber]`, `/api/voters/wards`, `/api/voters/parts-by-wards`, `/api/voters/religions`.
- **Database Tables:** `VoterMaster`, `ElectionMaster`, `BoothMaster`, `ElectionMapping`, `VoterMobileNumber`.
- **Risk Level:** P1.

#### 9. Back-Office (Voter Profile Update)
- **Purpose:** Verification and updating of voter demographic details, family groupings, religion/caste, address, voting history, and primary/secondary phone update logs.
- **Pages:** `/modules/back-office`, `/modules/voter`.
- **API Routes:** `PUT /api/voter/[epicNumber]`, `/api/voter/barcode`.
- **Database Tables:** `VoterMaster`, `VoterMobileNumber`, `PhoneUpdateHistory`, `VoterProfile`.
- **Risk Level:** P1.

#### 10. Daily Programme Scheduling
- **Purpose:** Managing the MLA's daily schedule (Sana Malik / Nawab Malik), public appearances, attendee contact linking, constituency vs outside events, and SMS/push notifications.
- **Pages:** `/modules/daily-programme`, `/modules/calendar`.
- **API Routes:** `/api/daily-programme`, `/api/daily-programme/[id]`, `/api/daily-programme/reorder`, `/api/daily-programme/create-beneficiary-task`.
- **Database Tables:** `DailyProgramme`, `DailyProgrammeAttachment`.
- **Risk Level:** P1.

#### 11. MLA Projects
- **Purpose:** Constituency infrastructure projects (drainage, roads, lights, solar), physical status (`WNS`, `WIP`, `WC`), milestone dates (Bhoomi Pujan, Lokarpan), NOC approvals, and before/after ground photos.
- **Pages:** `/modules/projects`.
- **API Routes:** `/api/projects`, `/api/projects/[id]`, `/api/projects/hierarchy-geo`.
- **Database Tables:** `MlaProject`, `ProjectAttachment`, `ProjectGroundMedia`, `RegisterEntry`.
- **Risk Level:** P1.

#### 12. Voting Participation Tracking
- **Purpose:** Election day voter turnout tracking, marking voted status by booth/serial number, single and bulk vote marking, and turnout pattern analytics.
- **Pages:** `/modules/voting-participation`.
- **API Routes:** `/api/voting-participation/mark`, `/api/voting-participation/bulk-mark`, `/api/voting-participation/stats`, `/api/voting-participation/patterns`, `/api/voting-participation/history`.
- **Database Tables:** `ElectionMapping`, `BoothMaster`, `ElectionMaster`.
- **Risk Level:** P1.

#### 13. Cadre Political Hierarchy
- **Purpose:** NCP organizational hierarchy modeling (Wings/Verticals: Youth, Women, Main; Levels: Taluka, Ward, Booth), leader appointments, term tracking, and org chart canvas visualization.
- **Pages:** `/modules/hierarchy`.
- **API Routes:** `/api/hierarchy/bootstrap`, `/api/hierarchy/canvas`, `/api/hierarchy/tree`, `/api/hierarchy/members`, `/api/hierarchy/leaders`, `/api/hierarchy/lookups`, `/api/hierarchy/taluka-leadership`.
- **Database Tables:** `CadreVerticalCategory`, `CadreVertical`, `CadrePositionLevel`, `CadrePosition`, `CadreGeographicUnit`, `CadreMember`, `CadreMemberVertical`, `CadreMemberPost`.
- **Risk Level:** P1.

#### 14. Cadre WhatsApp Broadcast & Queue
- **Purpose:** Composing and targeting broadcast messages with images to filtered political cadre (by wing, ward, booth), queueing messages, and providing worker polling endpoints.
- **Pages:** `/modules/hierarchy` (Broadcast tab).
- **API Routes:** `/api/hierarchy/whatsapp-broadcasts`, `/api/hierarchy/whatsapp-messages`, `/api/whatsapp/queue`, `/api/whatsapp/queue/[id]`.
- **Database Tables:** `CadreWhatsAppBroadcast`, `CadreWhatsAppMessage`, `CadreMemberWhatsApp`.
- **Risk Level:** P1 (Non-transactional enqueue risk).

---

### P2 & P3 Modules (Supporting & Operational)

- **15. Dashboard (P2):** Executive overview of visitor stats, active projects, daily programmes, pending services, and upcoming cadre birthdays (`/modules/dashboard`, `/api/dashboard/*`).
- **16. Service Catalog (P2):** Master catalog of public assistance schemes, categories, and linked letter types (`/api/service-catalog`).
- **17. SIR - Special Intensive Revision (P2):** Electoral verification tool for booth workers, PDF voter slips, and search activity logging (`/modules/sir`, `/api/sir/*`).
- **18. Data Export (P2):** Async job processor for exporting filtered voter and cadre data to CSV/Excel/PDF (`/modules/data-export`, `/api/export/*`).
- **19. Push & In-App Notifications (P2):** Web Push via VAPID keys, in-app notification center, and birthday reminders triggered by Supabase Cron (`/api/push/*`, `/api/notifications/*`, `/api/cron/*`).
- **20. Field Visitor (P2):** Mobile field agent data collection for assigned booth areas (`/modules/field-visitor`, `/api/field-visitor/*`).
- **21. Short URL Redirector (P2):** Public URL shortener (`/s/[code]`) generating 60-second signed Supabase Storage URLs for secure document distribution.
- **22. AI Chat / Constituency Analytics (P3):** Claude Sonnet powered analytical chatbot for querying constituency voter data (`/modules/chat`, `/api/chat`).
- **23. Profile & Account Settings (P3):** User password updates and session viewing (`/modules/profile`, `/api/user/*`).

---

## Function Catalog (Core Behavioral Logic)

The following functions represent critical business logic that must be protected:

| Function | File | Module | Purpose | Inputs | Outputs | Dependencies | Suggested Test Layer |
|---|---|---|---|---|---|---|---|
| `replaceReferenceInHtml` | `app/api/letters/route.ts` | Letters | Replaces sequence numbers in template HTML | `(html, oldNum, newNum, locale)` | `string` | `locale-digits` | **UNIT** (Exposes DEFECT-001) |
| `formatReference` | `lib/letters/reference-sequence.ts` | Letters | Formats prefix and number into `prefix/number` | `(prefix, number)` | `string` | `toWesternDigits` | **UNIT** |
| `parseReference` | `lib/letters/reference-sequence.ts` | Letters | Splits reference string into prefix and number | `(full)` | `{prefix, number}` | `toWesternDigits` | **UNIT** |
| `allocateDocumentTypeSequence` | `lib/db/queries-crud.ts` | Letters / Register | Atomically allocates next sequential letter number | `(code)` | `Promise<number>` | `pgSql` | **INTEGRATION** |
| `normalizeIndianMobileDigits` | `lib/indian-mobile.ts` | Common | Strips prefixes (+91, 0) and validates 10 digits | `(input)` | `string` | Regex | **UNIT** |
| `isValidIndianMobile` | `lib/indian-mobile.ts` | Common | Checks if normalized mobile matches `^[6-9]\d{9}$` | `(input)` | `boolean` | `normalizeIndianMobileDigits` | **UNIT** |
| `getCalendarYmd` | `lib/ist-date.ts` | Common | Resolves year/month/day strictly in Asia/Kolkata | `(date?, timeZone?)` | `{year, month, day}` | `Intl.DateTimeFormat` | **UNIT** |
| `startOfDayIST` | `lib/ist-date.ts` | Common | Returns UTC instant of 00:00:00 IST for date | `(date?)` | `Date` | `getCalendarYmd` | **UNIT** |
| `differenceInCalendarDaysYmd` | `lib/ist-date.ts` | Common | Calculates calendar day difference (a - b) | `(a, b)` | `number` | `Date.UTC` | **UNIT** |
| `extractEpicFromPayload` | `lib/epic/extract-epic-from-payload.ts`| Voter | Extracts 10-char EPIC from barcode / QR payload | `(payload)` | `string \| null` | Regex heuristics | **UNIT** |
| `generateServiceToken` | `lib/db/queries-crud.ts` | Operator | Generates daily formatted token for services | `(programmeId?)` | `Promise<string>` | `pgSql` | **INTEGRATION** (Exposes DEFECT-002) |
| `createVisitor` | `lib/db/visitor-queries.ts` | Visitor | Creates visitor record with retry loop on token | `(visitorData)` | `Promise<Visitor>` | `supabase` | **INTEGRATION** |
| `enqueueCadreWhatsAppBroadcast`| `lib/db/cadre-whatsapp-queries.ts`| Hierarchy | Enqueues batch of WhatsApp messages | `(broadcastInput)` | `Promise<Broadcast>`| `supabase` | **INTEGRATION** (Exposes RISK-001) |
| `requireWhatsAppWorkerAuth` | `lib/whatsapp/worker-auth.ts` | Hierarchy | Validates Bearer / x-api-key for worker route | `(request)` | `{ok: true} \| {error, status}`| `process.env` | **UNIT** |
| `validateForm` | `lib/validations.ts` | Common | Generic form validation returning mapped errors | `(schema, data)` | `{success, data/errors}` | `zod` | **UNIT** |
| `bulkMarkVoterVotes` | `lib/db/queries-crud.ts` | Voting | Bulk upserts voted status in ElectionMapping | `(votes[])` | `Promise<ElectionMapping[]>`| `supabase` | **INTEGRATION** |
| `getUserAccessibleModules` | `lib/module-access.ts` | Auth | Computes merged role and user module permissions | `(userId)` | `Promise<ModuleDefinition[]>`| `supabase` | **INTEGRATION** |

---

## Critical User Journeys

### Journey 1: Citizen Walk-in & Service Token Lifecycle
```text
Citizen enters office
  ↓
Operator opens /modules/operator
  ↓
Scans voter EPIC barcode or inputs mobile number
  ↓
API: GET /api/voter/[epicNumber] (Profile & family loaded)
  ↓
Operator clicks "Register Visitor" with service requirement
  ↓
API: POST /api/visitor (Token generated e.g. 170926-V-0004)
  ↓
Client fires ESC/POS Thermal Print dialog for paper token slip
  ↓
Operator converts Visitor Visit to formal Beneficiary Service
  ↓
API: POST /api/visitor/services (Status: 'pending')
  ↓
Officer completes service → Status updated to 'completed'
  ↓
History entry appended in BeneficiaryServiceHistory
```

### Journey 2: Official Letter Generation & PDF Dispatch
```text
Operator selects Citizen Service Ticket #170926-V-0004
  ↓
Clicks "Generate Letter" → Navigates to /modules/letter-generation
  ↓
Picks Letter Type (e.g. BMC Water Complaint) & Locale (Marathi)
  ↓
Address Picker loads Ward 172 Executive Engineer from AddressMaster
  ↓
System fetches next sequence number via POST /api/letters
  ↓
API: allocateDocumentTypeSequence increments DocumentTypeMaster atomically
  ↓
Reference number formatted: "General/105" (Devanagari: "सामान्य/१०५")
  ↓
HTML template compiled with subject, address block, and grievance text
  ↓
DEFECT-001 RISK: replaceReferenceInHtml modifies rendered HTML string
  ↓
Letter recorded in Letter table; linked to BeneficiaryService
  ↓
Client renders preview and triggers jsPDF / html2canvas PDF download
```

### Journey 3: ADM Fund Allocation to Constituency Project
```text
Admin navigates to /modules/adm
  ↓
Creates Fund Batch: Financial Year 2026-27, Budget ₹5,00,00,000 (MLA Fund)
  ↓
API: POST /api/adm/funds (AdmFundRecord created)
  ↓
Admin selects Constituency Project: "Dr. Ambedkar Hall Solar Roof"
  ↓
Allocates ₹25,00,000 against Fund Batch
  ↓
Inputs Technical Sanction Ref #TS/2026/88 and Sanction Date
  ↓
API: POST /api/adm/allocations (AdmFundAllocation created)
  ↓
Links Inward Approval Letter from RegisterEntry (RegisterRef: "Inward/442")
  ↓
API: POST /api/adm/projects (Links project, updates budget aggregates)
  ↓
Dashboard reflects updated remaining fund allocation
```

---

## Database Architecture

- **Engine:** PostgreSQL 15 on Supabase
- **Tables:** 50 active tables defined in `sanket/lib/db/schema.ts`.
- **Primary Keys:** UUID (`gen_random_uuid()`) on almost all transaction tables; natural keys on `VoterMaster` (`epicNumber`), `ElectionMapping` (`epicNumber, electionId`), and `CadreMemberVertical` (`memberId, verticalId`).
- **Connection Architecture:**
  - Connection Pooler (Port 6543 / PgBouncer): Used for high-volume read queries.
  - Direct Connection (Port 5432): Required for DDL migrations and raw postgres client (`sanket/lib/db/postgres.ts`).
- **Row-Level Security (RLS):** RLS is enabled in migrations for several tables, but **bypassed in application code** because the server uses `SUPABASE_SERVICE_ROLE_KEY`.

---

## Authentication & Authorization Architecture

### Authentication
- Implemented via NextAuth.js v5 (`sanket/app/(auth)/auth.ts`).
- **Provider:** Credentials Provider (`userId` + `password`).
- **Verification:** `bcrypt-ts` compares incoming password with hash in `User.password`.
- **Session:** JWT strategy with 8-hour TTL (`maxAge: 28800`).
- **BLA Login:** Dedicated action `blaLogin` in `app/(auth)/actions.ts` requiring `requireRole: 'bla'`.

### Authorization
- Authorization is dual-tiered:
  1. **Role Module Permissions (`RoleModulePermissions`)**: Default permissions assigned to user's `roleId`.
  2. **User Module Permissions (`UserModulePermissions`)**: User-specific overrides (`has_access: true/false`).
- Merged in `getUserAccessibleModules(userId)` in `sanket/lib/module-access.ts`.
- **Middleware Guard (`sanket/middleware.ts`)**: Checks `token.modules.includes(moduleKey)` for `/modules/:key`.
- **API Guard**: **Inconsistent across route handlers.**
  - `POST /api/voting-participation/mark`: Explicitly checks `modules.includes('voting-participation')`.
  - `PUT /api/voter/[epicNumber]`: Explicitly checks `modules.includes('operator') || modules.includes('back-office')`.
  - `GET /api/voter/[epicNumber]`: **Only checks `session.user` (RISK-003)**. Any authenticated user can read voter records.

---

## Current Testing State

```text
Unit test files: 0
Integration test files: 0
API test files: 2 (tests/routes/chat.test.ts, tests/routes/document.test.ts)
Component test files: 0
E2E test files: 4 (tests/e2e/artifacts.test.ts, chat.test.ts, reasoning.test.ts, session.test.ts)

Domain tests: 0
Infrastructure / template tests: 6

Estimated meaningful domain coverage: 0.0%
```

The 6 existing test files are artifacts of the Vercel AI Chatbot template. They do not execute or validate any code related to voters, visitors, services, letters, projects, funds, or cadre operations.

---

## TDD Gap Matrix

| Module | Unit | Integration | API | Component | E2E | Priority |
|---|---|---|---|---|---|---|
| Auth & Sessions | MISSING | MISSING | MISSING | MISSING | PARTIAL (Template) | P0 |
| User Management | MISSING | MISSING | MISSING | MISSING | MISSING | P0 |
| ADM (Asset Dev) | MISSING | MISSING | MISSING | MISSING | MISSING | P0 |
| I/O Register | MISSING | MISSING | MISSING | MISSING | MISSING | P0 |
| Letter Generation | MISSING | MISSING | MISSING | MISSING | MISSING | P0 |
| Operator (Services) | MISSING | MISSING | MISSING | MISSING | MISSING | P1 |
| Visitor Workflow | MISSING | MISSING | MISSING | MISSING | MISSING | P1 |
| Voter Master | MISSING | MISSING | MISSING | MISSING | MISSING | P1 |
| Back-Office | MISSING | MISSING | MISSING | MISSING | MISSING | P1 |
| Daily Programme | MISSING | MISSING | MISSING | MISSING | MISSING | P1 |
| Projects | MISSING | MISSING | MISSING | MISSING | MISSING | P1 |
| Voting Participation| MISSING | MISSING | MISSING | MISSING | MISSING | P1 |
| Cadre Hierarchy | MISSING | MISSING | MISSING | MISSING | MISSING | P1 |
| WhatsApp Broadcast | MISSING | MISSING | MISSING | MISSING | MISSING | P1 |
| Dashboard | MISSING | MISSING | MISSING | MISSING | MISSING | P2 |
| Service Catalog | MISSING | MISSING | MISSING | MISSING | MISSING | P2 |
| SIR | MISSING | MISSING | MISSING | MISSING | MISSING | P2 |
| Data Export | MISSING | MISSING | MISSING | MISSING | MISSING | P2 |
| Push Notifications | MISSING | MISSING | MISSING | MISSING | MISSING | P2 |
| Field Visitor | MISSING | MISSING | MISSING | MISSING | MISSING | P2 |
| Short URL | MISSING | MISSING | MISSING | MISSING | MISSING | P2 |
| AI Chat | MISSING | MISSING | COVERED | MISSING | COVERED | P3 |
| Profile & Settings | MISSING | MISSING | MISSING | MISSING | MISSING | P3 |

---

## Recommended Test Pyramid

Rather than an arbitrary ratio, testing layers must match architectural risk:

1. **Unit Tests (60% of test volume)**:
   - Pure logic: `lib/letters/reference-sequence.ts`, `lib/ist-date.ts`, `lib/locale-digits.ts`, `lib/indian-mobile.ts`, `lib/epic/*`, `lib/validations.ts`.
   - Fast, in-memory execution (< 5ms per test), zero DB dependencies.
2. **Integration Tests (25% of test volume)**:
   - Real PostgreSQL operations: Token generation, sequence allocation, transactions, constraints, mappers.
   - Run against a dedicated local or ephemeral Supabase test container.
3. **API Route Tests (10% of test volume)**:
   - HTTP contracts, status codes (200, 201, 400, 401, 403, 404, 409), input validation, session header checks.
4. **Component & E2E Tests (5% of test volume)**:
   - Critical path browser workflows: Login -> Visitor registration -> Token print -> Service creation -> Letter generation -> Export.

---

## Testability Problems

| TESTABILITY-ID | File | Problem | Why Testing is Difficult | Future Recommendation |
|---|---|---|---|---|
| TESTABILITY-001 | `lib/db/queries-crud.ts` | 249 KB monolithic file | Difficult to isolate domain models; tightly couples Supabase client and pgSql | Decompose into domain repositories (`lib/db/repositories/*`) in future refactoring |
| TESTABILITY-002 | `lib/supabase/server.ts` | Direct process.env reading in proxy | Hard to mock environment without resetting Node modules | Abstract environment config into dependency-injectable factories |
| TESTABILITY-003 | `components/visitor-workflow.tsx` | Browser print APIs (`window.print()`, ESC/POS) | Headless browser cannot physically print thermal slips | Extract ESC/POS byte builder into a pure, unit-testable module |
| TESTABILITY-004 | `app/api/letters/route.ts` | Inline HTML string manipulation | Fragile string parsing without AST or DOM parser | Use a structured template renderer or DOM parser |
| TESTABILITY-005 | `lib/push/send.ts` | External web-push service | Requires real VAPID endpoints on Google/Mozilla push services | Mock Web Push transport layer in test environments |

---

## Risk Register

Full details in `docs/testing/DEFECTS.md`.
- **DEFECT-001 (CRITICAL)**: Destructive substring replace in `replaceReferenceInHtml`.
- **DEFECT-002 (HIGH)**: Race condition and duplicate tokens in `generateServiceToken`.
- **DEFECT-003 (MEDIUM)**: Server timezone drift (UTC vs IST) in token generation.
- **RISK-001 (HIGH)**: Non-transactional batch insert in WhatsApp broadcast enqueuing.
- **RISK-002 (HIGH)**: Service role bypass of PostgreSQL RLS policies across all queries.
- **RISK-003 (MEDIUM)**: Over-permissive `GET /api/voter/[epicNumber]` lacking module checks.
- **RISK-004 (MEDIUM)**: Sequence numbers leaked on failed letter creations.

---

## TDD Implementation Roadmap

```text
PHASE 1 — DISCOVERY & AUDIT (Current — Complete)
   ↓
PHASE 2 — TEST INFRASTRUCTURE SETUP
   • Install & configure Vitest for fast TypeScript unit/integration testing
   • Configure isolated test environment & test database migrations
   • Establish test helpers, fixtures, and auth session mocks
   ↓
PHASE 3 — FOUNDATIONAL UNIT TESTING (P0 Pure Utilities)
   • reference-sequence.ts, locale-digits.ts, ist-date.ts, indian-mobile.ts, epic decoding
   • Reproduce & isolate DEFECT-001 (Letter HTML string corruption) in red test
   ↓
PHASE 4 — AUTHENTICATION & AUTHORIZATION TESTS
   • Credential verification, BLA login, token generation
   • RoleModulePermissions & UserModulePermissions resolution
   • API route 401/403 security boundary tests
   ↓
PHASE 5 — P0 DATABASE INTEGRATION TESTS
   • DocumentType sequence allocation & concurrency
   • Service token race conditions (DEFECT-002)
   • Transaction atomicity for WhatsApp broadcast queues (RISK-001)
   ↓
PHASE 6 — P0 & P1 MODULE API CONTRACT TESTS
   • /api/letters, /api/register, /api/adm/*, /api/visitor/*, /api/voter/*
   ↓
PHASE 7 — CRITICAL WORKFLOW E2E TESTS (Playwright)
   • Citizen intake -> Token -> Service -> Letter Generation
   • ADM Fund allocation -> Inward document linking
   ↓
PHASE 8 — REGRESSION GATES & CI PIPELINE
   • GitHub Actions / pre-commit test gates and coverage enforcement
```

---

## Estimated Test Backlog

| Module | Unit | Integration | API | Component | E2E | Total |
|---|---|---|---|---|---|---|
| Auth & Authorization | 10 | 8 | 8 | 2 | 2 | 30 |
| Letters & Templates | 18 | 6 | 8 | 3 | 2 | 37 |
| Operator & Services | 8 | 10 | 6 | 3 | 2 | 29 |
| Visitor Workflow | 8 | 8 | 6 | 4 | 2 | 28 |
| Voter Master & Search | 12 | 8 | 6 | 2 | 1 | 29 |
| ADM (Funds & Assets) | 6 | 12 | 10 | 3 | 2 | 33 |
| I/O Register | 6 | 8 | 8 | 2 | 1 | 25 |
| Projects | 6 | 8 | 6 | 2 | 1 | 23 |
| Daily Programme | 8 | 6 | 6 | 2 | 1 | 23 |
| Cadre Hierarchy | 8 | 10 | 8 | 2 | 1 | 29 |
| WhatsApp Broadcast | 6 | 8 | 6 | 2 | 1 | 23 |
| Voting Participation | 4 | 6 | 6 | 2 | 1 | 19 |
| Supporting Modules (P2/P3)| 15 | 10 | 12 | 4 | 2 | 43 |
| **TOTAL ESTIMATE** | **115** | **108** | **96** | **33** | **19** | **371** |

---

## Recommended First TDD Sprint (Sprint 1 Target)

The safest and highest-value starting point is **Pure Foundational Utilities & Defect Reproduction**:

### Group 1: Indian Mobile & EPIC Barcode Utilities (8 Tests)
- `normalizeIndianMobileDigits`: Clean 10 digits, strip `+91`, strip leading `0`, reject invalid lengths.
- `isValidIndianMobile`: Validate starting digits (6, 7, 8, 9), reject non-Indian phone formats.
- `extractEpicFromPayload`: Parse 3-letter + 7-digit strict EPICs, handle delimiters, loose alphanumeric matching.
*Why first:* Zero external dependencies, pure functions, critical for visitor intake and voter search.

### Group 2: IST Calendar & Timezone Logic (8 Tests)
- `getCalendarYmd`: Verify exact year/month/day strictly in Asia/Kolkata across UTC boundary transitions.
- `startOfDayIST`: Verify UTC instant corresponds to 00:00:00 IST (+05:30).
- `differenceInCalendarDaysYmd`: Leap years, month boundaries, and end-of-month calculations.
*Why first:* Protects daily programme scheduling and token sequence date prefixes.

### Group 3: Reference Sequencing & DEFECT-001 Reproduction (8 Tests)
- `formatReference` & `parseReference`: Bounded prefixes, Western and Devanagari digit extraction.
- `replaceReferenceInHtml` (Defect Test): Write the failing unit test exposing DEFECT-001 (corruption of CSS styles and numbers matching single-digit reference numbers).
*Why first:* Directly isolates the highest-severity confirmed defect in government letter generation before Phase 2 refactoring.
