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
  const fieldTokens = tokenize(searchableFields);

  let score = 0;

  // Exact name match
  if (normalizedName === normalizedQuery) score += 100;

  // Slug matches query
  if (normalizedSlug === normalizedQuery) score += 95;

  // Name starts with query
  if (normalizedName.startsWith(normalizedQuery)) score += 70;

  // Original name exact match
  if (normalizedOriginal === normalizedQuery) score += 60;

  // Original name starts with query
  if (normalizedOriginal.startsWith(normalizedQuery)) score += 55;

  // Contains full phrase in name
  if (normalizedName.includes(normalizedQuery)) score += 50;

  // Original name contains full phrase
  if (normalizedOriginal.includes(normalizedQuery)) score += 45;

  // Individual token matches in name
  for (const token of queryTokens) {
    if (normalizedName.includes(token)) score += 10;
  }

  // Match in auxiliary fields (cast, genre, director, etc.)
  const fullPhraseInFields = normalizedFields.includes(normalizedQuery);
  if (fullPhraseInFields) score += 20;

  // Partial match in auxiliary fields
  for (const token of queryTokens) {
    if (normalizedFields.includes(token)) score += 3;
  }

  return score;
}
