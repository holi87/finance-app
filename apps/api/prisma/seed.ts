import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hash passwords in parallel
  const [adminHash, userHash] = await Promise.all([
    argon2.hash('admin123'),
    argon2.hash('password123'),
  ]);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@budget.app' },
    update: { isAdmin: true },
    create: {
      email: 'admin@budget.app',
      passwordHash: adminHash,
      displayName: 'Administrator',
      isAdmin: true,
    },
  });
  console.log(`Admin user: ${admin.email} / admin123 (isAdmin=${admin.isAdmin})`);

  // Create test user (non-admin)
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: userHash,
      displayName: 'Test User',
    },
  });
  console.log(`Test user: ${user.email} / password123`);

  // Create workspaces
  const household = await prisma.workspace.upsert({
    where: { ownerId_slug: { ownerId: admin.id, slug: 'domowy' } },
    update: {},
    create: {
      name: 'Budżet domowy',
      slug: 'domowy',
      type: 'personal',
      baseCurrency: 'PLN',
      ownerId: admin.id,
      memberships: {
        create: [
          { userId: admin.id, role: 'owner' },
          { userId: user.id, role: 'editor' },
        ],
      },
    },
  });
  console.log(`Workspace: ${household.name} (${household.id})`);

  const firma = await prisma.workspace.upsert({
    where: { ownerId_slug: { ownerId: admin.id, slug: 'firma' } },
    update: {},
    create: {
      name: 'Firma',
      slug: 'firma',
      type: 'business',
      baseCurrency: 'PLN',
      ownerId: admin.id,
      memberships: {
        create: { userId: admin.id, role: 'owner' },
      },
    },
  });
  console.log(`Workspace: ${firma.name} (${firma.id})`);

  console.log('\n✅ Seeding complete!');
  console.log('---');
  console.log('Admin login:  admin@budget.app / admin123');
  console.log('User login:   test@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
