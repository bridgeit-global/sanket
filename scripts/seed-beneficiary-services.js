const postgres = require('postgres');

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error('SUPABASE_DB_URL is not defined');
}
const sql = postgres(connectionString);

async function seedBeneficiaryServices() {
  try {
    console.log('🌱 Seeding beneficiary services...');

    const individualServices = [
      {
        name: 'Voter Registration Assistance',
        description: 'Help voters with registration process and documentation',
        type: 'one-to-one',
        category: 'voter_registration',
        isActive: true,
      },
      {
        name: 'Address Correction',
        description: 'Assist with voter address updates and corrections',
        type: 'one-to-one',
        category: 'voter_registration',
        isActive: true,
      },
      {
        name: 'EPIC Card Replacement',
        description: 'Help with lost or damaged EPIC card replacement',
        type: 'one-to-one',
        category: 'voter_registration',
        isActive: true,
      },
    ];

    for (const service of individualServices) {
      await sql`
        INSERT INTO "ServiceCatalog" (name, sort_order, is_active)
        VALUES (${service.name}, 0, true)
        ON CONFLICT (name) DO NOTHING
      `;
    }

    console.log('✅ Beneficiary services seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding beneficiary services:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedBeneficiaryServices();
