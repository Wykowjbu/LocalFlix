import { prisma } from '@/lib/db';
import { generateSearchTextWithTags } from '@/lib/search-scoring';

async function backfillSearchText() {
  console.log('Starting searchText backfill...');

  const movies = await prisma.movie.findMany({
    select: {
      id: true,
      name: true,
      originalName: true,
      slug: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  console.log(`Found ${movies.length} movies to update`);

  let updated = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < movies.length; i += BATCH_SIZE) {
    const batch = movies.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map((movie) =>
        prisma.movie.update({
          where: { id: movie.id },
          data: {
            searchText: generateSearchTextWithTags(
              movie.name,
              movie.originalName,
              movie.slug,
              movie.tags.map((mt) => mt.tag),
            ),
          },
        }),
      ),
    );

    updated += batch.length;
    const pct = Math.round((updated / movies.length) * 100);
    console.log(`Progress: ${updated}/${movies.length} (${pct}%)`);
  }

  console.log(`Backfill complete. Updated ${updated} movies.`);
}

backfillSearchText()
  .catch((err) => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
