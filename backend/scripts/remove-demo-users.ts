// Deletes all demo accounts (@demo.tapkych.com) and their data. Run this in production.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const { count } = await prisma.user.deleteMany({
      where: { email: { endsWith: '@demo.tapkych.com' } },
    });
    console.log(`Removed ${count} demo users.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
