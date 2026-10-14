import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import manifest from './og-image.json'

describe('approved social image release', () => {
  it('matches the checked-in PNG to its cache revision, dimensions and transfer budget', () => {
    const png = readFileSync(
      new URL('../../../app/opengraph-image.png', import.meta.url),
    )
    const hash = createHash('sha256').update(png).digest('hex')
    expect(manifest.sha256).toBe(hash)
    expect(manifest.revision).toBe(hash.slice(0, 12))
    expect(manifest.bytes).toBe(png.length)
    expect(png.length).toBeLessThan(600_000)
    expect(png.readUInt32BE(16)).toBe(manifest.width)
    expect(png.readUInt32BE(20)).toBe(manifest.height)
    expect([manifest.width, manifest.height]).toEqual([1200, 630])
  })
  it('publishes the approved slogan consistently in file-based metadata', () => {
    const alt = readFileSync(
      new URL('../../../app/opengraph-image.alt.txt', import.meta.url),
      'utf8',
    ).trim()
    expect(alt).toBe(manifest.alt)
    expect(alt).toContain('창작은 자유롭게. 감상은 즐겁게.')
  })
})
