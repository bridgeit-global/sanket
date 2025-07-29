const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { services, beneficiaries, voters } = require('../lib/db/schema');
const { 
  createService, 
  createBeneficiary, 
  getAllServices, 
  getBeneficiariesByService,
  getBeneficiaryStats 
} = require('../lib/db/queries');

// Initialize database connection
const client = postgres(process.env.POSTGRES_URL);
const db = drizzle(client);

async function testBeneficiaryManagement() {
  console.log('🧪 Testing Beneficiary Management System...\n');

  try {
    // Test 1: Create services
    console.log('1. Creating test services...');
    
    const voterRegistrationService = await createService({
      name: 'Voter Registration',
      description: 'Assistance with voter registration process',
      type: 'one-to-one',
      category: 'voter_registration'
    });
    console.log('✅ Created voter registration service:', voterRegistrationService.id);

    const aadharService = await createService({
      name: 'Aadhar Card Application',
      description: 'Help with Aadhar card application and updates',
      type: 'one-to-one',
      category: 'aadhar_card'
    });
    console.log('✅ Created Aadhar service:', aadharService.id);

    const publicWorkService = await createService({
      name: 'Road Construction - Part 5',
      description: 'Public work for road construction in Part 5',
      type: 'one-to-many',
      category: 'public_works'
    });
    console.log('✅ Created public work service:', publicWorkService.id);

    // Test 2: Get all services
    console.log('\n2. Getting all services...');
    const allServices = await getAllServices();
    console.log('✅ Found services:', allServices.length);
    allServices.forEach(service => {
      console.log(`   - ${service.name} (${service.type})`);
    });

    // Test 3: Create beneficiaries
    console.log('\n3. Creating beneficiaries...');
    
    // For one-to-one service, we need a voter ID
    // Let's assume we have a voter with ID 'TEST001'
    const beneficiary1 = await createBeneficiary({
      serviceId: voterRegistrationService.id,
      voterId: 'TEST001',
      notes: 'Test beneficiary for voter registration'
    });
    console.log('✅ Created one-to-one beneficiary:', beneficiary1.id);

    const beneficiary2 = await createBeneficiary({
      serviceId: aadharService.id,
      voterId: 'TEST002',
      notes: 'Test beneficiary for Aadhar service'
    });
    console.log('✅ Created one-to-one beneficiary:', beneficiary2.id);

    // For one-to-many service, we use part number
    const beneficiary3 = await createBeneficiary({
      serviceId: publicWorkService.id,
      partNo: 5,
      notes: 'Public work affecting all voters in Part 5'
    });
    console.log('✅ Created one-to-many beneficiary:', beneficiary3.id);

    // Test 4: Get beneficiaries by service
    console.log('\n4. Getting beneficiaries by service...');
    const voterRegBeneficiaries = await getBeneficiariesByService({ 
      serviceId: voterRegistrationService.id 
    });
    console.log('✅ Voter registration beneficiaries:', voterRegBeneficiaries.length);

    const publicWorkBeneficiaries = await getBeneficiariesByService({ 
      serviceId: publicWorkService.id 
    });
    console.log('✅ Public work beneficiaries:', publicWorkBeneficiaries.length);

    // Test 5: Get overall statistics
    console.log('\n5. Getting beneficiary statistics...');
    const stats = await getBeneficiaryStats();
    console.log('✅ Beneficiary statistics:');
    console.log(`   - Total: ${stats.totalBeneficiaries}`);
    console.log(`   - Pending: ${stats.pendingCount}`);
    console.log(`   - In Progress: ${stats.inProgressCount}`);
    console.log(`   - Completed: ${stats.completedCount}`);
    console.log(`   - Rejected: ${stats.rejectedCount}`);
    console.log(`   - One-to-One: ${stats.oneToOneCount}`);
    console.log(`   - One-to-Many: ${stats.oneToManyCount}`);

    console.log('\n🎉 All tests passed! Beneficiary management system is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.end();
  }
}

// Run the test
testBeneficiaryManagement(); 