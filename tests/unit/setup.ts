/**
 * Vitest global setup for eOffice / Sanket unit tests.
 *
 * This file is loaded before every test file (configured in vitest.config.ts).
 * Keep it minimal — only add things that EVERY test needs.
 */

import '../setup/test-environment';

// Force UTC timezone for deterministic date testing.
// IST boundary tests construct Date objects with explicit offsets,
// so TZ=UTC ensures `new Date(...)` never depends on the OS timezone.
process.env.TZ = 'UTC';
