import { AppError } from '../errors/app-error.js'

export function normalizeTag(tag: string): string {
  const normalized = tag
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .trim()
    .replace(/\s+/gu, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '')
  const limited = Array.from(normalized)
    .slice(0, 24)
    .join('')
    .replace(/-$/u, '')
  if (limited === '') {
    throw new AppError('E_VALIDATION', { fields: ['tags'] })
  }
  return limited
}
