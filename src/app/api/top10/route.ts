import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentWeekLabel } from '@/lib/top10-utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userProvidedWeek = searchParams.get('week');
  const type = searchParams.get('type'); // 'movie' | 'tv' | undefined (both)
  const country = searchParams.get('country') || 'vietnam';

  let week = userProvidedWeek || getCurrentWeekLabel();
  let usedFallbackWeek = false;

  const buildWhere = (w: string) => {
    const wObj: Record<string, unknown> = { country, weekLabel: w };
    if (type === 'movie' || type === 'tv') wObj.type = type;
    return wObj;
  };

  let entries = await prisma.netflixTop10.findMany({
    where: buildWhere(week),
    orderBy: [{ type: 'asc' }, { rank: 'asc' }],
    include: {
      matchedMovie: {
        select: { slug: true, name: true, originalName: true, thumbUrl: true, posterUrl: true },
      },
    },
  });

  // Fallback: if current week has no data and no explicit week was requested, find latest available week
  if (entries.length === 0 && !userProvidedWeek) {
    const latest = await prisma.netflixTop10.findFirst({
      where: { country },
      orderBy: { weekLabel: 'desc' },
      select: { weekLabel: true },
    });
    if (latest && latest.weekLabel !== week) {
      week = latest.weekLabel;
      usedFallbackWeek = true;
      entries = await prisma.netflixTop10.findMany({
        where: buildWhere(week),
        orderBy: [{ type: 'asc' }, { rank: 'asc' }],
        include: {
          matchedMovie: {
            select: { slug: true, name: true, originalName: true, thumbUrl: true, posterUrl: true },
          },
        },
      });
    }
  }

  const grouped = {
    movie: entries.filter((e) => e.type === 'movie'),
    tv: entries.filter((e) => e.type === 'tv'),
  };

  const response: Record<string, unknown> = {
    week,
    country,
    entries,
    grouped,
    total: entries.length,
  };
  if (usedFallbackWeek) {
    response.requestedWeek = userProvidedWeek || getCurrentWeekLabel();
    response.usedFallbackWeek = true;
  }

  return Response.json(response);
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
