import { config } from 'dotenv';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

config({
    path: '.env.local',
});

const runMigrations = async () => {
    if (!process.env.POSTGRES_URL) {
        throw new Error('POSTGRES_URL is not defined');
    }

    const connection = postgres(process.env.POSTGRES_URL, { max: 1 });

    try {
        console.log('⏳ Running MLA e-Office migrations...');

        // Read and run migration 0036
        const migration36 = readFileSync(
            join(process.cwd(), 'lib/db/migrations/0036_add_mla_eoffice_tables.sql'),
            'utf-8',
        );
        console.log('📄 Running migration 0036_add_mla_eoffice_tables.sql...');
        await connection.unsafe(migration36);
        console.log('✅ Migration 0036 completed');

        // Read and run migration 0037
        const migration37 = readFileSync(
            join(process.cwd(), 'lib/db/migrations/0037_fix_user_module_permissions_column.sql'),
            'utf-8',
        );
        console.log('📄 Running migration 0037_fix_user_module_permissions_column.sql...');
        await connection.unsafe(migration37);
        console.log('✅ Migration 0037 completed');

        console.log('✅ All MLA e-Office migrations completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:');
        console.error(error);
        throw error;
    } finally {
        await connection.end();
    }
};

runMigrations()
    .then(() => {
        console.log('✅ Done');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Failed');
        console.error(err);
        process.exit(1);
    });
