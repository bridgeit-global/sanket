import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
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
        console.log('⏳ Running user_id migration...');

        // Read and run migration 0040
        const migration40 = readFileSync(
            join(process.cwd(), 'lib/db/migrations/0040_replace_email_with_user_id.sql'),
            'utf-8',
        );
        console.log('📄 Running migration 0040_replace_email_with_user_id.sql...');
        await connection.unsafe(migration40);
        console.log('✅ Migration 0040 completed');

        console.log('✅ User ID migration completed successfully!');
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

