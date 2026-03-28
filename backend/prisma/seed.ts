import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TIERS = ['GENERAL', 'VIP', 'EARLY_BIRD'] as const;

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.rsvp.deleteMany();
  await prisma.event.deleteMany();

  // Create event with capacity 100
  const event = await prisma.event.create({
    data: {
      name: 'Hope Conference 2026',
      totalCapacity: 100,
    },
  });
  console.log(
    `Created event: ${event.name} (capacity: ${event.totalCapacity})`,
  );

  // Create 100 confirmed users
  const confirmedPromises = Array.from({ length: 100 }, (_, i) =>
    prisma.rsvp.create({
      data: {
        userId: `user-confirmed-${String(i + 1).padStart(3, '0')}`,
        eventId: event.id,
        tier: TIERS[i % TIERS.length],
        status: 'CONFIRMED',
      },
    }),
  );
  await Promise.all(confirmedPromises);
  console.log('Created 100 confirmed RSVPs');

  // Create 40 waitlisted users with mixed tiers
  const waitlistedPromises = Array.from({ length: 40 }, (_, i) =>
    prisma.rsvp.create({
      data: {
        userId: `user-waitlist-${String(i + 1).padStart(3, '0')}`,
        eventId: event.id,
        tier: TIERS[i % TIERS.length],
        status: 'WAITLISTED',
        waitlistPosition: i + 1,
      },
    }),
  );
  await Promise.all(waitlistedPromises);
  console.log('Created 40 waitlisted RSVPs');

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
