import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { checkObservabilityContract } from './check-observability.js'

describe('observability contract', () => {
  it('accepts the repository monitoring configuration', async () => {
    await expect(checkObservabilityContract()).resolves.toEqual({
      ok: true,
      problems: [],
    })
  })

  it('rejects an alert without a runbook', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-observability-'))
    await cp(join(process.cwd(), 'infra'), join(root, 'infra'), {
      recursive: true,
    })
    const path = join(root, 'infra', 'monitoring', 'alerts.yml')
    const source = await readFile(path, 'utf8')
    await writeFile(path, source.replace(/runbook:/u, 'missing-runbook:'))
    const result = await checkObservabilityContract(root)
    expect(result.ok).toBe(false)
    expect(result.problems.join(' ')).toContain('runbook')
  })
})
