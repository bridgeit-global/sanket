const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

// Import schema manually since we're in a script
const { services } = {
  services: {
    name: 'services',
    schema: {
      id: { name: 'id', type: 'uuid', primaryKey: true, notNull: true, default: 'gen_random_uuid()' },
      name: { name: 'name', type: 'text', notNull: true },
      description: { name: 'description', type: 'text' },
      type: { name: 'type', type: 'varchar', notNull: true },
      category: { name: 'category', type: 'text', notNull: true },
      isActive: { name: 'isActive', type: 'boolean', notNull: true, default: true },
      createdAt: { name: 'createdAt', type: 'timestamp', notNull: true, default: 'now()' },
      updatedAt: { name: 'updatedAt', type: 'timestamp', notNull: true, default: 'now()' }
    }
  }
};

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/sanket';
const client = postgres(connectionString);
const db = drizzle(client);

async function seedBeneficiaryServices() {
  try {
    console.log('🌱 Seeding beneficiary services...');

    // Individual Services (one-to-one)
    const individualServices = [
      {
        name: 'Voter Registration Assistance',
        description: 'Help voters with registration process and documentation',
        type: 'one-to-one',
        category: 'voter_registration',
        isActive: true
      },
      {
        name: 'Aadhar Card Applications',
        description: 'Assist with Aadhar card applications and updates',
        type: 'one-to-one',
        category: 'aadhar_card',
        isActive: true
      },
      {
        name: 'Ration Card Applications',
        description: 'Help with ration card applications and renewals',
        type: 'one-to-one',
        category: 'ration_card',
        isActive: true
      },
      {
        name: 'Government Scheme Applications',
        description: 'Assist with various government scheme applications',
        type: 'one-to-one',
        category: 'schemes',
        isActive: true
      },
      {
        name: 'Pension Applications',
        description: 'Help with pension applications and disbursements',
        type: 'one-to-one',
        category: 'pension',
        isActive: true
      },
      {
        name: 'Disability Certificate',
        description: 'Assist with disability certificate applications',
        type: 'one-to-one',
        category: 'disability',
        isActive: true
      },
      {
        name: 'Income Certificate',
        description: 'Help with income certificate applications',
        type: 'one-to-one',
        category: 'income_certificate',
        isActive: true
      },
      {
        name: 'Caste Certificate',
        description: 'Assist with caste certificate applications',
        type: 'one-to-one',
        category: 'caste_certificate',
        isActive: true
      }
    ];

    // Community Services (one-to-many)
    const communityServices = [
      {
        name: 'Road Construction Projects',
        description: 'Public work for road construction affecting multiple voters',
        type: 'one-to-many',
        category: 'public_works',
        isActive: true
      },
      {
        name: 'Fund Utilization Projects',
        description: 'Track fund utilization for development projects',
        type: 'one-to-many',
        category: 'fund_utilization',
        isActive: true
      },
      {
        name: 'Issue Visibility Campaigns',
        description: 'Campaigns to highlight local issues and concerns',
        type: 'one-to-many',
        category: 'issue_visibility',
        isActive: true
      },
      {
        name: 'Water Supply Projects',
        description: 'Community water supply and infrastructure projects',
        type: 'one-to-many',
        category: 'water_supply',
        isActive: true
      },
      {
        name: 'Sanitation Projects',
        description: 'Community sanitation and waste management projects',
        type: 'one-to-many',
        category: 'sanitation',
        isActive: true
      },
      {
        name: 'Street Lighting',
        description: 'Community street lighting and electrical projects',
        type: 'one-to-many',
        category: 'street_lighting',
        isActive: true
      },
      {
        name: 'Public Health Campaigns',
        description: 'Community health awareness and vaccination drives',
        type: 'one-to-many',
        category: 'public_health',
        isActive: true
      },
      {
        name: 'Educational Programs',
        description: 'Community educational and skill development programs',
        type: 'one-to-many',
        category: 'education',
        isActive: true
      }
    ];

    // Insert individual services
    console.log('📝 Inserting individual services...');
    for (const service of individualServices) {
      await db.insert(services).values(service);
      console.log(`✅ Added: ${service.name}`);
    }

    // Insert community services
    console.log('📝 Inserting community services...');
    for (const service of communityServices) {
      await db.insert(services).values(service);
      console.log(`✅ Added: ${service.name}`);
    }

    console.log('🎉 Successfully seeded all beneficiary services!');
    console.log(`📊 Total services added: ${individualServices.length + communityServices.length}`);
    console.log(`👤 Individual services: ${individualServices.length}`);
    console.log(`🏘️ Community services: ${communityServices.length}`);

  } catch (error) {
    console.error('❌ Error seeding beneficiary services:', error);
  } finally {
    await client.end();
  }
}

// Run the seeding function
seedBeneficiaryServices(); 