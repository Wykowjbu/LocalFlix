import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, movieSlug, enabled } = body;

    if (!profileId || !movieSlug || typeof enabled !== 'boolean') {
      return Response.json(
        { error: 'profileId, movieSlug (string) và enabled (boolean) là bắt buộc.' },
        { status: 400 }
      );
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

    if (enabled) {
      await prisma.favorite.upsert({
        where: { profileId_movieSlug: { profileId, movieSlug } },
        create: { profileId, movieSlug },
        update: {},
      });
    } else {
      await prisma.favorite.deleteMany({
        where: { profileId, movieSlug },
      });
    }

    return Response.json({ favorite: enabled });
  } catch (error) {
    console.error('Favorite toggle error:', error);
    return Response.json({ error: 'Lỗi server.' }, { status: 500 });
  }
}
