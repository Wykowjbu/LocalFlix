import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeForSearch, tokenize, prepareMovie, scorePrepared } from '@/lib/search-scoring';

// Light select for list/search (no heavy fields)
const LIST_MOVIE_SELECT = {
  slug: true, name: true, originalName: true,
  thumbUrl: true, posterUrl: true, time: true, quality: true,
  tags: { select: { tag: { select: { name: true, slug: true, group: { select: { name: true } } } } } },
} as const;

// Full select for detail mode
const DETAIL_MOVIE_INCLUDE = {
  episodes: { select: { id: true } },
  tags: { include: { tag: { include: { group: true } } } },
} as const;

// Generate a URL-friendly slug from a tag name (for genre URLs)
function slugifyTagName(name: string): string {
  return normalizeForSearch(name).replace(/\s+/g, '-');
}

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
    tags: m.tags?.map((mt: { tag: { name: string; slug: string; group: { name: string } } }) => ({
      name: mt.tag.name,
      slug: slugifyTagName(mt.tag.name),
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

// Light formatter for search/list results (no heavy text fields)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatListMovie(m: any) {
  return {
    slug: m.slug,
    name: m.name,
    originalName: m.originalName,
    thumbUrl: m.thumbUrl,
    posterUrl: m.posterUrl,
    time: m.time,
    quality: m.quality,
    tags: m.tags?.map((mt: { tag: { name: string; slug: string; group: { name: string } } }) => ({
      name: mt.tag.name,
      slug: slugifyTagName(mt.tag.name),
      group: mt.tag.group.name,
    })) ?? [],
  };
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
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) console.time('/api/movies favorites');

    const favorites = await prisma.favorite.findMany({
      where: { profileId: favoritesProfileId },
      orderBy: { createdAt: 'desc' },
      select: {
        movie: {
          select: LIST_MOVIE_SELECT,
        },
      },
    });

    const movies = favorites.map((f) => formatListMovie(f.movie));

    if (isDev) {
      console.timeEnd('/api/movies favorites');
      console.log('  favorites count:', movies.length);
    }

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

  // ---- Genre / Tag filter ----
  const genre = searchParams.get('genre');
  if (genre) {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) console.time(`/api/movies genre=${genre}`);

    const normalizedSlug = slugifyTagName(genre);
    const tag = await prisma.tag.findFirst({
      where: { group: { name: 'Thể loại' }, slug: normalizedSlug },
    });

    if (!tag) {
      return Response.json({ error: `Genre '${genre}' not found` }, { status: 404 });
    }

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where: { tags: { some: { tagId: tag.id } } },
        select: LIST_MOVIE_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.movie.count({
        where: { tags: { some: { tagId: tag.id } } },
      }),
    ]);

    const formatted = movies.map((m) => formatListMovie(m));

    if (isDev) {
      console.timeEnd(`/api/movies genre=${genre}`);
      console.log(`  genre='${tag.name}' (${genre}) total:`, total);
    }

    return Response.json({ movies: formatted, genre: { name: tag.name, slug: tag.slug }, total, page, limit, hasMore: skip + limit < total });
  }

  // ---- Country / Tag filter ----
  const country = searchParams.get('country');
  if (country) {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) console.time(`/api/movies country=${country}`);

    const tag = await prisma.tag.findFirst({
      where: { group: { name: 'Quốc gia' }, slug: country },
    });

    if (!tag) {
      return Response.json({ error: `Country '${country}' not found` }, { status: 404 });
    }

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where: { tags: { some: { tagId: tag.id } } },
        select: LIST_MOVIE_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.movie.count({
        where: { tags: { some: { tagId: tag.id } } },
      }),
    ]);

    const formatted = movies.map((m) => formatListMovie(m));

    if (isDev) {
      console.timeEnd(`/api/movies country=${country}`);
      console.log(`  country='${tag.name}' (${country}) total:`, total);
    }

    return Response.json({ movies: formatted, country: { name: tag.name, slug: tag.slug }, total, page, limit, hasMore: skip + limit < total });
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

    return Response.json({ movies: formatted, total, page, limit, hasMore: skip + limit < total });
  }

  // ---- Search mode with DB pre-filter + lightweight scoring ----
    if (query) {
     const isDev = process.env.NODE_ENV === 'development';
     if (isDev) console.time('/api/movies search');

     const normalizedQuery = normalizeForSearch(query);
     const queryTokens = tokenize(query);

     if (queryTokens.length === 0) {
       return Response.json({ movies: [], total: 0, page, limit, hasMore: false });
     }

     // DB-level filter: match normalized tokens against searchText
     const dbFilter = queryTokens.length > 0
       ? { AND: queryTokens.map((t) => ({
           searchText: { contains: t },
         })) }
       : {};

     if (isDev) console.time('  db fetch');
     const candidates = await prisma.movie.findMany({
       where: dbFilter,
       take: 500,
       select: LIST_MOVIE_SELECT,
       orderBy: { updatedAt: 'desc' },
     });
     if (isDev) {
       console.timeEnd('  db fetch');
       console.log('  candidates before scoring:', candidates.length);
     }

    if (isDev) console.time('  scoring');
    const prepared = candidates.map(prepareMovie);
    const scored: Array<{ movie: typeof prepared[number]['movie']; score: number }> = [];

    for (const item of prepared) {
      const score = scorePrepared(item, normalizedQuery, queryTokens);
      if (score > 0) {
        scored.push({ movie: item.movie, score });
      }
    }
    if (isDev) console.timeEnd('  scoring');

    scored.sort((a, b) => b.score - a.score);

    const total = scored.length;
    const paged = scored.slice(skip, skip + limit);
    const formatted = paged.map((s) => formatListMovie(s.movie));
    const json = JSON.stringify({ movies: formatted, total, page, limit, hasMore: skip + limit < total });

    if (isDev) {
      console.timeEnd('/api/movies search');
      console.log('  matched:', total, '| response size:', json.length, 'bytes');
    }

    return new Response(json, { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // ---- Filter by type (phim-le / phim-bo) ----
  const type = searchParams.get('type');
  if (type === 'phim-le' || type === 'phim-bo') {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) console.time(`/api/movies type=${type}`);

    const isSeries = type === 'phim-bo';
    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where: { totalEpisodes: isSeries ? { gt: 1 } : { lte: 1 } },
        select: LIST_MOVIE_SELECT,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.movie.count({ where: { totalEpisodes: isSeries ? { gt: 1 } : { lte: 1 } } }),
    ]);

    const formatted = movies.map((m) => formatListMovie(m));

    if (isDev) {
      console.timeEnd(`/api/movies type=${type}`);
      console.log(`  type=${type} total:`, total);
    }

    return Response.json({ movies: formatted, total, page, limit, hasMore: skip + limit < total });
  }

  // ---- Sort by newest ----
  const sort = searchParams.get('sort');
  if (sort === 'newest') {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) console.time('/api/movies sort=newest');

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        orderBy: { updatedAt: 'desc' },
        select: LIST_MOVIE_SELECT,
        skip,
        take: limit,
      }),
      prisma.movie.count(),
    ]);

    const formatted = movies.map((m) => formatListMovie(m));

    if (isDev) {
      console.timeEnd('/api/movies sort=newest');
      console.log('  sort=newest total:', total);
    }

    return Response.json({ movies: formatted, total, page, limit, hasMore: skip + limit < total });
  }

  // ---- Default: all movies (paginated) ----
  const [movies, total] = await Promise.all([
    prisma.movie.findMany({
      orderBy: [{ lastSyncedAt: 'desc' }, { sourceModifiedAt: 'desc' }],
      select: LIST_MOVIE_SELECT,
      skip,
      take: limit,
    }),
    prisma.movie.count(),
  ]);

  const formatted = movies.map((m) => formatListMovie(m));
  return Response.json({ movies: formatted, total, page, limit, hasMore: skip + limit < total });
}
