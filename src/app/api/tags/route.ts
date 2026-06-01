import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

const GROUP_SLUG_MAP: Record<string, string> = {
  'the-loai': 'Thể loại',
  'quoc-gia': 'Quốc gia',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const group = searchParams.get('group');

  if (!group || !GROUP_SLUG_MAP[group]) {
    return Response.json({ error: 'Invalid or missing group param' }, { status: 400 });
  }

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) console.time(`/api/tags group=${group}`);

  const groupName = GROUP_SLUG_MAP[group];

  const tags = await prisma.tag.findMany({
    where: { group: { name: groupName } },
    include: { _count: { select: { movies: true } } },
    orderBy: [{ movies: { _count: 'desc' } }, { name: 'asc' }],
  });

  const result = tags
    .filter((t) => t._count.movies > 0)
    .map((t) => ({ name: t.name, slug: t.slug, movieCount: t._count.movies }));

  if (isDev) {
    console.timeEnd(`/api/tags group=${group}`);
    console.log(`  returned: ${result.length}/${tags.length} tags with movies`);
  }

  return Response.json({ group: groupName, tags: result });
}
