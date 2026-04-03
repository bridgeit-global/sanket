import { config } from 'dotenv';
import postgres from 'postgres';

config({
    path: '.env.local',
});

const checkColumn = async () => {
    if (!process.env.SUPABASE_DB_URL) {
        throw new Error('SUPABASE_DB_URL is not defined');
    }

    const connection = postgres(process.env.SUPABASE_DB_URL, { max: 1 });

    try {
        console.log('🔍 Checking user_id column...');

        const result = await connection`
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'User' 
            AND column_name = 'user_id'
        `;

        if (result.length === 0) {
            console.log('❌ user_id column does NOT exist!');
        } else {
            console.log('✅ user_id column exists:');
            console.log(JSON.stringify(result[0], null, 2));
        }

        // Also check all columns in User table
        const allColumns = await connection`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'User'
            ORDER BY ordinal_position
        `;

        console.log('\n📋 All columns in User table:');
        allColumns.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        });

    } catch (error) {
        console.error('❌ Error checking column:');
        console.error(error);
        throw error;
    } finally {
        await connection.end();
    }
};

checkColumn()
    .then(() => {
        console.log('\n✅ Done');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Failed');
        console.error(err);
        process.exit(1);
    });

