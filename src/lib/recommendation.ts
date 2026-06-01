import { prisma } from './db';

type RowMovie = {
  slug: string;
  name: string;
  originalName: string | null;
  thumbUrl: string | null;
  posterUrl: string | null;
  description: string | null;
  totalEpisodes: number | null;
  time: string | null;
  quality: string | null;
  tags: { name: string; group: string }[];
  // History fields
  progress?: number | null;
  duration?: number | null;
  episodeSlug?: string | null;
  serverName?: string | null;
  // Top 10 fields
  top10Rank?: number;
  top10ImageUrl?: string | null;
  top10NetflixUrl?: string | null;
  top10MatchStatus?: string;
};

type HomeRow = {
  id: string;
  title: string;
  variant?: 'top10' | 'standard';
  movies: RowMovie[];
};

function formatMovie(m: Record<string, unknown>) {
  return {
    slug: m.slug as string,
    name: m.name as string,
    originalName: (m.originalName as string) || null,
    thumbUrl: (m.thumbUrl as string) || null,
    posterUrl: (m.posterUrl as string) || null,
    description: (m.description as string) || null,
    totalEpisodes: (m.totalEpisodes as number) || null,
    time: (m.time as string) || null,
    quality: (m.quality as string) || null,
    tags: ((m.tags as { tag: { name: string; group: { name: string } } }[]) ?? []).map(
      (mt: { tag: { name: string; group: { name: string } } }) => ({
        name: mt.tag.name,
        group: mt.tag.group.name,
      })
    ),
  };
}

function isUnwatched(movieSlug: string, watchedSlugs: Set<string>): boolean {
  return !watchedSlugs.has(movieSlug);
}

export async function getHomeRows(profileId?: string | null): Promise<HomeRow[]> {
  const rows: HomeRow[] = [];
  const seenSlugs = new Set<string>();

  function addUnique(slugs: string[]) {
    for (const s of slugs) seenSlugs.add(s);
  }

  function dedupe(movies: RowMovie[]): RowMovie[] {
    return movies.filter((m) => {
      if (seenSlugs.has(m.slug)) return false;
      seenSlugs.add(m.slug);
      return true;
    });
  }

  const watchedSlugs = new Set<string>();
  let profileGenreCount: Record<string, number> = {};
  let profileCountryCount: Record<string, number> = {};
  let lastWatchedSlug: string | null = null;

  if (profileId) {
    // Load interactions
    const [history, favorites, reactions] = await Promise.all([
      prisma.watchHistory.findMany({
        where: { profileId },
        select: { movieSlug: true, progress: true, duration: true, episodeSlug: true, serverName: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.favorite.findMany({
        where: { profileId },
        select: { movieSlug: true },
      }),
      prisma.reaction.findMany({
        where: { profileId, value: 'like' },
        select: { movieSlug: true },
      }),
    ]);

    for (const h of history) {
      watchedSlugs.add(h.movieSlug);
    }
    if (history.length > 0) {
      lastWatchedSlug = history[0].movieSlug;
    }

    // Count genres from liked/favorited movies
    const likedSlugs = new Set([
      ...favorites.map((f) => f.movieSlug),
      ...reactions.map((r) => r.movieSlug),
    ]);

    if (likedSlugs.size > 0) {
      const likedMovies = await prisma.movie.findMany({
        where: { slug: { in: [...likedSlugs] } },
        include: {
          tags: { include: { tag: { include: { group: true } } } },
        },
      });

      for (const movie of likedMovies) {
        for (const mt of movie.tags) {
          if (mt.tag.group.name === 'Thể loại') {
            profileGenreCount[mt.tag.name] = (profileGenreCount[mt.tag.name] || 0) + 1;
          }
          if (mt.tag.group.name === 'Quốc gia') {
            profileCountryCount[mt.tag.name] = (profileCountryCount[mt.tag.name] || 0) + 1;
          }
        }
      }
    }
  }

  // Row 1: Continue Watching
  if (profileId) {
    const historyRows = await prisma.watchHistory.findMany({
      where: { profileId, progress: { gt: 0 } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        movie: {
          include: {
            tags: { include: { tag: { include: { group: true } } } },
          },
        },
      },
    });

    const continueMovies: RowMovie[] = historyRows
      .filter((h) => h.movie)
      .map((h) => ({
        ...formatMovie(h.movie as unknown as Record<string, unknown>),
        progress: h.progress,
        duration: h.duration,
        episodeSlug: h.episodeSlug,
        serverName: h.serverName,
      }));

    if (continueMovies.length > 0) {
      rows.push({ id: 'continue-watching', title: 'Tiếp tục xem', movies: continueMovies });
      addUnique(continueMovies.map((m) => m.slug));
    }
  }

  // Row 2-3: Top 10 movies & TV
  const { getCurrentWeekLabel } = await import('./top10-utils');
  const weekLabel = getCurrentWeekLabel();

  const top10Entries = await prisma.netflixTop10.findMany({
    where: { country: 'vietnam', weekLabel },
    orderBy: [{ type: 'asc' }, { rank: 'asc' }],
    include: {
      matchedMovie: {
        include: { tags: { include: { tag: { include: { group: true } } } } },
      },
    },
  });

  const top10Movies: RowMovie[] = top10Entries
    .filter((e) => e.type === 'movie')
    .map((e) => {
      if (e.matchedMovie) {
        return {
          ...formatMovie(e.matchedMovie as unknown as Record<string, unknown>),
          top10Rank: e.rank,
          top10MatchStatus: e.matchStatus,
        };
      }
      return {
        slug: e.netflixTitle,
        name: e.netflixTitle,
        originalName: null,
        thumbUrl: e.imageUrl || null,
        posterUrl: e.imageUrl || null,
        description: null,
        totalEpisodes: null,
        time: null,
        quality: null,
        tags: [],
        top10Rank: e.rank,
        top10ImageUrl: e.imageUrl,
        top10NetflixUrl: e.netflixUrl,
        top10MatchStatus: e.matchStatus,
      };
    });

  if (top10Movies.length > 0) {
    rows.push({
      id: 'top10-movies',
      title: 'Top 10 Phim tại Việt Nam hôm nay',
      variant: 'top10',
      movies: dedupe(top10Movies),
    });
  }

  const top10Tv: RowMovie[] = top10Entries
    .filter((e) => e.type === 'tv')
    .map((e) => {
      if (e.matchedMovie) {
        return {
          ...formatMovie(e.matchedMovie as unknown as Record<string, unknown>),
          top10Rank: e.rank,
          top10MatchStatus: e.matchStatus,
        };
      }
      return {
        slug: e.netflixTitle,
        name: e.netflixTitle,
        originalName: null,
        thumbUrl: e.imageUrl || null,
        posterUrl: e.imageUrl || null,
        description: null,
        totalEpisodes: null,
        time: null,
        quality: null,
        tags: [],
        top10Rank: e.rank,
        top10ImageUrl: e.imageUrl,
        top10NetflixUrl: e.netflixUrl,
        top10MatchStatus: e.matchStatus,
      };
    });

  if (top10Tv.length > 0) {
    rows.push({
      id: 'top10-tv',
      title: 'Top 10 TV tại Việt Nam hôm nay',
      variant: 'top10',
      movies: dedupe(top10Tv),
    });
  }

  // Row 4: "Vì bạn đã xem [movie name]"
  if (lastWatchedSlug) {
    const lastWatched = await prisma.movie.findUnique({
      where: { slug: lastWatchedSlug },
      include: {
        tags: { include: { tag: { include: { group: true } } } },
        history: { where: { profileId: profileId || '' } },
      },
    });

    if (lastWatched) {
      const genreTags = lastWatched.tags
        .filter((mt) => mt.tag.group.name === 'Thể loại')
        .map((mt) => mt.tag.name);

      const similarMovies = await prisma.movie.findMany({
        where: {
          slug: { not: lastWatchedSlug },
          tags: {
            some: {
              tag: { name: { in: genreTags } },
            },
          },
        },
        include: {
          tags: { include: { tag: { include: { group: true } } } },
        },
        take: 20,
      });

      const filtered = similarMovies.filter((m) => isUnwatched(m.slug, watchedSlugs));
      if (filtered.length > 0) {
        rows.push({
          id: 'because-you-watched',
          title: `Vì bạn đã xem ${lastWatched.name}`,
          movies: dedupe(filtered.map((m) => formatMovie(m as unknown as Record<string, unknown>))),
        });
      }
    }
  }

  // Row 5: Top genre recommendations
  const topGenre = Object.entries(profileGenreCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topGenre) {
    const genreMovies = await prisma.movie.findMany({
      where: {
        tags: {
          some: {
            tag: { name: topGenre, group: { name: 'Thể loại' } },
          },
        },
      },
      include: {
        tags: { include: { tag: { include: { group: true } } } },
      },
      take: 20,
    });

    const filtered = genreMovies.filter((m) => isUnwatched(m.slug, watchedSlugs));
    if (filtered.length > 0) {
      rows.push({
        id: 'top-genre',
        title: `Phim ${topGenre} dành cho bạn`,
        movies: dedupe(filtered.map((m) => formatMovie(m as unknown as Record<string, unknown>))),
      });
    }
  }

  // Row 6: Newly updated movies
  const newMovies = await prisma.movie.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      tags: { include: { tag: { include: { group: true } } } },
    },
    take: 20,
  });

  rows.push({
    id: 'new-updates',
    title: 'Phim mới cập nhật',
    movies: dedupe(newMovies.map((m) => formatMovie(m as unknown as Record<string, unknown>))),
  });

  // Row 7: Series from watch history
  if (profileId) {
    const watchedSeries = await prisma.watchHistory.findMany({
      where: {
        profileId,
        movie: { totalEpisodes: { gt: 1 } },
      },
      select: { movieSlug: true },
      distinct: ['movieSlug'],
      take: 5,
    });

    if (watchedSeries.length > 0) {
      const seriesSlugs = watchedSeries.map((w) => w.movieSlug);
      const moreSeries = await prisma.movie.findMany({
        where: {
          totalEpisodes: { gt: 1 },
          slug: { notIn: [...seriesSlugs] },
          tags: {
            some: {
              tag: {
                movies: {
                  some: { movieSlug: { in: seriesSlugs } },
                },
              },
            },
          },
        },
        include: {
          tags: { include: { tag: { include: { group: true } } } },
        },
        take: 20,
      });

      const filtered = moreSeries.filter((m) => isUnwatched(m.slug, watchedSlugs));
      if (filtered.length > 0) {
        rows.push({
          id: 'series-you-may-like',
          title: 'Phim bộ có thể bạn thích',
          movies: dedupe(filtered.map((m) => formatMovie(m as unknown as Record<string, unknown>))),
        });
      }
    }
  }

  // Row 8: My List preview
  if (profileId) {
    const myList = await prisma.favorite.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        movie: {
          include: {
            tags: { include: { tag: { include: { group: true } } } },
          },
        },
      },
    });

    const myListMovies = myList
      .filter((f) => f.movie)
      .map((f) => formatMovie(f.movie as unknown as Record<string, unknown>));

    if (myListMovies.length > 0) {
      rows.push({
        id: 'my-list',
        title: 'Danh sách của bạn',
        movies: dedupe(myListMovies),
      });
    }
  }

  return rows;
}
