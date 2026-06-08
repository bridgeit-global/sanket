import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.SUPABASE_DB_URL!, { max: 1 });

export const db = drizzle(client);
