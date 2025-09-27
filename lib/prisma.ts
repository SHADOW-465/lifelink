import { PrismaClient } from "@prisma/client"

// This declaration extends the global namespace to include a 'prisma' property.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Instantiate the PrismaClient.
// In development, we store the client on the 'globalThis' object.
// This prevents hot-reloading from creating new PrismaClient instances on every change,
// which would quickly exhaust database connections.
// In production, a new client is created.
export const prisma =
  global.prisma ||
  new PrismaClient({
    // Optional: log database queries for debugging purposes
    // log: ["query", "info", "warn", "error"],
  })

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma
}