import { AppError } from '@aidream/core'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { withWorkspace } from './workspace.js'

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

describe('withWorkspace', () => {
  it('성공 후 작업공간을 삭제한다', async () => {
    const root = join(tmpdir(), `aidream-workspace-test-${crypto.randomUUID()}`)
    await mkdir(root)
    let created = ''

    const result = await withWorkspace(
      'asset_1',
      async (workspace) => {
        created = workspace
        await writeFile(join(workspace, 'result.txt'), 'ok')
        return 'done'
      },
      { rootDir: root },
    )

    expect(result).toBe('done')
    await expect(exists(created)).resolves.toBe(false)
  })

  it('작업이 실패해도 작업공간을 삭제하고 원래 오류를 보존한다', async () => {
    const root = join(tmpdir(), `aidream-workspace-test-${crypto.randomUUID()}`)
    await mkdir(root)
    let created = ''
    const failure = new AppError('E_MEDIA_TRANSCODE_FAILED')

    await expect(
      withWorkspace(
        'asset_2',
        (workspace) => {
          created = workspace
          return Promise.reject(failure)
        },
        { rootDir: root },
      ),
    ).rejects.toBe(failure)
    await expect(exists(created)).resolves.toBe(false)
  })

  it('경로를 벗어나는 assetId를 거부한다', async () => {
    await expect(
      withWorkspace('../escape', () => Promise.resolve('no')),
    ).rejects.toEqual(expect.objectContaining({ code: 'E_VALIDATION' }))
  })
})
