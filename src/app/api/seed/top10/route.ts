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

type ScrapeSourceResult = {
  name: string;
  success: boolean;
  reason?: string;
};

const TITLE_FETCH_CONCURRENCY = 5;
const NETFLIX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/);
  if (!match) return null;
  const title = match[1]
    .replace(/\s*\|\s*(Netflix Official Site|Netflix)\s*$/i, '')
    .replace(/^Watch\s+/i, '')
    .trim();
  return title || null;
}

async function fetchTitleForVideoId(videoId: string): Promise<{ title: string | null; netflixUrl: string }> {
  const url = `https://www.netflix.com/title/${videoId}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': NETFLIX_UA, 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    return { title: extractTitleFromHtml(html), netflixUrl: res.url };
  } catch {
    return { title: null, netflixUrl: url };
  }
}

async function batchFetchTitles(videoIds: string[]): Promise<Map<string, { title: string; netflixUrl: string }>> {
  const uniqueIds = [...new Set(videoIds)];
  const result = new Map<string, { title: string; netflixUrl: string }>();
  const queue = [...uniqueIds];
  let idx = 0;

  async function worker() {
    while (idx < queue.length) {
      const videoId = queue[idx++];
      const { title, netflixUrl } = await fetchTitleForVideoId(videoId);
      if (title) {
        result.set(videoId, { title, netflixUrl });
      }
    }
  }

  await Promise.all(Array.from({ length: TITLE_FETCH_CONCURRENCY }, () => worker()));
  return result;
}

function extractGraphqlJson(html: string): Record<string, unknown> | null {
  const match = html.match(/netflix\.reactContext\.models\.graphql\s*=\s*JSON\.parse\('([\s\S]*?)'\)/);
  if (!match) return null;
  const jsonStr = match[1]
    .replace(/\\x27/g, "'")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '');
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseTop10Items(graphql: Record<string, unknown>, titleMap: Map<string, { title: string; netflixUrl: string }>): Top10Entry[] {
  const data = graphql.data as Record<string, unknown> | undefined;
  if (!data) return [];

  const entries: Top10Entry[] = [];
  const sections: Array<{ name: string; items: Array<{ videoId: string; rank: number; imageUrl?: string; netflixUrl?: string }> }> = [];

  // Find all PulseEntitiesSection with guid "top-10-card-list"
  for (const key of Object.keys(data)) {
    const val = data[key] as Record<string, unknown> | undefined;
    if (!val || val.__typename !== 'PulseEntitiesSection') continue;
    if (val.guid !== 'top-10-card-list') continue;

    const header = val.header as Record<string, unknown> | undefined;
    const sectionName = (header?.sectionTitle as string) || 'Unknown';
    const sectionEntities = val.entities as Array<{ __ref: string }> | undefined;
    if (!sectionEntities) continue;

    const items: Array<{ videoId: string; rank: number; imageUrl?: string; netflixUrl?: string }> = [];
    for (const ref of sectionEntities) {
      const entityKey = ref.__ref;
      const entity = data[entityKey] as Record<string, unknown> | undefined;
      if (!entity) continue;

      const top10 = entity.top10 as Record<string, unknown> | undefined;
      if (!top10) continue;

      const videoId = String(top10.videoId ?? '');
      const rank = (top10.weeklyRank as number) || 0;
      if (!videoId || rank < 1 || rank > 10) continue;

      // Extract image URL from artwork
      const artwork = entity.artwork as Record<string, unknown> | undefined;
      let imageUrl: string | undefined;
      if (artwork) {
        const storyArt = artwork.storyArt as Record<string, unknown> | undefined;
        if (storyArt) {
          const sizedKey = Object.keys(storyArt).find(k => k.startsWith('urlsSized'));
          if (sizedKey) {
            const urls = storyArt[sizedKey] as Array<Record<string, unknown>> | undefined;
            imageUrl = urls?.[0]?.url as string | undefined;
          }
        }
        if (!imageUrl) {
          const sdpArt = artwork.sdpArt as Record<string, unknown> | undefined;
          if (sdpArt) {
            const sizedKey = Object.keys(sdpArt).find(k => k.startsWith('urlsSized'));
            if (sizedKey) {
              const urls = sdpArt[sizedKey] as Array<Record<string, unknown>> | undefined;
              imageUrl = urls?.[0]?.url as string | undefined;
            }
          }
        }
      }

      const titleInfo = titleMap.get(videoId);
      const netflixUrl = titleInfo?.netflixUrl || `https://www.netflix.com/title/${videoId}`;

      items.push({ videoId, rank, imageUrl, netflixUrl });
    }

    sections.push({ name: sectionName, items });
  }

  for (const section of sections) {
    for (const item of section.items) {
      const titleInfo = titleMap.get(item.videoId);
      const netflixTitle = titleInfo?.title || '';
      if (!netflixTitle) continue;

      const entry: Top10Entry = {
        netflixTitle,
        normalizedTitle: normalizeForSearch(netflixTitle),
        rank: item.rank,
        imageUrl: item.imageUrl,
        netflixUrl: item.netflixUrl,
        netflixId: item.videoId,
      };
      entries.push(entry);
    }
  }

  return entries;
}

async function scrapeTudum(sources: ScrapeSourceResult[]): Promise<ScrapeResult | null> {
  const pages = [
    { url: 'https://top10.netflix.com/', label: 'movies' },
    { url: 'https://top10.netflix.com/tv', label: 'tv' },
  ];

  const allEntries: Top10Entry[] = [];
  const allVideoIds: string[] = [];

  // First pass: fetch pages and extract GraphQL + videoIds
  for (const page of pages) {
    try {
      const res = await fetch(page.url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': NETFLIX_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
          'Referer': 'https://www.google.com/',
        },
      });

      if (!res.ok) {
        sources.push({ name: `tudum-${page.label}`, success: false, reason: `HTTP ${res.status}` });
        continue;
      }

      const html = await res.text();
      const graphql = extractGraphqlJson(html);
      if (!graphql) {
        sources.push({ name: `tudum-${page.label}`, success: false, reason: 'GraphQL data not found in HTML' });
        continue;
      }

      // Collect videoIds from this page
      const data = graphql.data as Record<string, unknown> | undefined;
      if (data) {
        for (const key of Object.keys(data)) {
          const val = data[key] as Record<string, unknown> | undefined;
          if (!val || val.__typename !== 'PulseEntitiesSection') continue;
          if (val.guid !== 'top-10-card-list') continue;
          const sectionEntities = val.entities as Array<{ __ref: string }> | undefined;
          if (!sectionEntities) continue;
          for (const ref of sectionEntities) {
            const entity = data[ref.__ref] as Record<string, unknown> | undefined;
            if (entity) {
              const top10 = entity.top10 as Record<string, unknown> | undefined;
              if (top10?.videoId) allVideoIds.push(String(top10.videoId));
            }
          }
        }
      }

      sources.push({ name: `tudum-${page.label}`, success: true, reason: 'GraphQL parsed' });
      allEntries.push(...parseTop10Items(graphql, new Map()));
    } catch (err) {
      sources.push({ name: `tudum-${page.label}`, success: false, reason: err instanceof Error ? err.message : 'Unknown error' });
    }
  }

  // Second pass: fetch titles for all videoIds
  if (allVideoIds.length > 0) {
    const titleMap = await batchFetchTitles(allVideoIds);
    sources.push({ name: 'tudum-titles', success: titleMap.size > 0, reason: `${titleMap.size}/${allVideoIds.length} titles fetched` });

    // Re-parse with real titles
    const movieEntries: Top10Entry[] = [];
    const tvEntries: Top10Entry[] = [];

    for (const page of pages) {
      try {
        const res = await fetch(page.url, {
          signal: AbortSignal.timeout(15000),
          headers: { 'User-Agent': NETFLIX_UA, 'Accept-Language': 'en-US,en;q=0.9' },
        });
        if (!res.ok) continue;
        const html = await res.text();
        const graphql = extractGraphqlJson(html);
        if (!graphql) continue;

        const items = parseTop10Items(graphql, titleMap);
        const isTv = page.label === 'tv';
        for (const item of items) {
          if (isTv) tvEntries.push(item);
          else movieEntries.push(item);
        }
      } catch {
        // skip
      }
    }

    if (movieEntries.length > 0 || tvEntries.length > 0) {
      return { movie: movieEntries, tv: tvEntries };
    }
  }

  return null;
}

async function scrapeFlixPatrol(sources: ScrapeSourceResult[]): Promise<ScrapeResult | null> {
  const urls = [
    'https://flixpatrol.com/top10/netflix/vietnam/',
    'https://flixpatrol.com/top10/netflix/world/',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': NETFLIX_UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'en-US,en;q=0.9' },
      });

      if (!res.ok) {
        sources.push({ name: `flixpatrol`, success: false, reason: `HTTP ${res.status} - blocked by Cloudflare` });
        continue;
      }

      const html = await res.text();
      const movieEntries: Top10Entry[] = [];
      const rows = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g);
      for (const row of rows) {
        const titleA = row[1].match(/<a[^>]*>([^<]*)<\/a>/);
        const rankTd = row[1].match(/<td[^>]*>\s*(\d+)\s*<\/td>/);
        if (titleA && rankTd) {
          const title = titleA[1].trim();
          const rank = parseInt(rankTd[1], 10);
          if (title && rank >= 1 && rank <= 10) {
            movieEntries.push({
              netflixTitle: title,
              normalizedTitle: normalizeForSearch(title),
              rank,
            });
          }
        }
      }

      if (movieEntries.length > 0) {
        sources.push({ name: 'flixpatrol', success: true, reason: `${movieEntries.length} items from ${url}` });
        return { movie: movieEntries, tv: [] };
      }
    } catch {
      // skip
    }
  }

  sources.push({ name: 'flixpatrol', success: false, reason: 'No data from any URL' });
  return null;
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
  const secret = request.headers.get('x-seed-secret');
  const canRun =
    (process.env.SEED_SECRET && secret === process.env.SEED_SECRET) ||
    process.env.NODE_ENV === 'development';

  if (!canRun) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const forceSource = searchParams.get('source');
  const weekLabel = getCurrentWeekLabel();

  const sources: ScrapeSourceResult[] = [];
  let result: ScrapeResult | null = null;
  let usedSource = '';

  // Priority 1: Tudum
  if (!forceSource || forceSource === 'tudum') {
    result = await scrapeTudum(sources);
    if (result) usedSource = 'tudum';
  }

  // Priority 2: FlixPatrol
  if (!result && (!forceSource || forceSource === 'flixpatrol')) {
    result = await scrapeFlixPatrol(sources);
    if (result) usedSource = 'flixpatrol';
  }

  if (!result) {
    return Response.json({
      success: false,
      error: 'Không thể lấy dữ liệu Top 10 từ tất cả các nguồn.',
      sources,
    }, { status: 502 });
  }

  const matchedMovies = await matchWithDb(result.movie);
  const matchedTv = await matchWithDb(result.tv);

  const moviesSaved = await saveToDb('movie', matchedMovies, weekLabel);
  const tvSaved = await saveToDb('tv', matchedTv, weekLabel);

  const matchedCount = [...matchedMovies, ...matchedTv].filter((e) => e.matchStatus === 'matched').length;
  const pendingCount = [...matchedMovies, ...matchedTv].filter((e) => e.matchStatus === 'pending').length;
  const notFoundCount = [...matchedMovies, ...matchedTv].filter((e) => e.matchStatus === 'not_found').length;

  return Response.json({
    success: true,
    source: usedSource,
    sources,
    weekLabel,
    moviesSaved,
    tvSaved,
    movieCount: matchedMovies.length,
    tvCount: matchedTv.length,
    matchedCount,
    pendingCount,
    notFoundCount,
  });
}
