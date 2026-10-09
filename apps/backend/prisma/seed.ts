import { createPrismaClient } from '../src/lib/prisma.js';
import { DEMO_PASSWORD, DEMO_USERS, seedDatabase } from '../src/db/seed.js';

const prisma = createPrismaClient();

seedDatabase(prisma)
  .then((summary) => {
    console.log(`✔ Seeded ${summary.users} users, ${summary.projects} projects and ${summary.issues} issues.`);
    console.log(`  Demo logins (password "${DEMO_PASSWORD}"): ${DEMO_USERS.map((u) => `${u.email} (${u.role})`).join(', ')}`);
  })
  .catch((err) => {
    console.error('✖ Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
