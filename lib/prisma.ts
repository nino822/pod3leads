import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getPrismaDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  const lower = rawUrl.toLowerCase();
  const isPostgres =
    lower.startsWith('postgres://') ||
    lower.startsWith('postgresql://');

  if (!isPostgres) return rawUrl;

  try {
    const url = new URL(rawUrl);

    // Avoid prepared statement collisions when using pooled PostgreSQL connections.
    if (!url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true');
    }

    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '1');
    }

    return url.toString();
  } catch {
    // Fall back to the original URL if parsing fails.
    return rawUrl;
  }
}

const prismaDatasourceUrl = getPrismaDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: prismaDatasourceUrl
      ? {
          db: {
            url: prismaDatasourceUrl,
          },
        }
      : undefined,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
