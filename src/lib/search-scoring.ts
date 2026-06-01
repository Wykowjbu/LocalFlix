export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function normalizeForSearch(str: string): string {
  return removeVietnameseAccents(str)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(str: string): string[] {
  return normalizeForSearch(str).split(' ').filter(Boolean);
}

export function generateSearchText(
  name: string,
  originalName: string | null | undefined,
  slug: string,
): string {
  const parts = [
    normalizeForSearch(name),
    originalName ? normalizeForSearch(originalName) : '',
    slug,
  ].filter(Boolean);
  return parts.join(' ');
}

export function generateSearchTextWithTags(
  name: string,
  originalName: string | null | undefined,
  slug: string,
  tags: { name: string }[],
): string {
  const parts = [
    normalizeForSearch(name),
    originalName ? normalizeForSearch(originalName) : '',
    slug,
    ...tags.map((t) => normalizeForSearch(t.name)),
  ].filter(Boolean);
  return parts.join(' ');
}

export type ScorableMovie = {
  name: string;
  originalName?: string | null;
  slug: string;
  description?: string | null;
  director?: string | null;
  casts?: string | null;
  language?: string | null;
  quality?: string | null;
  tags?: { tag: { name: string; group: { name: string } } }[];
};

export function scoreMovie(
  movie: ScorableMovie,
  normalizedQuery: string,
  queryTokens: string[]
): number {
  const normalizedName = normalizeForSearch(movie.name);
  const normalizedOriginal = movie.originalName ? normalizeForSearch(movie.originalName) : '';
  const normalizedSlug = movie.slug;

  const searchableFields = [
    movie.description,
    movie.director,
    movie.casts,
    movie.language,
    movie.quality,
    ...(movie.tags ?? []).map((mt) => mt.tag.name),
    ...(movie.tags ?? []).map((mt) => mt.tag.group.name),
  ]
    .filter(Boolean)
    .join(' ');

  const normalizedFields = normalizeForSearch(searchableFields);

  let score = 0;

  if (normalizedName === normalizedQuery) score += 100;
  if (normalizedSlug === normalizedQuery) score += 95;
  if (normalizedName.startsWith(normalizedQuery)) score += 70;
  if (normalizedOriginal === normalizedQuery) score += 60;
  if (normalizedOriginal.startsWith(normalizedQuery)) score += 55;
  if (normalizedName.includes(normalizedQuery)) score += 50;
  if (normalizedOriginal.includes(normalizedQuery)) score += 45;

  for (const token of queryTokens) {
    if (normalizedName.includes(token)) score += 10;
  }

  if (normalizedFields.includes(normalizedQuery)) score += 20;
  for (const token of queryTokens) {
    if (normalizedFields.includes(token)) score += 3;
  }

  return score;
}

// Lightweight search types for optimized search flow
export type SearchMovieLight = {
  slug: string;
  name: string;
  originalName: string | null;
  tags: { tag: { name: string; group: { name: string } } }[];
};

export type PreparedMovie = {
  movie: SearchMovieLight;
  normName: string;
  normOriginal: string;
  normTags: string;
};

export function prepareMovie(movie: SearchMovieLight): PreparedMovie {
  return {
    movie,
    normName: normalizeForSearch(movie.name),
    normOriginal: movie.originalName ? normalizeForSearch(movie.originalName) : '',
    normTags: normalizeForSearch(
      (movie.tags ?? [])
        .flatMap((mt) => [mt.tag.name, mt.tag.group.name])
        .join(' ')
    ),
  };
}

export function scorePrepared(
  item: PreparedMovie,
  normalizedQuery: string,
  queryTokens: string[]
): number {
  const { normName, normOriginal, movie } = item;
  let score = 0;

  if (normName === normalizedQuery) score += 100;
  if (movie.slug === normalizedQuery) score += 95;
  if (normName.startsWith(normalizedQuery)) score += 70;
  if (normOriginal === normalizedQuery) score += 60;
  if (normOriginal.startsWith(normalizedQuery)) score += 55;
  if (normName.includes(normalizedQuery)) score += 50;
  if (normOriginal.includes(normalizedQuery)) score += 45;

  for (const token of queryTokens) {
    if (normName.includes(token)) score += 10;
  }

  if (item.normTags.includes(normalizedQuery)) score += 20;
  for (const token of queryTokens) {
    if (item.normTags.includes(token)) score += 3;
  }

  return score;
}
