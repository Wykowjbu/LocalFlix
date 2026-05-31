import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profileId');

  if (!profileId) {
    return Response.json({ error: 'profileId là bắt buộc.' }, { status: 400 });
  }

  // Validate profile exists
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    return Response.json({ error: 'Profile không tồn tại.' }, { status: 404 });
  }

  const [favorites, reactions, history] = await Promise.all([
    prisma.favorite.findMany({
      where: { profileId },
      select: { movieSlug: true },
    }),
    prisma.reaction.findMany({
      where: { profileId },
      select: { movieSlug: true, value: true },
    }),
    prisma.watchHistory.findMany({
      where: { profileId },
      orderBy: { updatedAt: 'desc' },
      select: {
        movieSlug: true,
        episodeSlug: true,
        serverName: true,
        progress: true,
        duration: true,
        updatedAt: true,
      },
    }),
  ]);

  return Response.json({
    favoriteSlugs: favorites.map((f) => f.movieSlug),
    likedSlugs: reactions.filter((r) => r.value === 'like').map((r) => r.movieSlug),
    dislikedSlugs: reactions.filter((r) => r.value === 'dislike').map((r) => r.movieSlug),
    history,
  });
}
