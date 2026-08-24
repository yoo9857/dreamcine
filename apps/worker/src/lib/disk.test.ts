import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

import { checkDisk } from './disk.js'

describe('checkDisk', () => {
  it('작은 원본을 위한 실제 임시공간을 확인한다', async () => {
    await expect(checkDisk(tmpdir(), 1)).resolves.toBeUndefined()
  })

  it('가용 공간보다 큰 요구량을 정확한 코드로 거부한다', async () => {
    await expect(
      checkDisk(tmpdir(), Math.floor(Number.MAX_SAFE_INTEGER / 3)),
    ).rejects.toEqual(expect.objectContaining({ code: 'E_MEDIA_DISK_FULL' }))
  })

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER])(
    '잘못된 원본 크기 %s를 거부한다',
    async (size) => {
      await expect(checkDisk(tmpdir(), size)).rejects.toEqual(
        expect.objectContaining({ code: 'E_VALIDATION' }),
      )
    },
  )

  it('파일시스템 조회 실패를 디스크 오류로 정규화한다', async () => {
    await expect(checkDisk('/definitely/missing/aidream', 1)).rejects.toEqual(
      expect.objectContaining({ code: 'E_MEDIA_DISK_FULL' }),
    )
  })
})
