import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __repopulse_prisma__: PrismaClient | undefined;
}

/**
 * Creates or retrieves a singleton PrismaClient instance.
 * Defaults to SQLite stored in `.repopulse/data.db` if DATABASE_URL is not set.
 */
export function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient();
  }

  if (!global.__repopulse_prisma__) {
    // Default fallback to local SQLite database file
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = 'file:./.repopulse/data.db';
    }
    global.__repopulse_prisma__ = new PrismaClient();
  }

  return global.__repopulse_prisma__;
}

export * from '@prisma/client';
