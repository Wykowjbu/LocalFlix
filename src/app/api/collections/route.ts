import { prisma } from '@/lib/db';

export async function GET() {
  const collections = await prisma.collection.findMany({
    include: {
      _count: {
        select: { movies: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const formatted = collections.map((c) => ({
    slug: c.slug,
    name: c.name,
    movieCount: c._count.movies,
    lastSyncedAt: c.lastSyncedAt,
  }));

  return Response.json({ collections: formatted });
}
