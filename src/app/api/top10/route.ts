import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentWeekLabel } from '@/lib/top10-utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const week = searchParams.get('week') || getCurrentWeekLabel();
  const type = searchParams.get('type'); // 'movie' | 'tv' | undefined (both)
  const country = searchParams.get('country') || 'vietnam';

  const where: Record<string, unknown> = {
    country,
    weekLabel: week,
  };

  if (type === 'movie' || type === 'tv') {
    where.type = type;
  }

  const entries = await prisma.netflixTop10.findMany({
    where,
    orderBy: [
      { type: 'asc' },
      { rank: 'asc' },
    ],
    include: {
      matchedMovie: {
        select: {
          slug: true,
          name: true,
          originalName: true,
          thumbUrl: true,
          posterUrl: true,
        },
      },
    },
  });

  const grouped = {
    movie: entries.filter((e) => e.type === 'movie'),
    tv: entries.filter((e) => e.type === 'tv'),
  };

  return Response.json({
    week,
    country,
    entries,
    grouped,
    total: entries.length,
  });
}

export async function POST(request: NextRequest) {
  const { entryIds } = await request.json() as { entryIds?: string[] };

  if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
    return Response.json({ error: 'entryIds là bắt buộc.' }, { status: 400 });
  }

  // Re-match specific entries by ID
  const entries = await prisma.netflixTop10.findMany({
    where: {
      id: { in: entryIds },
      matchStatus: { in: ['pending', 'not_found'] },
    },
  });

  const updated: string[] = [];

  for (const entry of entries) {
    // Simple re-match by looking for exact normalized title match
    const match = await prisma.movie.findFirst({
      where: {
        OR: [
          { name: { contains: entry.netflixTitle } },
          { originalName: { contains: entry.netflixTitle } },
        ],
      },
      select: { slug: true },
    });

    if (match) {
      await prisma.netflixTop10.update({
        where: { id: entry.id },
        data: {
          matchedMovieSlug: match.slug,
          matchStatus: 'matched',
        },
      });
      updated.push(entry.id);
    }
  }

  return Response.json({
    success: true,
    reMatched: updated.length,
    total: entries.length,
  });
}
