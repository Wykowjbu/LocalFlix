import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { movieSlug, episodeSlug, serverName } = Object.fromEntries(
    request.nextUrl.searchParams
  );

  if (!movieSlug) {
    return Response.json({ error: 'Thiếu movieSlug' }, { status: 400 });
  }

  // Get all episodes for this movie
  const movie = await prisma.movie.findUnique({
    where: { slug: movieSlug },
    select: {
      totalEpisodes: true,
      episodes: {
        where: serverName ? { serverName } : {},
        orderBy: { slug: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          serverName: true,
        },
      },
    },
  });

  if (!movie) {
    return Response.json({ error: 'Không tìm thấy phim' }, { status: 404 });
  }

  // For single-episode movies (phim le), no next episode
  if (movie.totalEpisodes !== null && movie.totalEpisodes <= 1) {
    return Response.json({ nextEpisode: null, hasNext: false, reason: 'single_episode' });
  }

  if (movie.episodes.length === 0) {
    return Response.json({ nextEpisode: null, hasNext: false, reason: 'no_episodes' });
  }

  if (movie.episodes.length <= 1) {
    return Response.json({ nextEpisode: null, hasNext: false, reason: 'single_episode' });
  }

  // If no specific episode, return the first episode as "next"
  if (!episodeSlug) {
    return Response.json({
      nextEpisode: movie.episodes[0],
      hasNext: true,
      reason: 'first_episode',
    });
  }

  // Find current episode index
  const currentIndex = movie.episodes.findIndex((ep) => ep.slug === episodeSlug);
  if (currentIndex === -1) {
    return Response.json({ nextEpisode: null, hasNext: false, reason: 'episode_not_found' });
  }

  // Return next episode if available
  const nextIndex = currentIndex + 1;
  if (nextIndex >= movie.episodes.length) {
    return Response.json({ nextEpisode: null, hasNext: false, reason: 'last_episode' });
  }

  return Response.json({
    nextEpisode: movie.episodes[nextIndex],
    hasNext: true,
    reason: 'available',
  });
}
