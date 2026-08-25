import { describe, expect, it } from 'vitest'

import { sanitizeUserText } from './sanitize-text'

describe('sanitizeUserText', () => {
  it('removes control and zero-width characters and normalizes line endings', () => {
    expect(sanitizeUserText('  안\u0000녕\u200B\r\n하세요  ')).toBe(
      '안녕\n하세요',
    )
  })

  it('keeps tabs and collapses three or more newlines to two', () => {
    expect(sanitizeUserText('첫째\t줄\n\n\n\n둘째 줄')).toBe(
      '첫째\t줄\n\n둘째 줄',
    )
  })

  it('returns an empty string when only forbidden characters remain', () => {
    expect(sanitizeUserText('\u0000\u200D')).toBe('')
  })
})
