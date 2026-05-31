import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, movieSlug, episodeSlug, serverName, progress, duration } = body;

    if (!profileId || !movieSlug) {
      return Response.json(
        { error: 'profileId và movieSlug là bắt buộc.' },
        { status: 400 }
      );
    }

    if (typeof progress === 'number' && progress < 0) {
      return Response.json({ error: 'progress phải >= 0.' }, { status: 400 });
    }

    if (typeof duration === 'number' && duration < 0) {
      return Response.json({ error: 'duration phải >= 0.' }, { status: 400 });
    }

    // Validate profile exists
    const profile = await prisma.profile.findUnique({ where: { id: profileId } });
    if (!profile) {
      return Response.json({ error: 'Profile không tồn tại.' }, { status: 404 });
    }

    // Validate movie exists
    const movie = await prisma.movie.findUnique({ where: { slug: movieSlug } });
    if (!movie) {
      return Response.json({ error: 'Movie không tồn tại.' }, { status: 404 });
    }

    await prisma.watchHistory.upsert({
      where: { profileId_movieSlug: { profileId, movieSlug } },
      create: {
        profileId,
        movieSlug,
        episodeSlug: episodeSlug || null,
        serverName: serverName || null,
        progress: typeof progress === 'number' ? Math.floor(progress) : null,
        duration: typeof duration === 'number' ? Math.floor(duration) : null,
      },
      update: {
        episodeSlug: episodeSlug || undefined,
        serverName: serverName || undefined,
        progress: typeof progress === 'number' ? Math.floor(progress) : undefined,
        duration: typeof duration === 'number' ? Math.floor(duration) : undefined,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('History upsert error:', error);
    return Response.json({ error: 'Lỗi server.' }, { status: 500 });
  }
}
