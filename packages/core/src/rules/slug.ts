import { NotImplementedError } from '../errors/not-implemented.js'

export function toSlug(_title: string): string {
  throw new NotImplementedError('T08:toSlug')
}

export function ensureUniqueSlug(
  _base: string,
  _taken: (slug: string) => Promise<boolean>,
): Promise<string> {
  throw new NotImplementedError('T08:ensureUniqueSlug')
}
