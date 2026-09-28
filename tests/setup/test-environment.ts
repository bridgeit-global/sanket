import path from 'node:path';
import { config } from 'dotenv';

// Only `.env.test` is loaded by Vitest. `.env.local`, `.env.production`, and
// remote deployment variables are intentionally never read by test setup.
config({ path: path.resolve(process.cwd(), '.env.test'), override: false });

// Application code must make IST rules explicit; UTC mirrors common Vercel
// server behavior and keeps unqualified Date operations deterministic in tests.
process.env.TZ = 'UTC';
