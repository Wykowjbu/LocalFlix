import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeForSearch } from '@/lib/search-scoring';
import { getCurrentWeekLabel } from '@/lib/top10-utils';
import { compareTwoStrings } from 'string-similarity';

type Top10Entry = {
  netflixTitle: string;
  normalizedTitle: string;
  rank: number;
  imageUrl?: string;
  netflixUrl?: string;
  netflixId?: string;
  matchedMovieSlug?: string | null;
  matchStatus?: string;
  matchScore?: number;
};

type ScrapeResult = {
  movie: Top10Entry[];
  tv: Top10Entry[];
};

async function scrapeTudum(): Promise<ScrapeResult | null> {
  try {
    const res = await fetch('https://top10.netflix.com/', {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html',
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Try to find __NEXT_DATA__ or JSON data in the page
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>({.*?})<\/script>/);
    if (nextDataMatch) {
      const data = JSON.parse(nextDataMatch[1]);
      // Extract top 10 data from the Next.js page props
      return extractFromNextData(data);
    }

    // Try to find a JSON endpoint the page uses
    const apiUrlMatch = html.match(/"(https:\/\/[^"]*top10[^"]*\.json)"/);
    if (apiUrlMatch) {
      const apiRes = await fetch(apiUrlMatch[1], { signal: AbortSignal.timeout(10000) });
      if (apiRes.ok) {
        const data = await apiRes.json();
        return extractFromApiJson(data);
      }
    }

    return null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromNextData(data: any): ScrapeResult | null {
  try {
    const props = data?.props?.pageProps;
    if (!props) return null;

    const movieEntries: Top10Entry[] = [];
    const tvEntries: Top10Entry[] = [];

    // Try to find top 10 data in various possible structures
    const top10Data = props.top10 || props.topTen || props.weeklyTop10 || props.weeklyTopTen;
    if (top10Data && Array.isArray(top10Data)) {
      for (const item of top10Data) {
        const entry: Top10Entry = {
          netflixTitle: item.title || item.name || '',
          normalizedTitle: normalizeForSearch(item.title || item.name || ''),
          rank: item.rank || item.position || 0,
          imageUrl: item.image || item.imageUrl || item.poster,
          netflixUrl: item.url || item.link || item.netflixUrl,
          netflixId: item.id || item.netflixId,
        };
        if (entry.netflixTitle) {
          const type = (item.type || '').toLowerCase();
          if (type === 'tv' || type === 'series' || type === 'show') {
            tvEntries.push(entry);
          } else {
            movieEntries.push(entry);
          }
        }
      }
    }

    if (movieEntries.length > 0 || tvEntries.length > 0) {
      return { movie: movieEntries, tv: tvEntries };
    }

    return null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromApiJson(data: any): ScrapeResult | null {
  try {
    const movieEntries: Top10Entry[] = [];
    const tvEntries: Top10Entry[] = [];

    // Try common API response formats
    const items = data.items || data.entries || data.results || data;
    if (Array.isArray(items)) {
      for (const item of items) {
        const entry: Top10Entry = {
          netflixTitle: item.title || item.name || '',
          normalizedTitle: normalizeForSearch(item.title || item.name || ''),
          rank: item.rank || item.position || 0,
          imageUrl: item.image || item.imageUrl || item.poster || item.thumbnail,
          netflixUrl: item.url || item.link || item.netflixUrl,
          netflixId: item.id || item.netflixId,
        };
        if (entry.netflixTitle) {
          const type = (item.type || '').toLowerCase();
          if (type === 'tv' || type === 'series' || type === 'show') {
            tvEntries.push(entry);
          } else {
            movieEntries.push(entry);
          }
        }
      }
    }

    if (movieEntries.length > 0 || tvEntries.length > 0) {
      return { movie: movieEntries, tv: tvEntries };
    }

    return null;
  } catch {
    return null;
  }
}

async function scrapeFlixPatrol(): Promise<ScrapeResult | null> {
  try {
    const sources = [
      { url: 'https://flixpatrol.com/top10/netflix/vietnam/', type: 'country' },
      { url: 'https://flixpatrol.com/top10/netflix/world/', type: 'world' },
    ];

    for (const source of sources) {
      try {
        const res = await fetch(source.url, {
          signal: AbortSignal.timeout(15000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });

        if (!res.ok) continue;
        const html = await res.text();

        // Try to find JSON data embedded in the page
        const jsonMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>({.*?})<\/script>/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[1]);
          const result = extractFromNextData(data);
          if (result && (result.movie.length > 0 || result.tv.length > 0)) {
            return result;
          }
        }

        // Try to find table-based data
        const tableRows = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
        const movieEntries: Top10Entry[] = [];
        const tvEntries: Top10Entry[] = [];

        for (const row of tableRows) {
          const cells = row[1].match(/<td[^>]*>([\s\S]*?)<\/td>/g);
          if (!cells || cells.length < 3) continue;

          const titleMatch = row[1].match(/<a[^>]*>([^<]*)<\/a>/);
          const rankMatch = row[1].match(/<td[^>]*>\s*(\d+)\s*<\/td>/);

          if (titleMatch && rankMatch) {
            const title = titleMatch[1].trim();
            const rank = parseInt(rankMatch[1], 10);
            if (title && rank >= 1 && rank <= 10) {
              const entry: Top10Entry = {
                netflixTitle: title,
                normalizedTitle: normalizeForSearch(title),
                rank,
              };
              movieEntries.push(entry);
            }
          }
        }

        if (movieEntries.length > 0) {
          return { movie: movieEntries, tv: [] };
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function matchWithDb(entries: Top10Entry[]): Promise<Top10Entry[]> {
  const allMovies = await prisma.movie.findMany({
    select: { slug: true, name: true, originalName: true },
  });

  for (const entry of entries) {
    let bestScore = 0;
    let bestSlug: string | null = null;

    for (const movie of allMovies) {
      const normalizedMovieName = normalizeForSearch(movie.name);
      let score = compareTwoStrings(entry.normalizedTitle, normalizedMovieName);

      if (movie.originalName) {
        const normalizedOriginal = normalizeForSearch(movie.originalName);
        const origScore = compareTwoStrings(entry.normalizedTitle, normalizedOriginal);
        if (origScore > score) score = origScore;
      }

      if (score > bestScore) {
        bestScore = score;
        bestSlug = movie.slug;
      }
    }

    if (bestSlug && bestScore > 0.8) {
      entry.matchedMovieSlug = bestSlug;
      entry.matchStatus = 'matched';
      entry.matchScore = bestScore;
    } else if (bestSlug && bestScore > 0.5) {
      entry.matchedMovieSlug = bestSlug;
      entry.matchStatus = 'pending';
      entry.matchScore = bestScore;
    } else {
      entry.matchStatus = 'not_found';
      entry.matchScore = bestScore;
    }
  }

  return entries;
}

async function saveToDb(type: string, entries: Top10Entry[], weekLabel: string): Promise<number> {
  let saved = 0;

  for (const entry of entries) {
    try {
      await prisma.netflixTop10.upsert({
        where: {
          country_type_weekLabel_rank: {
            country: 'vietnam',
            type,
            weekLabel,
            rank: entry.rank,
          },
        },
        update: {
          netflixTitle: entry.netflixTitle,
          normalizedTitle: entry.normalizedTitle,
          imageUrl: entry.imageUrl || null,
          netflixUrl: entry.netflixUrl || null,
          netflixId: entry.netflixId || null,
          matchedMovieSlug: entry.matchedMovieSlug || null,
          matchStatus: entry.matchStatus || 'pending',
          matchScore: entry.matchScore || null,
        },
        create: {
          country: 'vietnam',
          type,
          weekLabel,
          rank: entry.rank,
          netflixTitle: entry.netflixTitle,
          normalizedTitle: entry.normalizedTitle,
          imageUrl: entry.imageUrl || null,
          netflixUrl: entry.netflixUrl || null,
          netflixId: entry.netflixId || null,
          matchedMovieSlug: entry.matchedMovieSlug || null,
          matchStatus: entry.matchStatus || 'pending',
          matchScore: entry.matchScore || null,
        },
      });
      saved++;
    } catch {
      // Skip duplicate entries
    }
  }

  return saved;
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const forceSource = searchParams.get('source'); // Optional: force a specific source
  const weekLabel = getCurrentWeekLabel();

  let result: ScrapeResult | null = null;

  // Priority 1: Tudum
  if (!forceSource || forceSource === 'tudum') {
    result = await scrapeTudum();
  }

  // Priority 2: FlixPatrol
  if (!result && (!forceSource || forceSource === 'flixpatrol')) {
    result = await scrapeFlixPatrol();
  }

  if (!result) {
    // If all sources failed, return error
    return Response.json({
      success: false,
      error: 'Không thể lấy dữ liệu Top 10 từ tất cả các nguồn.',
    }, { status: 502 });
  }

  // Match with DB
  const matchedMovies = await matchWithDb(result.movie);
  const matchedTv = await matchWithDb(result.tv);

  // Save to DB
  const moviesSaved = await saveToDb('movie', matchedMovies, weekLabel);
  const tvSaved = await saveToDb('tv', matchedTv, weekLabel);

  return Response.json({
    success: true,
    weekLabel,
    moviesSaved,
    tvSaved,
    movieCount: matchedMovies.length,
    tvCount: matchedTv.length,
    matchedCount: matchedMovies.filter((e) => (e as Record<string, unknown>).matchStatus === 'matched').length +
      matchedTv.filter((e) => (e as Record<string, unknown>).matchStatus === 'matched').length,
    pendingCount: matchedMovies.filter((e) => (e as Record<string, unknown>).matchStatus === 'pending').length +
      matchedTv.filter((e) => (e as Record<string, unknown>).matchStatus === 'pending').length,
    notFoundCount: matchedMovies.filter((e) => (e as Record<string, unknown>).matchStatus === 'not_found').length +
      matchedTv.filter((e) => (e as Record<string, unknown>).matchStatus === 'not_found').length,
  });
}
