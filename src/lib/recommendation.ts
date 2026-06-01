import { prisma } from './db';

type RowMovie = {
  slug: string;
  name: string;
  originalName: string | null;
  thumbUrl: string | null;
  posterUrl: string | null;
  time: string | null;
  quality: string | null;
  tags: { name: string; group: string }[];
  progress?: number | null;
  duration?: number | null;
  episodeSlug?: string | null;
  serverName?: string | null;
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

const HOME_MOVIE_SELECT = {
  slug: true, name: true, originalName: true,
  thumbUrl: true, posterUrl: true, time: true, quality: true,
  tags: { select: { tag: { select: { name: true, group: { select: { name: true } } } } } },
} as const;

function formatMovie(m: {
  slug: string; name: string; originalName: string | null;
  thumbUrl: string | null; posterUrl: string | null;
  time: string | null; quality: string | null;
  tags: Array<{ tag: { name: string; group: { name: string } } }>;
}): RowMovie {
  return {
    slug: m.slug, name: m.name, originalName: m.originalName,
    thumbUrl: m.thumbUrl, posterUrl: m.posterUrl,
    time: m.time, quality: m.quality,
    tags: m.tags.map((mt) => ({ name: mt.tag.name, group: mt.tag.group.name })),
  };
}

function isUnwatched(movieSlug: string, watchedSlugs: Set<string>): boolean {
  return !watchedSlugs.has(movieSlug);
}

export async function getHomeRows(profileId?: string | null): Promise<HomeRow[]> {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) console.time('getHomeRows');
  const rows: HomeRow[] = [];
  const seenSlugs = new Set<string>();
  const watchedSlugs = new Set<string>();

  function addUnique(slugs: string[]) { for (const s of slugs) seenSlugs.add(s); }
  function dedupe(movies: RowMovie[]): RowMovie[] {
    return movies.filter((m) => {
      if (seenSlugs.has(m.slug)) return false;
      seenSlugs.add(m.slug);
      return true;
    });
  }

  const { getCurrentWeekLabel } = await import('./top10-utils');
  const weekLabel = getCurrentWeekLabel();

  // ============ Phase 1: All independent queries ============
  // Wrap each with .catch() so one missing table doesn't crash the whole page
  const historyPromise = profileId
    ? prisma.watchHistory.findMany({
        where: { profileId },
        select: { movieSlug: true, progress: true, duration: true, episodeSlug: true, serverName: true },
        orderBy: { updatedAt: 'desc' },
      }).catch(() => [])
    : Promise.resolve([]);

  const favoritesPromise = profileId
    ? prisma.favorite.findMany({
        where: { profileId }, select: { movieSlug: true },
      }).catch(() => [])
    : Promise.resolve([]);

  const reactionsPromise = profileId
    ? prisma.reaction.findMany({
        where: { profileId, value: 'like' }, select: { movieSlug: true },
      }).catch(() => [])
    : Promise.resolve([]);

  const continueWatchingPromise = profileId
    ? prisma.watchHistory.findMany({
        where: { profileId, progress: { gt: 0 } },
        orderBy: { updatedAt: 'desc' }, take: 20,
        include: { movie: { select: HOME_MOVIE_SELECT } },
      }).catch(() => [])
    : Promise.resolve([]);

  const top10Promise = prisma.netflixTop10.findMany({
    where: { country: 'vietnam', weekLabel },
    orderBy: [{ type: 'asc' }, { rank: 'asc' }],
    include: { matchedMovie: { select: HOME_MOVIE_SELECT } },
  }).catch(() => []);

  const newMoviesPromise = prisma.movie.findMany({
    orderBy: { updatedAt: 'desc' }, take: 20,
    select: HOME_MOVIE_SELECT,
  }).catch(() => []);

  const watchedSeriesPromise = profileId
    ? prisma.watchHistory.findMany({
        where: { profileId, movie: { totalEpisodes: { gt: 1 } } },
        select: { movieSlug: true }, distinct: ['movieSlug'], take: 5,
      }).catch(() => [])
    : Promise.resolve([]);

  const myListPromise = profileId
    ? prisma.favorite.findMany({
        where: { profileId }, orderBy: { createdAt: 'desc' }, take: 20,
        include: { movie: { select: HOME_MOVIE_SELECT } },
      }).catch(() => [])
    : Promise.resolve([]);

  const [history, favorites, reactions, historyRows, top10Entries, newMovies, watchedSeries, myList] =
    await Promise.all([
      historyPromise, favoritesPromise, reactionsPromise,
      continueWatchingPromise, top10Promise, newMoviesPromise,
      watchedSeriesPromise, myListPromise,
    ]);

  // Process Phase 1 results
  for (const h of history) watchedSlugs.add(h.movieSlug);
  const lastWatchedSlug = history.length > 0 ? history[0].movieSlug : null;

  const likedSlugs = new Set([
    ...favorites.map((f) => f.movieSlug),
    ...reactions.map((r) => r.movieSlug),
  ]);

  // ============ Phase 2: Depends on Phase 1 ============
  const genreAnalysisPromise = likedSlugs.size > 0
    ? prisma.movie.findMany({
        where: { slug: { in: [...likedSlugs] } },
        select: { tags: { select: { tag: { select: { name: true, group: { select: { name: true } } } } } } },
      }).then((movies) => {
        const genreCount: Record<string, number> = {};
        for (const movie of movies) {
          for (const mt of movie.tags) {
            if (mt.tag.group.name === 'Thể loại') {
              genreCount[mt.tag.name] = (genreCount[mt.tag.name] || 0) + 1;
            }
          }
        }
        return genreCount;
      }).catch(() => ({} as Record<string, number>))
    : Promise.resolve({} as Record<string, number>);

  const lastWatchedPromise = lastWatchedSlug
    ? prisma.movie.findUnique({
        where: { slug: lastWatchedSlug },
        select: HOME_MOVIE_SELECT,
      }).catch(() => null)
    : Promise.resolve(null);

  const moreSeriesPromise = (profileId && watchedSeries.length > 0)
    ? (() => {
        const seriesSlugs = watchedSeries.map((w) => w.movieSlug);
        return prisma.movie.findMany({
          where: {
            totalEpisodes: { gt: 1 },
            slug: { notIn: [...seriesSlugs] },
            tags: { some: { tag: { movies: { some: { movieSlug: { in: seriesSlugs } } } } } },
          },
          select: HOME_MOVIE_SELECT, take: 20,
        }).catch(() => []);
      })()
    : Promise.resolve([]);

  const [profileGenreCount, lastWatchedMovie, moreSeries] = await Promise.all([
    genreAnalysisPromise, lastWatchedPromise, moreSeriesPromise,
  ]);

  // ============ Phase 3: Depends on Phase 2 ============
  const topGenre = Object.entries(profileGenreCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  const similarMoviesPromise = lastWatchedMovie
    ? (() => {
        const genreTags = lastWatchedMovie.tags
          .filter((mt) => mt.tag.group.name === 'Thể loại')
          .map((mt) => mt.tag.name);
        if (genreTags.length === 0) return Promise.resolve([]);
        return prisma.movie.findMany({
          where: {
            slug: { not: lastWatchedSlug! },
            tags: { some: { tag: { name: { in: genreTags } } } },
          },
          select: HOME_MOVIE_SELECT, take: 20,
        }).catch(() => []);
      })()
    : Promise.resolve([]);

  const genreMoviesPromise = topGenre
    ? prisma.movie.findMany({
        where: { tags: { some: { tag: { name: topGenre, group: { name: 'Thể loại' } } } } },
        select: HOME_MOVIE_SELECT, take: 20,
      }).catch(() => [])
    : Promise.resolve([]);

  const [similarMovies, genreMovies] = await Promise.all([similarMoviesPromise, genreMoviesPromise]);

  // ============ Build rows sequentially with dedup ============
  // Row 1: Continue Watching
  if (historyRows.length > 0) {
    const continueMovies: RowMovie[] = historyRows.filter((h) => h.movie).map((h) => ({
      ...formatMovie(h.movie!),
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

  // Rows 2-3: Top 10
  if (top10Entries.length > 0) {
    const buildTop10 = (type: 'movie' | 'tv', title: string) => {
      const entries = top10Entries.filter((e) => e.type === type);
      if (entries.length === 0) return;
      const movies: RowMovie[] = entries.map((e) => {
        if (e.matchedMovie) {
          return { ...formatMovie(e.matchedMovie), top10Rank: e.rank, top10MatchStatus: e.matchStatus };
        }
        return {
          slug: e.netflixTitle, name: e.netflixTitle, originalName: null,
          thumbUrl: e.imageUrl || null, posterUrl: e.imageUrl || null,
          time: null, quality: null, tags: [],
          top10Rank: e.rank, top10ImageUrl: e.imageUrl,
          top10NetflixUrl: e.netflixUrl, top10MatchStatus: e.matchStatus,
        };
      });
      const deduped = dedupe(movies);
      if (deduped.length > 0) {
        rows.push({ id: `top10-${type}`, title, variant: 'top10', movies: deduped });
      }
    };
    buildTop10('movie', 'Top 10 Phim tại Việt Nam hôm nay');
    buildTop10('tv', 'Top 10 TV tại Việt Nam hôm nay');
  }

  // Row 4: "Vì bạn đã xem..."
  if (lastWatchedMovie) {
    const genreTags = lastWatchedMovie.tags
      .filter((mt) => mt.tag.group.name === 'Thể loại')
      .map((mt) => mt.tag.name);
    const filtered = genreTags.length > 0
      ? similarMovies.filter((m) => isUnwatched(m.slug, watchedSlugs))
      : [];
    if (filtered.length > 0) {
      rows.push({
        id: 'because-you-watched',
        title: `Vì bạn đã xem ${lastWatchedMovie.name}`,
        movies: dedupe(filtered.map((m) => formatMovie(m))),
      });
    }
  }

  // Row 5: Top genre recommendations
  if (topGenre) {
    const filtered = genreMovies.filter((m) => isUnwatched(m.slug, watchedSlugs));
    if (filtered.length > 0) {
      rows.push({
        id: 'top-genre', title: `Phim ${topGenre} dành cho bạn`,
        movies: dedupe(filtered.map((m) => formatMovie(m))),
      });
    }
  }

  // Row 6: Newly updated movies
  if (newMovies.length > 0) {
    rows.push({
      id: 'new-updates', title: 'Phim mới cập nhật',
      movies: dedupe(newMovies.map((m) => formatMovie(m))),
    });
  }

  // Row 7: Series from watch history
  if (profileId && moreSeries.length > 0) {
    const filtered = moreSeries.filter((m) => isUnwatched(m.slug, watchedSlugs));
    if (filtered.length > 0) {
      rows.push({
        id: 'series-you-may-like', title: 'Phim bộ có thể bạn thích',
        movies: dedupe(filtered.map((m) => formatMovie(m))),
      });
    }
  }

  // Row 8: My List preview
  if (myList.length > 0) {
    const myListMovies = myList.filter((f) => f.movie).map((f) => formatMovie(f.movie!));
    if (myListMovies.length > 0) {
      rows.push({
        id: 'my-list', title: 'Danh sách của bạn',
        movies: dedupe(myListMovies),
      });
    }
  }

  if (isDev) console.timeEnd('getHomeRows');
  return rows;
}
