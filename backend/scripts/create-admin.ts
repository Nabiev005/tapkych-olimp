// Creates an admin (or promotes an existing user).
// Usage: npm run admin:create -w backend -- --email a@b.kg --password "..." --name "Аты Жөнү"
import 'dotenv/config';
import { parseArgs } from 'node:util';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
    name: { type: 'string', default: 'Администратор' },
  },
});

async function main(): Promise<void> {
  const email = values.email?.trim().toLowerCase();
  const password = values.password;
  if (!email || !password || password.length < 8) {
    throw new Error('Usage: --email <email> --password <min 8 chars> [--name <full name>]');
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS ?? 12));
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN', passwordHash, isActive: true },
      create: {
        email,
        passwordHash,
        fullName: values.name ?? 'Администратор',
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    console.log(`Admin ready: ${user.email} (${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
