import 'server-only';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

type LegacyPrismaClient = PrismaClient & {
  user: PrismaClient['public_users'];
  customer: PrismaClient['customers'];
  distributor: PrismaClient['distributors'];
  payment: PrismaClient['payments'];
  stand: PrismaClient['stands'];
};

const globalForPrisma = globalThis as unknown as {
  prisma: LegacyPrismaClient | undefined;
};

function createPrismaClient(): LegacyPrismaClient {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set!');
    console.error('Please ensure DATABASE_URL is set in your .env.local file');
  } else {
    // Log connection info (without sensitive data)
    const dbUrl = process.env.DATABASE_URL;
    const urlObj = new URL(dbUrl);
    console.log('Database connection:', {
      host: urlObj.hostname,
      port: urlObj.port,
      database: urlObj.pathname.split('/').pop(),
      hasPassword: !!urlObj.password
    });
  }

  // Create PostgreSQL connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
  });
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }) as LegacyPrismaClient;

  // Provide backwards-compatible aliases so existing services can keep using singular names
  client.user = client.public_users;
  client.customer = client.customers;
  client.distributor = client.distributors;
  client.payment = client.payments;
  client.stand = client.stands;

  return client;
}

// Force recreation of Prisma client if PRISMA_FORCE_RECREATE is set
// This helps when enum types change and the dev server needs to reload
const shouldForceRecreate = process.env.PRISMA_FORCE_RECREATE === 'true';
if (shouldForceRecreate && globalForPrisma.prisma) {
  console.log('Forcing Prisma client recreation...');
  // Disconnect existing client asynchronously (don't await to avoid blocking)
  globalForPrisma.prisma.$disconnect().catch(() => {
    // Ignore disconnect errors
  });
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Note: Database logging is handled at the service layer via BaseService.logOperation()
// This provides better control and context-specific logging without relying on
// Prisma middleware which may not be available with custom client generators.

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
