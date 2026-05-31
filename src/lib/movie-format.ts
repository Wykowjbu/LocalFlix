import type { Movie } from '@/data/netflix';

export type DbMovieTag = {
  name: string;
  group: string;
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

export function mapDbMovie(movie: DbMovie): Movie {
  return {
    id: movie.slug,
    title: movie.name,
    image: movie.posterUrl || movie.thumbUrl || '/placeholder.jpg',
    match: 85,
    maturity: 'T16',
    duration: movie.time || '45 phút',
    quality: movie.quality || 'HD',
    genres: movie.tags?.filter((tag) => tag.group === 'Thể loại').map((tag) => tag.name) || [],
    isNew: false,
  };
}
