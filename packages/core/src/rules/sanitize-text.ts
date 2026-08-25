const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\u2060\uFEFF]/gu
const EXCESSIVE_NEWLINES = /\n{3,}/gu

export function sanitizeUserText(value: string): string {
  return value
    .replace(/\r\n?/gu, '\n')
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0)
      return !(
        code <= 8 ||
        (code >= 11 && code <= 12) ||
        (code >= 14 && code <= 31) ||
        code === 127
      )
    })
    .join('')
    .replace(ZERO_WIDTH_CHARACTERS, '')
    .replace(EXCESSIVE_NEWLINES, '\n\n')
    .trim()
}
