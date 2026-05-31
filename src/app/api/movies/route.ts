import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const collectionSlug = searchParams.get('collection');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const skip = (page - 1) * limit;

  if (collectionSlug) {
    const movies = await prisma.movie.findMany({
      where: {
        collections: {
          some: {
            collection: {
              slug: collectionSlug,
            },
          },
        },
      },
      include: {
        collections: {
          where: {
            collection: { slug: collectionSlug },
          },
          select: { position: true, page: true },
        },
        episodes: {
          select: { id: true },
        },
        tags: {
          include: {
            tag: {
              include: { group: true },
            },
          },
        },
      },
    });

    movies.sort((a, b) => {
      const posA = a.collections[0]?.position ?? 9999;
      const posB = b.collections[0]?.position ?? 9999;
      return posA - posB;
    });

    const total = movies.length;
    const paged = movies.slice(skip, skip + limit);

    const formatted = paged.map((m) => ({
      slug: m.slug,
      name: m.name,
      originalName: m.originalName,
      thumbUrl: m.thumbUrl,
      posterUrl: m.posterUrl,
      description: m.description,
      totalEpisodes: m.totalEpisodes,
      currentEpisode: m.currentEpisode,
      time: m.time,
      quality: m.quality,
      language: m.language,
      director: m.director,
      casts: m.casts,
      episodeCount: m.episodes.length,
      tags: m.tags.map((mt) => ({
        name: mt.tag.name,
        group: mt.tag.group.name,
      })),
      position: m.collections[0]?.position ?? null,
    }));

    return Response.json({ movies: formatted, total, page, limit });
  }

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      orderBy: { sourceModifiedAt: 'desc' },
      include: {
        episodes: {
          select: { id: true },
        },
        tags: {
          include: {
            tag: {
              include: { group: true },
            },
          },
        },
      },
      skip,
      take: limit,
    }),
    prisma.movie.count(),
  ]);

  const formatted = movies.map((m) => ({
    slug: m.slug,
    name: m.name,
    originalName: m.originalName,
    thumbUrl: m.thumbUrl,
    posterUrl: m.posterUrl,
    description: m.description,
    totalEpisodes: m.totalEpisodes,
    currentEpisode: m.currentEpisode,
    time: m.time,
    quality: m.quality,
    language: m.language,
    director: m.director,
    casts: m.casts,
    episodeCount: m.episodes.length,
    tags: m.tags.map((mt) => ({
      name: mt.tag.name,
      group: mt.tag.group.name,
    })),
  }));

  return Response.json({ movies: formatted, total, page, limit });
}
