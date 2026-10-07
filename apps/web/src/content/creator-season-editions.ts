/** Published monthly selections. Keep past editions when adding a new month. */
export const creatorSeasonEditions: Readonly<
  Record<string, readonly string[]>
> = {
  '2026.10': ['hanbin9857', 'kedrael', 'higgsfield'],
}

export function creatorSeasonAwards(handle: string): readonly string[] {
  return Object.entries(creatorSeasonEditions)
    .filter(([, handles]) => handles.includes(handle))
    .map(([edition]) => edition)
    .sort()
    .reverse()
}
