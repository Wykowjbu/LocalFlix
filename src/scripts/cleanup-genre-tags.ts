import { prisma } from '@/lib/db';

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function deduplicateGroup(groupName: string, dryRun: boolean) {
  const group = await prisma.tagGroup.findUnique({ where: { name: groupName } });
  if (!group) {
    console.log(`  SKIP: group "${groupName}" not found`);
    return { duplicates: 0, moved: 0, deleted: 0, updated: 0 };
  }

  const tags = await prisma.tag.findMany({ where: { groupId: group.id } });
  const nameGroups: Record<string, typeof tags> = {};
  for (const tag of tags) {
    if (!nameGroups[tag.name]) nameGroups[tag.name] = [];
    nameGroups[tag.name].push(tag);
  }

  let duplicates = 0;
  let moved = 0;
  let deleted = 0;
  let updated = 0;

  for (const [name, entries] of Object.entries(nameGroups)) {
    const canonicalSlug = slugify(name);

    if (entries.length > 1) {
      // ---- Duplicate entries ----
      duplicates++;
      const canonical = entries.find((t) => t.slug === canonicalSlug);
      const sources = entries.filter((t) => t.slug !== canonicalSlug);

      if (!canonical) {
        console.log(`  [DUPE] "${name}": No canonical slug "${canonicalSlug}" among entries. Slugs: ${entries.map((t) => t.slug).join(', ')}. SKIPPING.`);
        continue;
      }

      for (const source of sources) {
        const sourceCount = await prisma.movieTag.count({ where: { tagId: source.id } });

        if (sourceCount === 0) {
          if (!dryRun) {
            await prisma.movieTag.deleteMany({ where: { tagId: source.id } });
            await prisma.tag.delete({ where: { id: source.id } });
          }
          deleted++;
          console.log(`  [DUPE] "${name}": Deleted empty source (slug=${source.slug.slice(0, 12)}...)`);
          continue;
        }

        // Move movie associations
        const sourceMovies = await prisma.movieTag.findMany({ where: { tagId: source.id } });
        let movedCount = 0;
        for (const mt of sourceMovies) {
          const exists = await prisma.movieTag.findUnique({
            where: { movieSlug_tagId: { movieSlug: mt.movieSlug, tagId: canonical.id } },
          });
          if (!exists) {
            if (!dryRun) {
              await prisma.movieTag.create({
                data: { movieSlug: mt.movieSlug, tagId: canonical.id },
              });
            }
            movedCount++;
          }
        }

        if (!dryRun) {
          await prisma.movieTag.deleteMany({ where: { tagId: source.id } });
          await prisma.tag.delete({ where: { id: source.id } });
        }

        moved += movedCount;
        deleted++;
        console.log(`  [DUPE] "${name}": Moved ${movedCount} movies → "${canonicalSlug}", deleted source (${sourceCount} movies)`);
      }
    } else {
      // ---- Single entry ----
      const tag = entries[0];
      if (tag.slug !== canonicalSlug) {
        console.log(`  [RENAME] "${name}": slug "${tag.slug.slice(0, 12)}..." → "${canonicalSlug}" (${0} movies)`);
        if (!dryRun) {
          await prisma.tag.update({
            where: { id: tag.id },
            data: { slug: canonicalSlug },
          });
        }
        updated++;
      }
    }
  }

  return { duplicates, moved, deleted, updated };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) console.log('=== DRY RUN MODE (no changes will be made) ===\n');
  else console.log('=== LIVE MODE ===\n');

  // Run for each group
  const groups = ['Thể loại', 'Quốc gia'];
  const totals = { duplicates: 0, moved: 0, deleted: 0, updated: 0 };

  for (const groupName of groups) {
    console.log(`\n--- Processing group: ${groupName} ---`);
    const result = await deduplicateGroup(groupName, dryRun);
    totals.duplicates += result.duplicates;
    totals.moved += result.moved;
    totals.deleted += result.deleted;
    totals.updated += result.updated;
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`  Groups processed: ${groups.join(', ')}`);
  console.log(`  Duplicate names found: ${totals.duplicates}`);
  console.log(`  MovieTag records moved: ${totals.moved}`);
  console.log(`  Source tags deleted: ${totals.deleted}`);
  console.log(`  Tags renamed to canonical slug: ${totals.updated}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
