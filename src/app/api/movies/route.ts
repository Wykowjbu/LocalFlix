import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeForSearch, tokenize, scoreMovie } from '@/lib/search-scoring';

// ============================================================
// Shared movie formatter
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatMovie(m: any, options?: { withEpisodes?: boolean }) {
  const base = {
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
    episodeCount: m.episodes?.length ?? 0,
    tags: m.tags?.map((mt: { tag: { name: string; group: { name: string } } }) => ({
      name: mt.tag.name,
      group: mt.tag.group.name,
    })) ?? [],
    position: m.collections?.[0]?.position ?? null,
  };

  if (options?.withEpisodes && m.episodes) {
    return {
      ...base,
      episodes: m.episodes.map((ep: { id: string; name: string; slug: string; serverName: string; embedUrl: string | null; m3u8Url: string | null }) => ({
        id: ep.id,
        name: ep.name,
        slug: ep.slug,
        serverName: ep.serverName,
        embedUrl: ep.embedUrl,
        m3u8Url: ep.m3u8Url,
      })),
    };
  }

  return base;
}

// ============================================================
// GET handler
// ============================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');
  const collectionSlug = searchParams.get('collection');
  const query = searchParams.get('q')?.trim();
  const withEpisodes = searchParams.get('withEpisodes') === 'true';
  const favoritesProfileId = searchParams.get('favoritesProfileId');
  const historyProfileId = searchParams.get('historyProfileId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const skip = (page - 1) * limit;

  // ---- Single movie by slug ----
  if (slug) {
    const movie = await prisma.movie.findUnique({
      where: { slug },
      include: {
        episodes: withEpisodes
          ? {
              select: {
                id: true,
                name: true,
                slug: true,
                serverName: true,
                embedUrl: true,
                m3u8Url: true,
              },
            }
          : { select: { id: true } },
        tags: {
          include: {
            tag: { include: { group: true } },
          },
        },
      },
    });

    if (!movie) {
      return Response.json({ error: 'Movie not found' }, { status: 404 });
    }

    return Response.json({ movie: formatMovie(movie, { withEpisodes }) });
  }

  // ---- My List (favorites) ----
  if (favoritesProfileId) {
    const favorites = await prisma.favorite.findMany({
      where: { profileId: favoritesProfileId },
      orderBy: { createdAt: 'desc' },
      include: {
        movie: {
          include: {
            episodes: { select: { id: true } },
            tags: { include: { tag: { include: { group: true } } } },
          },
        },
      },
    });

    const movies = favorites.map((f) => formatMovie(f.movie));
    return Response.json({ movies, total: movies.length, page: 1, limit: movies.length });
  }

  // ---- Continue Watching (history) ----
  if (historyProfileId) {
    const historyRows = await prisma.watchHistory.findMany({
      where: { profileId: historyProfileId },
      orderBy: { updatedAt: 'desc' },
      include: {
        movie: {
          include: {
            episodes: { select: { id: true } },
            tags: { include: { tag: { include: { group: true } } } },
          },
        },
      },
    });

    const movies = historyRows.map((h) => ({
      ...formatMovie(h.movie),
      progress: h.progress,
      duration: h.duration,
      episodeSlug: h.episodeSlug,
      serverName: h.serverName,
    }));
    return Response.json({ movies, total: movies.length, page: 1, limit: movies.length });
  }

  // ---- Collection mode ----
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
    const formatted = paged.map((m) => formatMovie(m));

    return Response.json({ movies: formatted, total, page, limit });
  }

  // ---- Search mode with normalized matching ----
  if (query) {
    const queryTokens = tokenize(query);
    const normalizedQuery = normalizeForSearch(query);

    if (queryTokens.length === 0) {
      return Response.json({ movies: [], total: 0, page, limit });
    }

    const candidates = await prisma.movie.findMany({
      include: {
        episodes: { select: { id: true } },
        tags: {
          include: {
            tag: { include: { group: true } },
          },
        },
      },
    });

    type ScoredMovie = { movie: typeof candidates[number]; score: number };
    const scored: ScoredMovie[] = [];

    for (const m of candidates) {
      const score = scoreMovie(m, normalizedQuery, queryTokens);
      if (score > 0) {
        scored.push({ movie: m, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    const total = scored.length;
    const paged = scored.slice(skip, skip + limit);
    const formatted = paged.map((s) => formatMovie(s.movie));

    return Response.json({ movies: formatted, total, page, limit });
  }

  // ---- Filter by type (phim-le / phim-bo) ----
  const type = searchParams.get('type');
  if (type === 'phim-le' || type === 'phim-bo') {
    const isSeries = type === 'phim-bo';
    const movies = await prisma.movie.findMany({
      where: {
        totalEpisodes: isSeries ? { gt: 1 } : { lte: 1 },
      },
      include: {
        episodes: { select: { id: true } },
        tags: { include: { tag: { include: { group: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.movie.count({
      where: {
        totalEpisodes: isSeries ? { gt: 1 } : { lte: 1 },
      },
    });

    const formatted = movies.map((m) => formatMovie(m));
    return Response.json({ movies: formatted, total, page, limit });
  }

  // ---- Sort by newest ----
  const sort = searchParams.get('sort');
  if (sort === 'newest') {
    const movies = await prisma.movie.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        episodes: { select: { id: true } },
        tags: { include: { tag: { include: { group: true } } } },
      },
      skip,
      take: limit,
    });

    const total = await prisma.movie.count();
    const formatted = movies.map((m) => formatMovie(m));
    return Response.json({ movies: formatted, total, page, limit });
  }

  // ---- Default: all movies ----
  const searchWhere = {};

  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      where: searchWhere,
      orderBy: [{ lastSyncedAt: 'desc' }, { sourceModifiedAt: 'desc' }],
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
    prisma.movie.count({ where: searchWhere }),
  ]);

  const formatted = movies.map((m) => formatMovie(m));

  return Response.json({ movies: formatted, total, page, limit });
}
