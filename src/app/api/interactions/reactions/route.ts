import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, movieSlug, value } = body;

    if (!profileId || !movieSlug) {
      return Response.json(
        { error: 'profileId và movieSlug là bắt buộc.' },
        { status: 400 }
      );
    }

    if (value !== null && value !== 'like' && value !== 'dislike') {
      return Response.json(
        { error: 'value phải là "like", "dislike", hoặc null.' },
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

    if (value) {
      await prisma.reaction.upsert({
        where: { profileId_movieSlug: { profileId, movieSlug } },
        create: { profileId, movieSlug, value },
        update: { value },
      });
    } else {
      await prisma.reaction.deleteMany({
        where: { profileId, movieSlug },
      });
    }

    return Response.json({ reaction: value || null });
  } catch (error) {
    console.error('Reaction set error:', error);
    return Response.json({ error: 'Lỗi server.' }, { status: 500 });
  }
}
