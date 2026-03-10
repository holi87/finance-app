import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test user
  const passwordHash = await argon2.hash('password123');
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash,
      displayName: 'Test User',
    },
  });

  console.log(`Created user: ${user.email} (${user.id})`);

  // Create a personal workspace
  const workspace = await prisma.workspace.upsert({
    where: { ownerId_slug: { ownerId: user.id, slug: 'personal' } },
    update: {},
    create: {
      name: 'Personal',
      slug: 'personal',
      type: 'personal',
      baseCurrency: 'PLN',
      ownerId: user.id,
      memberships: {
        create: {
          userId: user.id,
          role: 'owner',
        },
      },
    },
  });

  console.log(`Created workspace: ${workspace.name} (${workspace.id})`);
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
