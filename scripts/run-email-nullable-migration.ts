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
        console.log('⏳ Making email column nullable...');

        // Read and run migration 0041
        const migration41 = readFileSync(
            join(process.cwd(), 'lib/db/migrations/0041_make_email_nullable.sql'),
            'utf-8',
        );
        console.log('📄 Running migration 0041_make_email_nullable.sql...');
        await connection.unsafe(migration41);
        console.log('✅ Migration 0041 completed');

        console.log('✅ Email nullable migration completed successfully!');
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

