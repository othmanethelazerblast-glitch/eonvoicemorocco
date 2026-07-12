import { PrismaClient } from "@prisma/client";

/** Reused across the api app to avoid exhausting Postgres connections on
 * hot-reload in dev. Row-Level Security policies (see prisma/rls.sql) are
 * the isolation backstop; this client alone does not scope tenants. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
