import 'server-only';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Note: Database logging is handled at the service layer via BaseService.logOperation()
// This provides better control and context-specific logging without relying on
// Prisma middleware which may not be available with custom client generators.

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
