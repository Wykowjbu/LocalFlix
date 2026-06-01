import type { Movie } from '@/data/netflix';

export type DbMovieTag = {
  name: string;
  group: string;
  slug: string;
};

export type DbMovie = {
  slug: string;
  name: string;
  originalName?: string | null;
  posterUrl?: string | null;
  thumbUrl?: string | null;
  description?: string | null;
  time?: string | null;
  quality?: string | null;
  language?: string | null;
  director?: string | null;
  casts?: string | null;
  totalEpisodes?: number | null;
  currentEpisode?: string | null;
  tags?: DbMovieTag[];
  episodeCount?: number;
  // Fields from history mode
  progress?: number | null;
  duration?: number | null;
  episodeSlug?: string | null;
  serverName?: string | null;
  // Fields from Top 10
  top10Rank?: number;
  top10ImageUrl?: string | null;
  top10NetflixUrl?: string | null;
  top10MatchStatus?: string;
};

export type DbEpisode = {
  id: string;
  name: string;
  slug: string;
  serverName: string;
  embedUrl: string | null;
  m3u8Url: string | null;
};

export type DbMovieDetail = DbMovie & {
  episodes?: DbEpisode[];
};

function isUnsafeImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    // Domains not configured in next.config — would crash next/image
    return host === 'dnm.nflximg.net';
  } catch { return false; }
}

export function mapDbMovie(movie: DbMovie): Movie {
  const genreTags = movie.tags?.filter((tag) => tag.group === 'Thể loại') || [];
  const rawImage = movie.posterUrl || movie.thumbUrl;
  const image = (!rawImage || isUnsafeImageUrl(rawImage)) ? '/placeholder.jpg' : rawImage;
  return {
    id: movie.slug,
    title: movie.name,
    image,
    match: 85,
    maturity: 'T16',
    duration: movie.time || '45 phút',
    quality: movie.quality || 'HD',
    genres: genreTags.map((tag) => tag.name),
    genreSlugs: genreTags.reduce((acc, tag) => { acc[tag.name] = tag.slug; return acc; }, {} as Record<string, string>),
    isNew: false,
    progress: movie.progress ?? null,
    watchDuration: movie.duration ?? null,
    episodeSlug: movie.episodeSlug ?? null,
    serverName: movie.serverName ?? null,
    episodeLabel: movie.episodeSlug ? `Tập ${movie.episodeSlug}` : undefined,
    top10Rank: movie.top10Rank,
    top10ImageUrl: movie.top10ImageUrl ?? null,
    top10NetflixUrl: movie.top10NetflixUrl ?? null,
    top10MatchStatus: movie.top10MatchStatus,
  };
}
