import { NextRequest } from 'next/server';
import { getHomeRows } from '@/lib/recommendation';

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profileId');
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) console.time('/api/home-rows');

  try {
    const rows = await getHomeRows(profileId);
    if (isDev) console.timeEnd('/api/home-rows');
    return Response.json({ rows });
  } catch (error) {
    if (isDev) console.timeEnd('/api/home-rows');
    console.error('Error generating home rows:', error);
    return Response.json({ rows: [], error: 'Failed to generate home rows' }, { status: 500 });
  }
}
