/*
  Seed data for YOUR specific test account
  This adds sample data to your existing tenant without recreating user/tenant
*/

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const { addDays, subDays, startOfDay } = require('date-fns');

// Your actual account IDs
const TENANT_ID = 'cmgtdqv000000us2sh5t96che';
const USER_ID = 'cmgtdqv2g0001us2syvg55ugt';
const MEMBERSHIP_ID = 'cmgtdqv7i0003us2sysxfuxco';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding sample data to your account...\n');

  // Verify your account exists
  const tenant = await prisma.tenant.findFirst({ where: { recordId: TENANT_ID } });
  const user = await prisma.user.findFirst({ where: { recordId: USER_ID } });
  const membership = await prisma.membership.findFirst({ where: { recordId: MEMBERSHIP_ID } });

  if (!tenant || !user || !membership) {
    console.error('❌ Could not find your account. Please check the IDs.');
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`✅ Found user: ${user.email}`);
  console.log(`✅ Found membership: ${membership.role}\n`);

  // Add sample data in a transaction with tenant context
  await prisma.$transaction(async (tx) => {
    // Set tenant context for RLS
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${TENANT_ID}, true)`;

    // Create some sample kennels
    console.log('Creating kennels...');
    const kennels = await Promise.all([
      tx.kennel.create({
        data: {
          tenantId: TENANT_ID,
          name: 'Suite A1',
          type: 'SUITE',
          capacity: 2,
          dailyRate: 7500,
          amenities: JSON.stringify(['TV', 'Climate Control', 'Webcam']),
        },
      }),
      tx.kennel.create({
        data: {
          tenantId: TENANT_ID,
          name: 'Standard K1',
          type: 'KENNEL',
          capacity: 1,
          dailyRate: 5000,
          amenities: JSON.stringify(['Climate Control']),
        },
      }),
      tx.kennel.create({
        data: {
          tenantId: TENANT_ID,
          name: 'Daycare Area 1',
          type: 'DAYCARE',
          capacity: 20,
          hourlyRate: 1500,
          amenities: JSON.stringify(['Play Equipment', 'Water Station']),
        },
      }),
    ]);
    console.log(`✅ Created ${kennels.length} kennels`);

    // Create some services
    console.log('Creating services...');
    const services = await Promise.all([
      tx.service.create({
        data: {
          tenantId: TENANT_ID,
          name: 'Basic Grooming',
          priceCents: 4500,
          category: 'GROOMING',
          description: 'Bath, nail trim, and ear cleaning',
        },
      }),
      tx.service.create({
        data: {
          tenantId: TENANT_ID,
          name: 'Playtime Session',
          priceCents: 2000,
          category: 'OTHER',
          description: '30 minute one-on-one playtime',
        },
      }),
      tx.service.create({
        data: {
          tenantId: TENANT_ID,
          name: 'Medication Administration',
          priceCents: 1000,
          category: 'OTHER',
          description: 'Per dose medication administration',
        },
      }),
    ]);
    console.log(`✅ Created ${services.length} services`);

    // Create sample owners and pets
    console.log('Creating owners and pets...');
    const owners = [];
    for (let i = 0; i < 5; i++) {
      const owner = await tx.owner.create({
        data: {
          tenantId: TENANT_ID,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          phone: faker.phone.number('###-###-####'),
          address: {
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state({ abbreviated: true }),
            zip: faker.location.zipCode(),
          },
        },
      });
      owners.push(owner);

      // Create 1-2 pets per owner
      const petCount = Math.random() > 0.5 ? 2 : 1;
      for (let j = 0; j < petCount; j++) {
        const pet = await tx.pet.create({
          data: {
            tenantId: TENANT_ID,
            name: faker.person.firstName(),
            species: Math.random() > 0.3 ? 'dog' : 'cat',
            breed: faker.animal.dog(),
            birthdate: subDays(new Date(), Math.floor(Math.random() * 3650) + 365),
            weight: Math.floor(Math.random() * 80) + 10,
            behaviorFlags: [],
            status: 'active',
          },
        });

        // Link pet to owner
        await tx.petOwner.create({
          data: {
            tenantId: TENANT_ID,
            petId: pet.recordId,
            ownerId: owner.recordId,
            isPrimary: true,
          },
        });
      }
    }
    console.log(`✅ Created ${owners.length} owners with pets`);

    // Create a couple of active bookings
    console.log('Creating sample bookings...');
    const now = new Date();
    // Set to start of today to ensure it's in the current week
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const booking1 = await tx.booking.create({
      data: {
        tenantId: TENANT_ID,
        ownerId: owners[0].recordId,
        petId: (await tx.pet.findFirst({ where: { tenantId: TENANT_ID } })).recordId,
        status: 'CONFIRMED',
        checkIn: addDays(today, 1), // Tomorrow
        checkOut: addDays(today, 4), // 4 days from today
        totalCents: 15000,
        depositCents: 5000,
        balanceDueCents: 10000,
      },
    });

    // Add a booking segment
    await tx.bookingSegment.create({
      data: {
        tenantId: TENANT_ID,
        bookingId: booking1.recordId,
        kennelId: kennels[0].recordId,
        startDate: booking1.checkIn,
        endDate: booking1.checkOut,
        status: 'CONFIRMED',
      },
    });

    console.log('✅ Created sample bookings');

    // Create a staff member for the user
    const existingStaff = await tx.staff.findFirst({ 
      where: { membershipId: MEMBERSHIP_ID } 
    });
    
    if (!existingStaff) {
      await tx.staff.create({
        data: {
          tenantId: TENANT_ID,
          membershipId: MEMBERSHIP_ID,
          title: 'Owner/Manager',
          schedule: {
            monday: { start: '08:00', end: '17:00' },
            tuesday: { start: '08:00', end: '17:00' },
            wednesday: { start: '08:00', end: '17:00' },
            thursday: { start: '08:00', end: '17:00' },
            friday: { start: '08:00', end: '17:00' },
          },
        },
      });
      console.log('✅ Created staff profile');
    }
  });

  console.log('\n✨ Sample data added successfully!');
  console.log('\nYou can now:');
  console.log('1. Start the backend: cd backend && npm run dev');
  console.log('2. Start the frontend: cd frontend && npm run dev');
  console.log('3. Log in with your existing credentials');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
