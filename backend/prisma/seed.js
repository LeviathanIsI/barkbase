const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { addDays, subDays, startOfDay } = require('date-fns');

const prisma = new PrismaClient();

const clearDatabase = async () => {
  await prisma.bookingService.deleteMany();
  await prisma.bookingSegment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.vaccination.deleteMany();
  await prisma.petOwner.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.kennel.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
};

const createTenant = async () =>
  prisma.tenant.create({
    data: {
      name: 'BarkBase Resort',
      slug: 'barkbase',
      plan: 'PRO',
      themeJson: {
        colors: {
          primary: '59 130 246',
          secondary: '129 140 248',
          accent: '249 115 22',
        },
      },
      featureFlags: {
        waitlist: true,
        medicationReminders: true,
        incidentReporting: true,
      },
      settings: { timezone: 'America/Los_Angeles', currency: 'USD' },
    },
  });

const createUsers = async (tenantId) => {
  const ownerHash = await bcrypt.hash('Passw0rd!', 12);
  const staffHash = await bcrypt.hash('Passw0rd!', 12);

  const ownerUser = await prisma.user.create({
    data: {
      email: 'owner@barkbase.local',
      passwordHash: ownerHash,
    },
  });

  const ownerMembership = await prisma.membership.create({
    data: {
      tenantId,
      userId: ownerUser.id,
      role: 'OWNER',
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@barkbase.local',
      passwordHash: staffHash,
    },
  });

  const staffMembership = await prisma.membership.create({
    data: {
      tenantId,
      userId: staffUser.id,
      role: 'STAFF',
    },
  });

  await prisma.staff.create({
    data: {
      tenantId,
      membershipId: staffMembership.id,
      title: 'Front Desk Lead',
      schedule: { shifts: [] },
    },
  });

  return { ownerUser, ownerMembership, staffUser, staffMembership };
};

const createOwners = async (tenantId) => {
  const now = new Date();

  const coreOwners = await Promise.all([
    prisma.owner.create({
      data: {
        tenantId,
        firstName: 'Amy',
        lastName: 'Peterson',
        email: 'amy.peterson@example.com',
        phone: '555-0101',
        address: { city: 'Seattle', state: 'WA' },
        createdAt: subDays(now, 120),
      },
    }),
    prisma.owner.create({
      data: {
        tenantId,
        firstName: 'Jon',
        lastName: 'Clark',
        email: 'jon.clark@example.com',
        phone: '555-0102',
        address: { city: 'Seattle', state: 'WA' },
        createdAt: subDays(now, 45),
      },
    }),
    prisma.owner.create({
      data: {
        tenantId,
        firstName: 'Jamie',
        lastName: 'Fox',
        email: 'jamie.fox@example.com',
        phone: '555-0103',
        address: { city: 'Seattle', state: 'WA' },
        createdAt: subDays(now, 10),
      },
    }),
    prisma.owner.create({
      data: {
        tenantId,
        firstName: 'Sasha',
        lastName: 'Blake',
        email: 'sasha.blake@example.com',
        phone: '555-0104',
        address: { city: 'Seattle', state: 'WA' },
        createdAt: subDays(now, 5),
      },
    }),
  ]);

  const additionalNames = [
    ['Jordan', 'Mills'],
    ['Taylor', 'Nguyen'],
    ['Morgan', 'Santos'],
    ['Alex', 'Reid'],
    ['Casey', 'Lopez'],
    ['Riley', 'Chen'],
    ['Parker', 'Young'],
    ['Sam', 'Iqbal'],
  ];

  const additionalOwners = await Promise.all(
    additionalNames.map(([firstName, lastName], index) =>
      prisma.owner.create({
        data: {
          tenantId,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          phone: `555-02${(index + 1).toString().padStart(2, '0')}`,
          address: { city: 'Seattle', state: 'WA' },
          createdAt: subDays(now, index % 14),
        },
      }),
    ),
  );

  return {
    amy: coreOwners[0],
    jon: coreOwners[1],
    jamie: coreOwners[2],
    sasha: coreOwners[3],
    additionalOwners,
  };
};

const createKennels = async (tenantId) => {
  const kennels = [
    { name: 'Deluxe Suite 1', type: 'SUITE', capacity: 1 },
    { name: 'Deluxe Suite 2', type: 'SUITE', capacity: 1 },
    { name: 'Standard Kennel 1', type: 'KENNEL', capacity: 1 },
    { name: 'Standard Kennel 2', type: 'KENNEL', capacity: 1 },
    { name: 'Daycare Pod A', type: 'DAYCARE', capacity: 6 },
    { name: 'Luxury Cabin', type: 'CABIN', capacity: 1 },
  ];

  const records = await Promise.all(
    kennels.map((kennel) =>
      prisma.kennel.create({
        data: {
          tenantId,
          name: kennel.name,
          type: kennel.type,
          capacity: kennel.capacity,
          amenities: [],
        },
      }),
    ),
  );

  return Object.fromEntries(records.map((record) => [record.name, record]));
};

const createPets = async (tenantId, owners) => {
  const now = new Date();

  const luna = await prisma.pet.create({
    data: {
      tenantId,
      name: 'Luna',
      breed: 'Australian Shepherd',
      birthdate: subDays(now, 3 * 365),
      photoUrl: null,
      medicalNotes: 'Daily allergy pill with breakfast. Monitor for stress chewing.',
      dietaryNotes: 'Grain-free kibble; peanut butter treat only if owner provides.',
      behaviorFlags: ['high-energy', 'anxious first night'],
      owners: {
        create: [{ tenantId, ownerId: owners.amy.id, isPrimary: true }],
      },
    },
  });

  const rex = await prisma.pet.create({
    data: {
      tenantId,
      name: 'Rex',
      breed: 'German Shepherd',
      birthdate: subDays(now, 5 * 365),
      medicalNotes: 'Prefers medication with food. Sensitive stomach.',
      dietaryNotes: 'High-protein kibble twice daily.',
      behaviorFlags: ['reactive-on-leash'],
      owners: {
        create: [{ tenantId, ownerId: owners.jon.id, isPrimary: true }],
      },
    },
  });

  const bella = await prisma.pet.create({
    data: {
      tenantId,
      name: 'Bella',
      breed: 'Golden Retriever',
      birthdate: subDays(now, 2 * 365),
      medicalNotes: 'Monitor playtime interactions. Loves fetch.',
      dietaryNotes: 'Standard kennel blend.',
      behaviorFlags: ['friendly'],
      owners: {
        create: [{ tenantId, ownerId: owners.jamie.id, isPrimary: true }],
      },
    },
  });

  const cooper = await prisma.pet.create({
    data: {
      tenantId,
      name: 'Cooper',
      breed: 'Labradoodle',
      birthdate: subDays(now, 4 * 365),
      medicalNotes: 'Needs medication at 7pm sharp.',
      dietaryNotes: 'Grain-free salmon formula.',
      behaviorFlags: ['needs-slow-intros'],
      owners: {
        create: [{ tenantId, ownerId: owners.sasha.id, isPrimary: true }],
      },
    },
  });

  const waitlistDefinitions = [
    { name: 'Daisy', breed: 'Cocker Spaniel', owner: owners.additionalOwners[0] },
    { name: 'Oliver', breed: 'Poodle Mix', owner: owners.additionalOwners[1] },
    { name: 'Nala', breed: 'Shiba Mix', owner: owners.additionalOwners[2] },
  ];

  const waitlistPets = [];

  for (const definition of waitlistDefinitions) {
    if (!definition.owner) continue;
    const pet = await prisma.pet.create({
      data: {
        tenantId,
        name: definition.name,
        breed: definition.breed,
        medicalNotes: 'Pending evaluation.',
        dietaryNotes: 'Standard kennel blend.',
        behaviorFlags: [],
        owners: {
          create: [{ tenantId, ownerId: definition.owner.id, isPrimary: true }],
        },
      },
    });
    waitlistPets.push({ pet, owner: definition.owner });
  }

  return { luna, rex, bella, cooper, waitlistPets };
};

const createVaccinations = async (tenantId, pets) => {
  await prisma.vaccination.createMany({
    data: [
      {
        tenantId,
        petId: pets.luna.id,
        type: 'Rabies',
        administeredAt: new Date('2025-04-12T08:00:00Z'),
        expiresAt: new Date('2026-04-11T08:00:00Z'),
        notes: 'Certificate on file.',
      },
      {
        tenantId,
        petId: pets.luna.id,
        type: 'Bordetella',
        administeredAt: new Date('2025-08-01T08:00:00Z'),
        expiresAt: new Date('2026-01-29T08:00:00Z'),
        notes: 'Due for booster in 6 months.',
      },
      {
        tenantId,
        petId: pets.rex.id,
        type: 'DHPP',
        administeredAt: new Date('2025-06-15T08:00:00Z'),
        expiresAt: new Date('2026-06-14T08:00:00Z'),
      },
      {
        tenantId,
        petId: pets.bella.id,
        type: 'Rabies',
        administeredAt: new Date('2025-07-20T08:00:00Z'),
        expiresAt: new Date('2026-07-19T08:00:00Z'),
      },
      {
        tenantId,
        petId: pets.cooper.id,
        type: 'Bordetella',
        administeredAt: new Date('2025-09-01T08:00:00Z'),
        expiresAt: new Date('2026-03-01T08:00:00Z'),
      },
    ],
  });
};

const createBookings = async (tenantId, pets, owners, kennels) => {
  const today = startOfDay(new Date());

  const lunaBooking = await prisma.booking.create({
    data: {
      tenantId,
      petId: pets.luna.id,
      ownerId: owners.amy.id,
      status: 'CHECKED_IN',
      checkIn: today,
      checkOut: addDays(today, 3),
      depositCents: 12000,
      totalCents: 48000,
      balanceDueCents: 36000,
      notes: 'Prefers quiet spaces. Provide anxiety chews at night.',
      segments: {
        create: [
          {
            tenantId,
            kennelId: kennels['Deluxe Suite 1'].id,
            startDate: today,
            endDate: addDays(today, 2),
            status: 'CHECKED_IN',
          },
          {
            tenantId,
            kennelId: kennels['Deluxe Suite 2'].id,
            startDate: addDays(today, 2),
            endDate: addDays(today, 3),
            status: 'CONFIRMED',
          },
        ],
      },
    },
  });

  const rexBooking = await prisma.booking.create({
    data: {
      tenantId,
      petId: pets.rex.id,
      ownerId: owners.jon.id,
      status: 'PENDING',
      checkIn: addDays(today, 1),
      checkOut: addDays(today, 3),
      depositCents: 8000,
      totalCents: 32000,
      balanceDueCents: 32000,
      specialInstructions: 'Administer pills with dinner.',
      segments: {
        create: [
          {
            tenantId,
            kennelId: kennels['Standard Kennel 1'].id,
            startDate: addDays(today, 1),
            endDate: addDays(today, 3),
            status: 'PENDING',
          },
        ],
      },
    },
  });

  const bellaBooking = await prisma.booking.create({
    data: {
      tenantId,
      petId: pets.bella.id,
      ownerId: owners.jamie.id,
      status: 'CONFIRMED',
      checkIn: addDays(today, 2),
      checkOut: addDays(today, 5),
      depositCents: 9000,
      totalCents: 36000,
      balanceDueCents: 27000,
      segments: {
        create: [
          {
            tenantId,
            kennelId: kennels['Luxury Cabin'].id,
            startDate: addDays(today, 2),
            endDate: addDays(today, 5),
            status: 'CONFIRMED',
          },
        ],
      },
    },
  });

  const cooperWaitlist = await prisma.booking.create({
    data: {
      tenantId,
      petId: pets.cooper.id,
      ownerId: owners.sasha.id,
      status: 'PENDING',
      checkIn: addDays(today, 4),
      checkOut: addDays(today, 7),
      depositCents: 0,
      totalCents: 42000,
      balanceDueCents: 42000,
      notes: 'Needs medication reminders. Prefers deluxe suite.',
      segments: {
        create: [
          {
            tenantId,
            kennelId: kennels['Deluxe Suite 2'].id,
            startDate: addDays(today, 4),
            endDate: addDays(today, 7),
            status: 'PENDING',
          },
        ],
      },
    },
  });

  const waitlistKennels = ['Standard Kennel 2', 'Deluxe Suite 1', 'Daycare Pod A'];
  if (pets.waitlistPets?.length) {
    await Promise.all(
      pets.waitlistPets.map(({ pet, owner }, index) =>
        prisma.booking.create({
          data: {
            tenantId,
            petId: pet.id,
            ownerId: owner.id,
            status: 'PENDING',
            checkIn: addDays(today, 5 + index),
            checkOut: addDays(today, 6 + index),
            depositCents: 0,
            totalCents: 30000,
            balanceDueCents: 30000,
            notes: 'Waitlist entry awaiting confirmation.',
            segments: {
              create: [
                {
                  tenantId,
                  kennelId: kennels[waitlistKennels[index % waitlistKennels.length]].id,
                  startDate: addDays(today, 5 + index),
                  endDate: addDays(today, 6 + index),
                  status: 'PENDING',
                },
              ],
            },
          },
        }),
      ),
    );
  }

  const additionalBookings = [];
  const daycareKennelId = kennels['Daycare Pod A'].id;
  for (let i = 0; i < 16; i += 1) {
    const start = addDays(today, i % 7);
    additionalBookings.push(
      prisma.booking.create({
        data: {
          tenantId,
          petId: pets.bella.id,
          ownerId: owners.jamie.id,
          status: i % 3 === 0 ? 'CHECKED_IN' : 'CONFIRMED',
          checkIn: start,
          checkOut: addDays(start, 1),
          depositCents: 2000,
          totalCents: 6000,
          balanceDueCents: 4000,
          segments: {
            create: [
              {
                tenantId,
                kennelId: daycareKennelId,
                startDate: start,
                endDate: addDays(start, 1),
                status: i % 3 === 0 ? 'CHECKED_IN' : 'CONFIRMED',
              },
            ],
          },
        },
      }),
    );
  }

  await Promise.all(additionalBookings);

  return { lunaBooking, rexBooking, bellaBooking, cooperWaitlist };
};

const createPayments = async (tenantId, bookings) => {
  await prisma.payment.createMany({
    data: [
      {
        tenantId,
        bookingId: bookings.lunaBooking.id,
        ownerId: bookings.lunaBooking.ownerId,
        amountCents: 12000,
        status: 'CAPTURED',
        method: 'card_on_file',
        metadata: {},
      },
      {
        tenantId,
        bookingId: bookings.bellaBooking.id,
        ownerId: bookings.bellaBooking.ownerId,
        amountCents: 9000,
        status: 'CAPTURED',
        method: 'card_on_file',
        metadata: {},
      },
    ],
  });
};

async function main() {
  await clearDatabase();

  const tenant = await createTenant();
  await createUsers(tenant.id);
  const owners = await createOwners(tenant.id);
  const kennels = await createKennels(tenant.id);
  const pets = await createPets(tenant.id, owners);
  await createVaccinations(tenant.id, pets);
  const bookings = await createBookings(tenant.id, pets, owners, kennels);
  await createPayments(tenant.id, bookings);

  console.log('Seed completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed', error);
    await prisma.$disconnect();
    process.exit(1);
  });
