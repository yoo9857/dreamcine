export function toSlug(_title: string): string {
  const slug = _title
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .trim()
    .replace(/\s+/gu, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '')
  return slug === '' ? 'series' : slug
}

export function ensureUniqueSlug(
  base: string,
  taken: (slug: string) => Promise<boolean>,
): Promise<string> {
  return findUniqueSlug(base, taken)
}

async function findUniqueSlug(
  base: string,
  taken: (slug: string) => Promise<boolean>,
): Promise<string> {
  if (!(await taken(base))) return base
  for (let suffix = 2; suffix <= 100; suffix += 1) {
    const candidate = `${base}-${String(suffix)}`
    if (!(await taken(candidate))) return candidate
  }
  const randomSuffix = Math.random().toString(36).slice(2, 8).padEnd(6, '0')
  return `${base}-${randomSuffix}`
}
