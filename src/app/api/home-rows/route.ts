import { NextRequest } from 'next/server';
import { getHomeRows } from '@/lib/recommendation';

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profileId');

  try {
    const rows = await getHomeRows(profileId);
    return Response.json({ rows });
  } catch (error) {
    console.error('Error generating home rows:', error);
    return Response.json({ rows: [], error: 'Failed to generate home rows' }, { status: 500 });
  }
}
