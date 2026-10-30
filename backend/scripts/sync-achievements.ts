// Upserts the achievement list from seed data (safe in production: touches nothing else).
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ACHIEVEMENTS } from '../prisma/seed-data/taxonomy.js';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (const [order, achievement] of ACHIEVEMENTS.entries()) {
      await prisma.achievement.upsert({
        where: { code: achievement.code },
        update: { ...achievement, order },
        create: { ...achievement, order },
      });
    }
    console.log(`Synced ${ACHIEVEMENTS.length} achievements.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
