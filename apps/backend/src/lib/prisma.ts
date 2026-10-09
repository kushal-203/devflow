import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

// Prisma ORM 7: the query engine runs in TypeScript/WASM and talks to PostgreSQL through the pg driver.
export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = createPrismaClient();
