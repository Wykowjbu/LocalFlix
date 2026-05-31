import { prisma } from '@/lib/db';

function stripHtml(html: string | null): string | null {
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

async function linkToCollection(
  movieSlug: string,
  collectionSlug: string,
  collectionName: string,
  position: number
) {
  const collection = await prisma.collection.upsert({
    where: { slug: collectionSlug },
    update: { lastSyncedAt: new Date() },
    create: {
      slug: collectionSlug,
      name: collectionName,
      lastSyncedAt: new Date(),
    },
  });

  await prisma.movieCollection.upsert({
    where: {
      collectionId_movieSlug: {
        collectionId: collection.id,
        movieSlug: movieSlug,
      },
    },
    update: { position, page: 1 },
    create: {
      collectionId: collection.id,
      movieSlug: movieSlug,
      position: position,
      page: 1,
    },
  });

  return collection.id;
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-seed-secret');
  const canRun =
    (process.env.SEED_SECRET && secret === process.env.SEED_SECRET) ||
    process.env.NODE_ENV === 'development';

  if (!canRun) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let addedMovies = 0;
  let updatedMovies = 0;
  let skippedMovies = 0;
  let episodesUpserted = 0;
  let collectionsSynced = 0;

  const endpoints = [
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

  for (const endpoint of endpoints) {
    let listData: any;
    try {
      const res = await fetch(endpoint.url);
      listData = await res.json();
    } catch (error) {
      console.error(`Error fetching list ${endpoint.url}:`, error);
      continue;
    }

    if (!listData.items || listData.status !== 'success') {
      console.error(`Invalid response from ${endpoint.url}`);
      continue;
    }

    const collectionIds = new Set<string>();

    for (let i = 0; i < listData.items.length; i++) {
      const item = listData.items[i];

      try {
        const existingMovie = await prisma.movie.findUnique({
          where: { slug: item.slug },
        });

        const apiModified = item.modified ? new Date(item.modified) : null;

        if (existingMovie && existingMovie.sourceModifiedAt && apiModified) {
          if (existingMovie.sourceModifiedAt >= apiModified) {
            const episodeCount = await prisma.episode.count({
              where: { movieSlug: item.slug },
            });
            if (episodeCount > 0) {
              skippedMovies++;
              const colId = await linkToCollection(
                item.slug,
                endpoint.slug,
                endpoint.name,
                i
              );
              collectionIds.add(colId);
              continue;
            }
          }
        }

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
            sourceCreatedAt: item.created ? new Date(item.created) : null,
            sourceModifiedAt: apiModified,
            lastSyncedAt: new Date(),
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
            sourceCreatedAt: item.created ? new Date(item.created) : null,
            sourceModifiedAt: apiModified,
            lastSyncedAt: new Date(),
          },
        });

        if (existingMovie) {
          updatedMovies++;
        } else {
          addedMovies++;
        }

        const colId = await linkToCollection(
          item.slug,
          endpoint.slug,
          endpoint.name,
          i
        );
        collectionIds.add(colId);
      } catch (error) {
        console.error(`Error syncing movie ${item.slug}:`, error);
      }
    }

    collectionsSynced += collectionIds.size;
  }

  const allMovies = await prisma.movie.findMany({
    where: {
      OR: [
        { sourceId: null },
        {
          episodes: {
            none: {},
          },
        },
      ],
    },
    select: { slug: true },
  });

  for (const movie of allMovies) {
    try {
      const res = await fetch(`https://phim.nguonc.com/api/film/${movie.slug}`);
      const detailData = await res.json();

      if (detailData.status !== 'success' || !detailData.movie) {
        continue;
      }

      if (detailData.movie.id) {
        await prisma.movie.update({
          where: { slug: movie.slug },
          data: { sourceId: detailData.movie.id },
        });
      }

      if (detailData.movie.episodes && Array.isArray(detailData.movie.episodes)) {
        for (const server of detailData.movie.episodes) {
          if (!server.items || !Array.isArray(server.items)) continue;

          for (const ep of server.items) {
            try {
              await prisma.episode.upsert({
                where: {
                  movieSlug_serverName_slug: {
                    movieSlug: movie.slug,
                    serverName: server.server_name || 'default',
                    slug: ep.slug,
                  },
                },
                update: {
                  name: ep.name,
                  embedUrl: ep.embed || null,
                  m3u8Url: ep.m3u8 || null,
                },
                create: {
                  movieSlug: movie.slug,
                  serverName: server.server_name || 'default',
                  name: ep.name,
                  slug: ep.slug,
                  embedUrl: ep.embed || null,
                  m3u8Url: ep.m3u8 || null,
                },
              });
              episodesUpserted++;
            } catch (error) {
              console.error(`Error upserting episode ${movie.slug}/${ep.slug}:`, error);
            }
          }
        }
      }

      if (detailData.movie.category) {
        for (const [, groupData] of Object.entries(detailData.movie.category) as any[]) {
          if (!groupData.group || !groupData.list) continue;

          try {
            const tagGroup = await prisma.tagGroup.upsert({
              where: { name: groupData.group.name },
              update: {},
              create: { name: groupData.group.name },
            });

            for (const tagItem of groupData.list) {
              try {
                const tag = await prisma.tag.upsert({
                  where: {
                    groupId_slug: {
                      groupId: tagGroup.id,
                      slug: tagItem.id,
                    },
                  },
                  update: { name: tagItem.name },
                  create: {
                    groupId: tagGroup.id,
                    name: tagItem.name,
                    slug: tagItem.id,
                  },
                });

                await prisma.movieTag.upsert({
                  where: {
                    movieSlug_tagId: {
                      movieSlug: movie.slug,
                      tagId: tag.id,
                    },
                  },
                  update: {},
                  create: {
                    movieSlug: movie.slug,
                    tagId: tag.id,
                  },
                });
              } catch (error) {
                console.error(`Error upserting tag ${tagItem.name}:`, error);
              }
            }
          } catch (error) {
            console.error(`Error upserting tag group ${groupData.group.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching detail for ${movie.slug}:`, error);
    }
  }

  // Seed fixed tag groups and tags
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

  return Response.json({
    success: true,
    addedMovies,
    updatedMovies,
    skippedMovies,
    episodesUpserted,
    collectionsSynced,
  });
}
