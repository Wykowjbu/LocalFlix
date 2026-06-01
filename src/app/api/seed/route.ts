import { prisma } from '@/lib/db';
import { generateSearchText, generateSearchTextWithTags } from '@/lib/search-scoring';

const DETAIL_CONCURRENCY = 10;
const REQUEST_TIMEOUT_MS = 15000;
const REQUEST_RETRIES = 2;
const DETAIL_DELAY_MIN_MS = 100;
const DETAIL_DELAY_MAX_MS = 300;
const MAX_PAGES_PER_ENDPOINT = 3300;

type Endpoint = {
  url: string;
  slug: string;
  name: string;
};

type NguonListItem = {
  slug?: string;
  name?: string;
  original_name?: string;
  thumb_url?: string;
  poster_url?: string;
  description?: string;
  total_episodes?: number;
  current_episode?: string;
  time?: string;
  quality?: string;
  language?: string;
  director?: string;
  casts?: string;
  created?: string;
  modified?: string;
};

type NguonListResponse = {
  status?: string;
  items?: NguonListItem[];
};

type NguonEpisodeItem = {
  name?: string;
  slug?: string;
  embed?: string;
  m3u8?: string;
};

type NguonEpisodeServer = {
  server_name?: string;
  items?: NguonEpisodeItem[];
};

type NguonCategoryGroup = {
  group?: { name?: string };
  list?: { id?: string; name?: string }[];
};

type NguonDetailResponse = {
  status?: string;
  movie?: {
    id?: string;
    modified?: string;
    episodes?: NguonEpisodeServer[];
    category?: Record<string, NguonCategoryGroup>;
  };
};

type SyncStats = {
  addedMovies: number;
  updatedMovies: number;
  skippedMovies: number;
  detailSynced: number;
  detailSkipped: number;
  episodesUpserted: number;
  episodesCreated: number;
  episodesUpdated: number;
  tagsLinked: number;
  collectionsSynced: number;
  earlyExits: number;
  pagesSynced: number;
  errors: string[];
};

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  return html.replace(/<[^>]*>/g, '').trim();
}

function toSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function fetchJson<T>(url: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      return (await res.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < REQUEST_RETRIES) await sleep(600 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

async function runLimited<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++];
      await worker(item);
    }
  });

  await Promise.all(workers);
}

async function linkToCollection(collectionId: string, movieSlug: string, position: number, page = 1) {
  await prisma.movieCollection.upsert({
    where: {
      collectionId_movieSlug: {
        collectionId,
        movieSlug,
      },
    },
    update: { position, page },
    create: {
      collectionId,
      movieSlug,
      position,
      page,
    },
  });
}

async function seedFixedTags() {
  const yearTags = Array.from({ length: 2026 - 2004 + 1 }, (_, i) => `${2004 + i}`);
  const predefinedGroups = [
    {
      name: 'Thể loại',
      tags: [
        'Hành Động',
        'Phiêu Lưu',
        'Hoạt Hình',
        'Hài',
        'Hình Sự',
        'Tài Liệu',
        'Chính Kịch',
        'Gia Đình',
        'Giả Tưởng',
        'Lịch Sử',
        'Kinh Dị',
        'Nhạc',
        'Bí Ẩn',
        'Lãng Mạn',
        'Khoa Học Viễn Tưởng',
        'Gây Cấn',
        'Chiến Tranh',
        'Tâm Lý',
        'Tình Cảm',
        'Cổ Trang',
        'Miền Tây',
        'Phim 18+',
      ],
    },
    {
      name: 'Quốc gia',
      tags: [
        'Âu Mỹ',
        'Anh',
        'Trung Quốc',
        'Indonesia',
        'Việt Nam',
        'Pháp',
        'Hồng Kông',
        'Hàn Quốc',
        'Nhật Bản',
        'Thái Lan',
        'Đài Loan',
        'Nga',
        'Hà Lan',
        'Philippines',
        'Ấn Độ',
        'Quốc gia khác',
      ],
    },
    {
      name: 'Năm phát hành',
      tags: yearTags,
    },
  ];

  for (const group of predefinedGroups) {
    const tagGroup = await prisma.tagGroup.upsert({
      where: { name: group.name },
      update: {},
      create: { name: group.name },
    });

    for (const tagName of group.tags) {
      const slug = toSlug(tagName);
      await prisma.tag.upsert({
        where: {
          groupId_slug: {
            groupId: tagGroup.id,
            slug,
          },
        },
        update: { name: tagName },
        create: {
          groupId: tagGroup.id,
          name: tagName,
          slug,
        },
      });
    }
  }
}

async function syncMovieDetail(movieSlug: string, stats: SyncStats) {
  await sleep(randomDelay(DETAIL_DELAY_MIN_MS, DETAIL_DELAY_MAX_MS));

  try {
    const detailData = await fetchJson<NguonDetailResponse>(`https://phim.nguonc.com/api/film/${movieSlug}`);

    if (detailData.status !== 'success' || !detailData.movie) {
      stats.detailSkipped++;
      stats.errors.push(`Invalid detail response for ${movieSlug}`);
      return;
    }

    const movie = detailData.movie;
    const detailModifiedAt = parseDate(movie.modified);
    let episodeChanged = false;

    if (movie.id || detailModifiedAt) {
      await prisma.movie.update({
        where: { slug: movieSlug },
        data: {
          sourceId: movie.id || undefined,
          sourceModifiedAt: detailModifiedAt || undefined,
        },
      });
    }

    if (Array.isArray(movie.episodes)) {
      for (const server of movie.episodes) {
        if (!Array.isArray(server.items)) continue;

        const serverName = server.server_name || 'default';

        for (const ep of server.items) {
          if (!ep?.slug) continue;

          try {
            const existingEpisode = await prisma.episode.findUnique({
              where: {
                movieSlug_serverName_slug: {
                  movieSlug,
                  serverName,
                  slug: ep.slug,
                },
              },
            });

            const nextEpisode = {
              name: ep.name || ep.slug,
              embedUrl: ep.embed || null,
              m3u8Url: ep.m3u8 || null,
            };

            await prisma.episode.upsert({
              where: {
                movieSlug_serverName_slug: {
                  movieSlug,
                  serverName,
                  slug: ep.slug,
                },
              },
              update: nextEpisode,
              create: {
                movieSlug,
                serverName,
                slug: ep.slug,
                ...nextEpisode,
              },
            });

            stats.episodesUpserted++;

            if (!existingEpisode) {
              stats.episodesCreated++;
              episodeChanged = true;
            } else if (
              existingEpisode.name !== nextEpisode.name ||
              existingEpisode.embedUrl !== nextEpisode.embedUrl ||
              existingEpisode.m3u8Url !== nextEpisode.m3u8Url
            ) {
              stats.episodesUpdated++;
              episodeChanged = true;
            }
          } catch (error) {
            const message = `Error upserting episode ${movieSlug}/${ep.slug}: ${getErrorMessage(error)}`;
            console.error(message);
            stats.errors.push(message);
          }
        }
      }
    }

    const nextTagIds = new Set<string>();

    if (movie.category) {
      for (const groupData of Object.values(movie.category)) {
        if (!groupData?.group?.name || !Array.isArray(groupData.list)) continue;

        try {
          const tagGroup = await prisma.tagGroup.upsert({
            where: { name: groupData.group.name },
            update: {},
            create: { name: groupData.group.name },
          });

          for (const tagItem of groupData.list) {
            if (!tagItem?.id || !tagItem?.name) continue;

            try {
              const canonicalSlug = toSlug(tagItem.name);

              let tag = await prisma.tag.findFirst({
                where: { groupId: tagGroup.id, name: tagItem.name },
              });

              if (tag) {
                if (tag.slug !== canonicalSlug) {
                  tag = await prisma.tag.update({
                    where: { id: tag.id },
                    data: { slug: canonicalSlug, name: tagItem.name },
                  });
                } else if (tag.name !== tagItem.name) {
                  tag = await prisma.tag.update({
                    where: { id: tag.id },
                    data: { name: tagItem.name },
                  });
                }
              } else {
                tag = await prisma.tag.upsert({
                  where: {
                    groupId_slug: {
                      groupId: tagGroup.id,
                      slug: canonicalSlug,
                    },
                  },
                  update: { name: tagItem.name },
                  create: {
                    groupId: tagGroup.id,
                    name: tagItem.name,
                    slug: canonicalSlug,
                  },
                });
              }

              nextTagIds.add(tag.id);

              await prisma.movieTag.upsert({
                where: {
                  movieSlug_tagId: {
                    movieSlug,
                    tagId: tag.id,
                  },
                },
                update: {},
                create: {
                  movieSlug,
                  tagId: tag.id,
                },
              });
              stats.tagsLinked++;
            } catch (error) {
              const message = `Error upserting tag ${movieSlug}/${tagItem.name}: ${getErrorMessage(error)}`;
              console.error(message);
              stats.errors.push(message);
            }
          }
        } catch (error) {
          const message = `Error upserting tag group for ${movieSlug}: ${getErrorMessage(error)}`;
          console.error(message);
          stats.errors.push(message);
        }
      }
    }

    if (nextTagIds.size > 0) {
      await prisma.movieTag.deleteMany({
        where: {
          movieSlug,
          tagId: { notIn: [...nextTagIds] },
        },
      });
    }

    const movieForSearch = await prisma.movie.findUnique({
      where: { slug: movieSlug },
      select: { name: true, originalName: true, slug: true, tags: { select: { tag: { select: { name: true } } } } },
    });

    if (movieForSearch) {
      await prisma.movie.update({
        where: { slug: movieSlug },
        data: {
          searchText: generateSearchTextWithTags(
            movieForSearch.name,
            movieForSearch.originalName,
            movieForSearch.slug,
            movieForSearch.tags.map((mt) => mt.tag),
          ),
        },
      });
    }

    if (episodeChanged || detailModifiedAt) {
      await prisma.movie.update({
        where: { slug: movieSlug },
        data: { lastSyncedAt: new Date() },
      });
    }

    stats.detailSynced++;
  } catch (error) {
    const message = `Error fetching detail for ${movieSlug}: ${getErrorMessage(error)}`;
    console.error(message);
    stats.detailSkipped++;
    stats.errors.push(message);
  }
}

async function syncEndpoint(endpoint: Endpoint, detailQueue: Set<string>, stats: SyncStats, force: boolean) {
  const collection = await prisma.collection.upsert({
    where: { slug: endpoint.slug },
    update: {
      name: endpoint.name,
      endpoint: endpoint.url,
      lastSyncedAt: new Date(),
    },
    create: {
      slug: endpoint.slug,
      name: endpoint.name,
      endpoint: endpoint.url,
      lastSyncedAt: new Date(),
    },
  });

  const pageSlugs = new Map<number, string[]>();
  let globalPosition = 0;

  for (let page = 1; page <= MAX_PAGES_PER_ENDPOINT; page++) {
    const pageUrl = endpoint.url.replace(/page=\d+/, `page=${page}`);
    let listData: NguonListResponse;

    try {
      listData = await fetchJson(pageUrl);
    } catch (error) {
      const message = `Error fetching list ${pageUrl}: ${getErrorMessage(error)}`;
      console.error(message);
      stats.errors.push(message);
      break;
    }

    if (listData.status !== 'success' || !Array.isArray(listData.items) || listData.items.length === 0) {
      break;
    }

    const slugsForThisPage: string[] = [];
    let pageStaleCount = 0;
    let pageValidCount = 0;

    for (let i = 0; i < listData.items.length; i++) {
      const item = listData.items[i];
      if (!item?.slug || !item?.name) {
        stats.skippedMovies++;
        continue;
      }

      pageValidCount++;
      slugsForThisPage.push(item.slug);

      try {
        const existingMovie = await prisma.movie.findUnique({
          where: { slug: item.slug },
          include: { _count: { select: { episodes: true } } },
        });

        const apiModified = parseDate(item.modified);
        const isStale =
          !!existingMovie &&
          !!existingMovie.sourceModifiedAt &&
          !!apiModified &&
          existingMovie.sourceModifiedAt >= apiModified &&
          existingMovie._count.episodes > 0;

        if (isStale && !force) {
          pageStaleCount++;
          stats.skippedMovies++;
          await linkToCollection(collection.id, item.slug, globalPosition, page);
          globalPosition++;
          continue;
        }

        const now = new Date();

        const newSearchText = generateSearchText(item.name, item.original_name, item.slug);

        await prisma.movie.upsert({
          where: { slug: item.slug },
          update: {
            name: item.name,
            originalName: item.original_name || null,
            thumbUrl: item.thumb_url || null,
            posterUrl: item.poster_url || null,
            description: stripHtml(item.description),
            totalEpisodes: item.total_episodes || null,
            currentEpisode: item.current_episode || null,
            time: item.time || null,
            quality: item.quality || null,
            language: item.language || null,
            director: item.director || null,
            casts: item.casts || null,
            sourceCreatedAt: parseDate(item.created),
            sourceModifiedAt: apiModified,
            lastSyncedAt: now,
            searchText: newSearchText,
          },
          create: {
            slug: item.slug,
            name: item.name,
            originalName: item.original_name || null,
            thumbUrl: item.thumb_url || null,
            posterUrl: item.poster_url || null,
            description: stripHtml(item.description),
            totalEpisodes: item.total_episodes || null,
            currentEpisode: item.current_episode || null,
            time: item.time || null,
            quality: item.quality || null,
            language: item.language || null,
            director: item.director || null,
            casts: item.casts || null,
            sourceId: null,
            sourceCreatedAt: parseDate(item.created),
            sourceModifiedAt: apiModified,
            lastSyncedAt: now,
            searchText: newSearchText,
          },
        });

        if (existingMovie) stats.updatedMovies++;
        else stats.addedMovies++;

        await linkToCollection(collection.id, item.slug, globalPosition, page);
        globalPosition++;
        detailQueue.add(item.slug);
      } catch (error) {
        const message = `Error syncing movie ${item.slug}: ${getErrorMessage(error)}`;
        console.error(message);
        stats.errors.push(message);
      }
    }

    pageSlugs.set(page, slugsForThisPage);
    stats.pagesSynced++;

    // EARLY EXIT: Nếu toàn bộ phim trong page đều stale → dừng, không cần fetch page tiếp theo
    if (pageValidCount > 0 && pageStaleCount === pageValidCount) {
      stats.earlyExits++;
      console.log(`[Early Exit] ${endpoint.slug}: page ${page} toàn phim cũ, dừng sync`);
      break;
    }
  }

  // Chỉ cleanup những page đã thực sự fetch
  for (const [pageNum, slugs] of pageSlugs) {
    if (slugs.length > 0) {
      await prisma.movieCollection.deleteMany({
        where: {
          collectionId: collection.id,
          page: pageNum,
          movieSlug: { notIn: slugs },
        },
      });
    }
  }

  stats.collectionsSynced++;
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-seed-secret');
  const canRun =
    (process.env.SEED_SECRET && secret === process.env.SEED_SECRET) ||
    process.env.NODE_ENV === 'development';

  if (!canRun) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get('force') === 'true';

  const stats: SyncStats = {
    addedMovies: 0,
    updatedMovies: 0,
    skippedMovies: 0,
    detailSynced: 0,
    detailSkipped: 0,
    episodesUpserted: 0,
    episodesCreated: 0,
    episodesUpdated: 0,
    tagsLinked: 0,
    collectionsSynced: 0,
    earlyExits: 0,
    pagesSynced: 0,
    errors: [],
  };

  const endpoints: Endpoint[] = [
    {
      url: 'https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=1',
      slug: 'phim-moi-cap-nhat',
      name: 'Phim mới cập nhật',
    },
    {
      url: 'https://phim.nguonc.com/api/films/danh-sach/phim-dang-chieu?page=1',
      slug: 'phim-dang-chieu',
      name: 'Phim đang chiếu',
    },
    {
      url: 'https://phim.nguonc.com/api/films/the-loai/hanh-dong?page=1',
      slug: 'hanh-dong',
      name: 'Hành động',
    },
    {
      url: 'https://phim.nguonc.com/api/films/quoc-gia/au-my?page=1',
      slug: 'au-my',
      name: 'Âu Mỹ',
    },
  ];

  const detailQueue = new Set<string>();

  for (const endpoint of endpoints) {
    await syncEndpoint(endpoint, detailQueue, stats, force);
  }

  const missingDetails = await prisma.movie.findMany({
    where: {
      OR: [{ sourceId: null }, { episodes: { none: {} } }],
    },
    select: { slug: true },
  });

  for (const movie of missingDetails) {
    detailQueue.add(movie.slug);
  }

  await runLimited([...detailQueue], DETAIL_CONCURRENCY, (slug) => syncMovieDetail(slug, stats));
  await seedFixedTags();

  // Fire-and-forget: trigger Top 10 scrape after sync (non-blocking)
  const top10Headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.SEED_SECRET) {
    top10Headers['x-seed-secret'] = process.env.SEED_SECRET;
  }
  fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/seed/top10`, {
    method: 'POST',
    headers: top10Headers,
  }).catch((err) => { console.warn('Top 10 sync failed (non-blocking):', err?.message); });

  return Response.json({
    success: true,
    ...stats,
    errors: stats.errors.slice(0, 20),
    errorCount: stats.errors.length,
  });
}
