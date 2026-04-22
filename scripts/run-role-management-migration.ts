import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

config({
    path: '.env.local',
});

const runMigration = async () => {
    if (!process.env.SUPABASE_DB_URL) {
        throw new Error('SUPABASE_DB_URL is not defined');
    }

    const connection = postgres(process.env.SUPABASE_DB_URL, { max: 1 });

    try {
        console.log('⏳ Running role management migration...');

        // Read and run migration 0039
        const migration39 = readFileSync(
            join(process.cwd(), 'lib/db/migrations/0039_add_role_management.sql'),
            'utf-8',
        );
        console.log('📄 Running migration 0039_add_role_management.sql...');
        await connection.unsafe(migration39);
        console.log('✅ Migration 0039 completed');

        console.log('✅ Role management migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:');
        console.error(error);
        throw error;
    } finally {
        await connection.end();
    }
};

runMigration()
    .then(() => {
        console.log('✅ Done');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Failed');
        console.error(err);
        process.exit(1);
    });

