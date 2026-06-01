const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = 'file:' + __dirname + '/dev.db';
const prisma = new PrismaClient();

function removeVietnameseAccents(str) {
  const accents = {'a':'áàảãạâấầẩẫậăắằẳẵặ','A':'ÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶ','e':'éèẻẽẹêếềểễệ','E':'ÉÈẺẼẸÊẾỀỂỄỆ','i':'íìỉĩị','I':'ÍÌỈĨỊ','o':'óòỏõọôốồổỗộơớờởỡợ','O':'ÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ','u':'úùủũụưứừửữự','U':'ÚÙỦŨỤƯỨỪỬỮỰ','y':'ýỳỷỹỵ','Y':'ÝỲỶỸỴ','d':'đ','D':'Đ'};
  let result = '';
  for (const char of str) {
    let found = false;
    for (const [plain, accented] of Object.entries(accents)) {
      if (accented.includes(char)) { result += plain; found = true; break; }
    }
    if (!found) result += char;
  }
  return result;
}
function normalizeForSearch(text) {
  return removeVietnameseAccents(text).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}
function slugifyTagName(name) {
  return normalizeForSearch(name).replace(/\s+/g, '-');
}

async function main() {
  const groups = await prisma.tagGroup.findMany();
  console.log('=== ALL TAG GROUPS ===');
  groups.forEach(g => {
    console.log('  ' + g.id + ': ' + g.name);
  });

  for (const group of groups) {
    const tags = await prisma.tag.findMany({
      where: { groupId: group.id },
      orderBy: { name: 'asc' },
    });
    const withCount = await Promise.all(tags.map(async (t) => {
      const movieCount = await prisma.movieTag.count({ where: { tagId: t.id } });
      return { ...t, movieCount };
    }));
    console.log('\n=== GROUP: ' + group.name + ' (' + tags.length + ' tags) ===');
    withCount.forEach(t => {
      const nameSlug = slugifyTagName(t.name);
      const isHashSlug = /^[a-f0-9]{32}$/.test(t.slug);
      const isNameSlug = t.slug === nameSlug;
      const isDuplicate = isHashSlug || isNameSlug;
      console.log('  ' + t.name + ' | slug=' + t.slug + ' | movies=' + t.movieCount + ' | ' + (isHashSlug ? 'HASH' : isNameSlug ? 'NAME_SLUG' : 'OTHER'));
    });

    // Find duplicates within this group
    const names = [...new Set(tags.map(t => t.name))];
    // Filter to names that appear more than once
    const nameCounts = {};
    tags.forEach(t => { nameCounts[t.name] = (nameCounts[t.name] || 0) + 1; });
    const dupeNames = Object.entries(nameCounts).filter(([_, count]) => count > 1).map(([name]) => name);
    
    if (dupeNames.length > 0) {
      console.log('\n  --- DUPLICATES IN GROUP "' + group.name + '" ---');
      dupeNames.forEach(name => {
        const dupes = withCount.filter(t => t.name === name);
        console.log('  "' + name + '" (' + dupes.length + ' copies):');
        dupes.forEach(t => {
          console.log('    id=' + t.id + ' slug=' + t.slug + ' movies=' + t.movieCount + ' ' + (/^[a-f0-9]{32}$/.test(t.slug) ? '[HASH]' : ''));
        });
      });
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  for (const group of groups) {
    const tags = await prisma.tag.findMany({ where: { groupId: group.id } });
    const uniqueNames = new Set(tags.map(t => t.name));
    const totalMovieTags = await prisma.movieTag.count({
      where: { tag: { groupId: group.id } },
    });
    console.log(group.name + ': ' + tags.length + ' entries, ' + uniqueNames.size + ' unique names, ' + totalMovieTags + ' MovieTag rows');
  }
}
main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect());
