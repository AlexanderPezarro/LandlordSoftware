import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL || 'file:./data/landlord.db';
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

const prisma = new PrismaClient({
  adapter,
});

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');

  // Delete in order of dependencies
  await prisma.event.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.lease.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('✅ Database cleared');
}

async function seedUsers() {
  console.log('👤 Seeding users...');

  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@landlord.com',
        password: '$2b$10$YourHashedPasswordHere', // In production, this would be properly hashed
      },
    }),
    prisma.user.create({
      data: {
        email: 'manager@landlord.com',
        password: '$2b$10$YourHashedPasswordHere',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function seedProperties() {
  console.log('🏠 Seeding properties...');

  const properties = await Promise.all([
    prisma.property.create({
      data: {
        name: 'Sunset Apartments - Unit 1A',
        street: '123 Main Street',
        city: 'Manchester',
        county: 'Greater Manchester',
        postcode: 'M1 1AA',
        propertyType: 'Apartment',
        purchaseDate: new Date('2020-03-15'),
        purchasePrice: 185000,
        status: 'Occupied',
        notes: 'Modern apartment with city views, recently renovated kitchen',
      },
    }),
    prisma.property.create({
      data: {
        name: 'Oak Street House',
        street: '45 Oak Street',
        city: 'Birmingham',
        county: 'West Midlands',
        postcode: 'B2 5HG',
        propertyType: 'House',
        purchaseDate: new Date('2019-06-20'),
        purchasePrice: 245000,
        status: 'Occupied',
        notes: '3-bedroom semi-detached house with garden and garage',
      },
    }),
    prisma.property.create({
      data: {
        name: 'River View Flat',
        street: '78 River Walk',
        city: 'Leeds',
        county: 'West Yorkshire',
        postcode: 'LS1 4BR',
        propertyType: 'Apartment',
        purchaseDate: new Date('2021-01-10'),
        purchasePrice: 165000,
        status: 'Occupied',
        notes: 'Two-bedroom flat with balcony overlooking the river',
      },
    }),
    prisma.property.create({
      data: {
        name: 'Garden Cottage',
        street: '12 Meadow Lane',
        city: 'Liverpool',
        county: 'Merseyside',
        postcode: 'L3 9PQ',
        propertyType: 'House',
        purchaseDate: new Date('2018-11-05'),
        purchasePrice: 195000,
        status: 'Vacant',
        notes: 'Charming cottage with large garden, needs minor repairs before re-letting',
      },
    }),
    prisma.property.create({
      data: {
        name: 'City Centre Studio',
        street: '567 High Street',
        city: 'Bristol',
        county: 'Bristol',
        postcode: 'BS1 2LN',
        propertyType: 'Studio',
        purchaseDate: new Date('2022-02-28'),
        purchasePrice: 125000,
        status: 'Occupied',
        notes: 'Compact studio ideal for young professionals',
      },
    }),
    prisma.property.create({
      data: {
        name: 'Parkside Terrace - Unit 3',
        street: '89 Park Terrace',
        city: 'Sheffield',
        county: 'South Yorkshire',
        postcode: 'S10 2PT',
        propertyType: 'Apartment',
        purchaseDate: new Date('2021-08-12'),
        purchasePrice: 175000,
        status: 'Occupied',
        notes: 'Modern development with parking and communal gardens',
      },
    }),
    prisma.property.create({
      data: {
        name: 'Hillside Bungalow',
        street: '34 Hill Road',
        city: 'Newcastle',
        county: 'Tyne and Wear',
        postcode: 'NE1 7RU',
        propertyType: 'Bungalow',
        purchaseDate: new Date('2020-09-22'),
        purchasePrice: 210000,
        status: 'Under Maintenance',
        notes: 'Single-level property, currently undergoing bathroom renovation',
      },
    }),
  ]);

  console.log(`✅ Created ${properties.length} properties`);
  return properties;
}

async function seedTenants() {
  console.log('👥 Seeding tenants...');

  const tenants = await Promise.all([
    prisma.tenant.create({
      data: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        phone: '07700 900123',
        emergencyContactName: 'Michael Johnson',
        emergencyContactPhone: '07700 900124',
        status: 'Active',
        notes: 'Excellent tenant, always pays on time',
      },
    }),
    prisma.tenant.create({
      data: {
        firstName: 'David',
        lastName: 'Smith',
        email: 'david.smith@email.com',
        phone: '07700 900234',
        emergencyContactName: 'Emma Smith',
        emergencyContactPhone: '07700 900235',
        status: 'Active',
        notes: 'Professional working from home, quiet and respectful',
      },
    }),
    prisma.tenant.create({
      data: {
        firstName: 'Emily',
        lastName: 'Williams',
        email: 'emily.williams@email.com',
        phone: '07700 900345',
        emergencyContactName: 'Robert Williams',
        emergencyContactPhone: '07700 900346',
        status: 'Active',
        notes: 'Young professional, first-time renter',
      },
    }),
    prisma.tenant.create({
      data: {
        firstName: 'James',
        lastName: 'Brown',
        email: 'james.brown@email.com',
        phone: '07700 900456',
        emergencyContactName: 'Lisa Brown',
        emergencyContactPhone: '07700 900457',
        status: 'Active',
        notes: 'Teacher, very tidy and maintains property well',
      },
    }),
    prisma.tenant.create({
      data: {
        firstName: 'Sophie',
        lastName: 'Taylor',
        email: 'sophie.taylor@email.com',
        phone: '07700 900567',
        emergencyContactName: 'Andrew Taylor',
        emergencyContactPhone: '07700 900568',
        status: 'Active',
        notes: 'Has a small dog (approved), pet deposit paid',
      },
    }),
    prisma.tenant.create({
      data: {
        firstName: 'Michael',
        lastName: 'Davies',
        email: 'michael.davies@email.com',
        phone: '07700 900678',
        status: 'Inactive',
        notes: 'Previous tenant, moved out in good standing',
      },
    }),
    prisma.tenant.create({
      data: {
        firstName: 'Rachel',
        lastName: 'Evans',
        email: 'rachel.evans@email.com',
        phone: '07700 900789',
        emergencyContactName: 'Thomas Evans',
        emergencyContactPhone: '07700 900790',
        status: 'Active',
        notes: 'Graduate student, quiet and responsible',
      },
    }),
    prisma.tenant.create({
      data: {
        firstName: 'Thomas',
        lastName: 'Wilson',
        email: 'thomas.wilson@email.com',
        phone: '07700 900890',
        emergencyContactName: 'Jane Wilson',
        emergencyContactPhone: '07700 900891',
        status: 'Active',
        notes: 'IT consultant, travels frequently for work',
      },
    }),
    prisma.tenant.create({
      data: {
        firstName: 'Jessica',
        lastName: 'Moore',
        email: 'jessica.moore@email.com',
        phone: '07700 900901',
        status: 'Pending',
        notes: 'Application approved, moving in next month',
      },
    }),
    prisma.tenant.create({
      data: {
        firstName: 'Daniel',
        lastName: 'Robinson',
        email: 'daniel.robinson@email.com',
        phone: '07700 901012',
        emergencyContactName: 'Sarah Robinson',
        emergencyContactPhone: '07700 901013',
        status: 'Active',
        notes: 'Nurse working shifts, very considerate neighbor',
      },
    }),
  ]);

  console.log(`✅ Created ${tenants.length} tenants`);
  return tenants;
}

async function seedLeases(properties: any[], tenants: any[]) {
  console.log('📋 Seeding leases...');

  const leases = await Promise.all([
    // Active lease - Sunset Apartments Unit 1A
    prisma.lease.create({
      data: {
        propertyId: properties[0].id,
        tenantId: tenants[0].id,
        startDate: new Date('2023-06-01'),
        endDate: new Date('2024-05-31'),
        monthlyRent: 850,
        securityDepositAmount: 850,
        securityDepositPaidDate: new Date('2023-05-15'),
        status: 'Active',
      },
    }),
    // Active lease - Oak Street House
    prisma.lease.create({
      data: {
        propertyId: properties[1].id,
        tenantId: tenants[1].id,
        startDate: new Date('2023-09-01'),
        endDate: new Date('2024-08-31'),
        monthlyRent: 1200,
        securityDepositAmount: 1200,
        securityDepositPaidDate: new Date('2023-08-20'),
        status: 'Active',
      },
    }),
    // Active lease - River View Flat
    prisma.lease.create({
      data: {
        propertyId: properties[2].id,
        tenantId: tenants[2].id,
        startDate: new Date('2023-03-15'),
        endDate: new Date('2024-03-14'),
        monthlyRent: 750,
        securityDepositAmount: 750,
        securityDepositPaidDate: new Date('2023-03-01'),
        status: 'Active',
      },
    }),
    // Expired lease - Garden Cottage (property now vacant)
    prisma.lease.create({
      data: {
        propertyId: properties[3].id,
        tenantId: tenants[5].id, // Michael Davies - Inactive
        startDate: new Date('2022-04-01'),
        endDate: new Date('2023-12-31'),
        monthlyRent: 950,
        securityDepositAmount: 950,
        securityDepositPaidDate: new Date('2022-03-15'),
        status: 'Expired',
      },
    }),
    // Active lease - City Centre Studio
    prisma.lease.create({
      data: {
        propertyId: properties[4].id,
        tenantId: tenants[3].id,
        startDate: new Date('2023-07-01'),
        endDate: new Date('2024-06-30'),
        monthlyRent: 650,
        securityDepositAmount: 650,
        securityDepositPaidDate: new Date('2023-06-20'),
        status: 'Active',
      },
    }),
    // Active lease - Parkside Terrace Unit 3
    prisma.lease.create({
      data: {
        propertyId: properties[5].id,
        tenantId: tenants[4].id,
        startDate: new Date('2023-10-01'),
        endDate: new Date('2024-09-30'),
        monthlyRent: 800,
        securityDepositAmount: 1600, // Extra deposit for pet
        securityDepositPaidDate: new Date('2023-09-25'),
        status: 'Active',
      },
    }),
    // Active lease - Hillside Bungalow
    prisma.lease.create({
      data: {
        propertyId: properties[6].id,
        tenantId: tenants[6].id,
        startDate: new Date('2023-05-01'),
        monthlyRent: 1050,
        securityDepositAmount: 1050,
        securityDepositPaidDate: new Date('2023-04-20'),
        status: 'Active',
      },
    }),
    // Pending lease - for Jessica Moore
    prisma.lease.create({
      data: {
        propertyId: properties[3].id, // Garden Cottage
        tenantId: tenants[8].id,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2025-01-31'),
        monthlyRent: 975,
        securityDepositAmount: 975,
        status: 'Pending',
      },
    }),
  ]);

  console.log(`✅ Created ${leases.length} leases`);
  return leases;
}

async function seedTransactions(properties: any[], leases: any[]) {
  console.log('💰 Seeding transactions...');

  const transactions = [];

  // Rent income transactions for active leases
  transactions.push(
    // Sunset Apartments - monthly rent
    await prisma.transaction.create({
      data: {
        propertyId: properties[0].id,
        leaseId: leases[0].id,
        type: 'Income',
        category: 'Rent',
        amount: 850,
        transactionDate: new Date('2023-12-01'),
        description: 'Monthly rent - December 2023',
      },
    }),
    await prisma.transaction.create({
      data: {
        propertyId: properties[0].id,
        leaseId: leases[0].id,
        type: 'Income',
        category: 'Rent',
        amount: 850,
        transactionDate: new Date('2024-01-01'),
        description: 'Monthly rent - January 2024',
      },
    }),

    // Oak Street House - monthly rent
    await prisma.transaction.create({
      data: {
        propertyId: properties[1].id,
        leaseId: leases[1].id,
        type: 'Income',
        category: 'Rent',
        amount: 1200,
        transactionDate: new Date('2023-12-01'),
        description: 'Monthly rent - December 2023',
      },
    }),
    await prisma.transaction.create({
      data: {
        propertyId: properties[1].id,
        leaseId: leases[1].id,
        type: 'Income',
        category: 'Rent',
        amount: 1200,
        transactionDate: new Date('2024-01-01'),
        description: 'Monthly rent - January 2024',
      },
    }),

    // River View Flat - monthly rent
    await prisma.transaction.create({
      data: {
        propertyId: properties[2].id,
        leaseId: leases[2].id,
        type: 'Income',
        category: 'Rent',
        amount: 750,
        transactionDate: new Date('2023-12-15'),
        description: 'Monthly rent - December 2023',
      },
    }),
    await prisma.transaction.create({
      data: {
        propertyId: properties[2].id,
        leaseId: leases[2].id,
        type: 'Income',
        category: 'Rent',
        amount: 750,
        transactionDate: new Date('2024-01-15'),
        description: 'Monthly rent - January 2024',
      },
    }),

    // Security deposit income
    await prisma.transaction.create({
      data: {
        propertyId: properties[0].id,
        leaseId: leases[0].id,
        type: 'Income',
        category: 'Deposit',
        amount: 850,
        transactionDate: new Date('2023-05-15'),
        description: 'Security deposit received',
      },
    }),
  );

  // Expense transactions
  transactions.push(
    // Maintenance expenses
    await prisma.transaction.create({
      data: {
        propertyId: properties[1].id,
        type: 'Expense',
        category: 'Maintenance',
        amount: 175.50,
        transactionDate: new Date('2023-11-15'),
        description: 'Plumber - fixed leaking tap in bathroom',
      },
    }),
    await prisma.transaction.create({
      data: {
        propertyId: properties[0].id,
        type: 'Expense',
        category: 'Maintenance',
        amount: 89.99,
        transactionDate: new Date('2023-12-05'),
        description: 'Annual boiler service',
      },
    }),
    await prisma.transaction.create({
      data: {
        propertyId: properties[6].id,
        type: 'Expense',
        category: 'Renovation',
        amount: 2450.00,
        transactionDate: new Date('2024-01-10'),
        description: 'Bathroom renovation - new fixtures and tiling',
      },
    }),

    // Utility expenses
    await prisma.transaction.create({
      data: {
        propertyId: properties[3].id,
        type: 'Expense',
        category: 'Utilities',
        amount: 125.50,
        transactionDate: new Date('2023-12-20'),
        description: 'Water bill - vacant period',
      },
    }),

    // Insurance expenses
    await prisma.transaction.create({
      data: {
        propertyId: properties[0].id,
        type: 'Expense',
        category: 'Insurance',
        amount: 385.00,
        transactionDate: new Date('2023-11-01'),
        description: 'Annual building insurance premium',
      },
    }),
    await prisma.transaction.create({
      data: {
        propertyId: properties[1].id,
        type: 'Expense',
        category: 'Insurance',
        amount: 425.00,
        transactionDate: new Date('2023-11-01'),
        description: 'Annual building and contents insurance',
      },
    }),

    // Property tax
    await prisma.transaction.create({
      data: {
        propertyId: properties[2].id,
        type: 'Expense',
        category: 'Tax',
        amount: 1560.00,
        transactionDate: new Date('2023-12-01'),
        description: 'Council tax - annual payment',
      },
    }),

    // Management fees
    await prisma.transaction.create({
      data: {
        propertyId: properties[5].id,
        type: 'Expense',
        category: 'Management Fee',
        amount: 75.00,
        transactionDate: new Date('2023-12-01'),
        description: 'Property management fee - December',
      },
    }),

    // Cleaning and gardening
    await prisma.transaction.create({
      data: {
        propertyId: properties[3].id,
        type: 'Expense',
        category: 'Cleaning',
        amount: 150.00,
        transactionDate: new Date('2024-01-05'),
        description: 'Deep clean after tenant move-out',
      },
    }),
    await prisma.transaction.create({
      data: {
        propertyId: properties[1].id,
        type: 'Expense',
        category: 'Gardening',
        amount: 65.00,
        transactionDate: new Date('2023-11-20'),
        description: 'Garden maintenance - autumn cleanup',
      },
    }),

    // More rent payments
    await prisma.transaction.create({
      data: {
        propertyId: properties[4].id,
        leaseId: leases[4].id,
        type: 'Income',
        category: 'Rent',
        amount: 650,
        transactionDate: new Date('2024-01-01'),
        description: 'Monthly rent - January 2024',
      },
    }),
    await prisma.transaction.create({
      data: {
        propertyId: properties[5].id,
        leaseId: leases[5].id,
        type: 'Income',
        category: 'Rent',
        amount: 800,
        transactionDate: new Date('2024-01-01'),
        description: 'Monthly rent - January 2024',
      },
    }),
  );

  console.log(`✅ Created ${transactions.length} transactions`);
  return transactions;
}

async function seedEvents(properties: any[]) {
  console.log('📅 Seeding events...');

  const events = await Promise.all([
    // Completed events
    prisma.event.create({
      data: {
        propertyId: properties[0].id,
        eventType: 'Inspection',
        title: 'Routine Property Inspection',
        description: 'Quarterly inspection of property condition',
        scheduledDate: new Date('2023-12-15'),
        completed: true,
        completedDate: new Date('2023-12-15'),
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[1].id,
        eventType: 'Maintenance',
        title: 'Boiler Service',
        description: 'Annual boiler maintenance and safety check',
        scheduledDate: new Date('2023-12-05'),
        completed: true,
        completedDate: new Date('2023-12-05'),
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[3].id,
        eventType: 'Showing',
        title: 'Property Viewing',
        description: 'Showing to prospective tenant Jessica Moore',
        scheduledDate: new Date('2024-01-08'),
        completed: true,
        completedDate: new Date('2024-01-08'),
      },
    }),

    // Upcoming/pending events
    prisma.event.create({
      data: {
        propertyId: properties[2].id,
        eventType: 'Inspection',
        title: 'Mid-Lease Inspection',
        description: 'Check-in inspection before lease renewal',
        scheduledDate: new Date('2024-02-15'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[6].id,
        eventType: 'Maintenance',
        title: 'Bathroom Renovation Completion',
        description: 'Final inspection of bathroom renovation work',
        scheduledDate: new Date('2024-01-25'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[0].id,
        eventType: 'Maintenance',
        title: 'Gutter Cleaning',
        description: 'Annual gutter cleaning and downpipe check',
        scheduledDate: new Date('2024-02-10'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[5].id,
        eventType: 'Inspection',
        title: 'Pet Damage Assessment',
        description: 'Check for any wear and tear from tenant\'s dog',
        scheduledDate: new Date('2024-03-01'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[1].id,
        eventType: 'Maintenance',
        title: 'Garden Spring Preparation',
        description: 'Spring garden tidy-up and lawn treatment',
        scheduledDate: new Date('2024-03-15'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[4].id,
        eventType: 'Other',
        title: 'Fire Safety Certificate Renewal',
        description: 'Renew fire safety certification for building',
        scheduledDate: new Date('2024-02-28'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[3].id,
        eventType: 'Showing',
        title: 'New Tenant Move-In',
        description: 'Jessica Moore moving in, keys handover and inventory check',
        scheduledDate: new Date('2024-02-01'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[2].id,
        eventType: 'Other',
        title: 'Lease Renewal Discussion',
        description: 'Meet with Emily Williams to discuss lease renewal terms',
        scheduledDate: new Date('2024-02-20'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[1].id,
        eventType: 'Inspection',
        title: 'Safety Equipment Check',
        description: 'Test smoke alarms and carbon monoxide detectors',
        scheduledDate: new Date('2024-01-30'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[0].id,
        eventType: 'Maintenance',
        title: 'Window Cleaning',
        description: 'Professional window cleaning service',
        scheduledDate: new Date('2024-02-05'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[5].id,
        eventType: 'Other',
        title: 'Building Management Meeting',
        description: 'Annual meeting with building management company',
        scheduledDate: new Date('2024-03-10'),
        completed: false,
      },
    }),
    prisma.event.create({
      data: {
        propertyId: properties[4].id,
        eventType: 'Maintenance',
        title: 'Appliance Service',
        description: 'Service washing machine and check kitchen appliances',
        scheduledDate: new Date('2024-02-25'),
        completed: false,
      },
    }),
  ]);

  console.log(`✅ Created ${events.length} events`);
  return events;
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    await clearDatabase();
    console.log();

    const users = await seedUsers();
    console.log();

    const properties = await seedProperties();
    console.log();

    const tenants = await seedTenants();
    console.log();

    const leases = await seedLeases(properties, tenants);
    console.log();

    const transactions = await seedTransactions(properties, leases);
    console.log();

    const events = await seedEvents(properties);
    console.log();

    console.log('🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${users.length} users`);
    console.log(`   - ${properties.length} properties`);
    console.log(`   - ${tenants.length} tenants`);
    console.log(`   - ${leases.length} leases`);
    console.log(`   - ${transactions.length} transactions`);
    console.log(`   - ${events.length} events`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
