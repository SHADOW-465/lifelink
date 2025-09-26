import { PrismaClient } from '@prisma/client';

// In a serverless environment like Vercel, it's important to instantiate a single
// PrismaClient instance and re-use it across function invocations.
// This prevents the application from exhausting the database connection limit.

// Add prisma to the NodeJS global type
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export default prisma;