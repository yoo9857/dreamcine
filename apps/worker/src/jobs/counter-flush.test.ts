import { describe, expect, it, vi } from 'vitest'

import { counterFlushJob, type CounterFlushDependencies } from './counter-flush'

const TOKEN = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

function dependencies(): CounterFlushDependencies {
  return {
    scanPending: vi.fn().mockResolvedValue({ cursor: '0', keys: [] }),
    scanFresh: vi
      .fn()
      .mockResolvedValue({ cursor: '0', keys: ['viewbuf:episode'] }),
    readPending: vi.fn().mockResolvedValue(null),
    claim: vi.fn().mockResolvedValue(`${TOKEN}:7`),
    apply: vi.fn().mockResolvedValue('applied'),
    release: vi.fn().mockResolvedValue(undefined),
    purgeReceipts: vi.fn().mockResolvedValue(0),
  }
}

describe('counterFlushJob', () => {
  it('대기 중인 청구를 버퍼보다 먼저 한 번만 반영한다', async () => {
    const deps = dependencies()
    vi.mocked(deps.scanPending).mockResolvedValue({
      cursor: '0',
      keys: ['viewpending:episode'],
    })
    vi.mocked(deps.readPending).mockResolvedValue(`${OTHER}:4`)
    vi.mocked(deps.scanFresh).mockResolvedValue({
      cursor: '0',
      keys: ['viewbuf:other'],
    })
    vi.mocked(deps.claim).mockResolvedValue(`${TOKEN}:7`)
    await expect(counterFlushJob(deps)).resolves.toEqual({
      flushed: 2,
      duplicates: 0,
    })
    expect(deps.apply).toHaveBeenNthCalledWith(1, 'episode', OTHER, 4n)
    expect(deps.apply).toHaveBeenNthCalledWith(2, 'other', TOKEN, 7n)
    expect(deps.release).toHaveBeenNthCalledWith(1, 'viewpending:episode')
    expect(deps.release).toHaveBeenNthCalledWith(2, 'viewpending:other')
    const purgeReceipts = deps.purgeReceipts
    if (purgeReceipts === undefined) throw new Error('purge missing')
    expect(purgeReceipts).toHaveBeenCalledOnce()
    const olderThan = vi.mocked(purgeReceipts).mock.calls[0]?.[0]
    expect(olderThan).toBeInstanceOf(Date)
    if (!(olderThan instanceof Date)) throw new Error('cutoff missing')
    expect(Date.now() - olderThan.getTime()).toBeGreaterThan(
      6 * 24 * 60 * 60 * 1000,
    )
  })

  it('이미 반영된 청구는 다시 더하지 않고 대기 키만 지운다', async () => {
    const deps = dependencies()
    vi.mocked(deps.apply).mockResolvedValue('duplicate')
    await expect(counterFlushJob(deps)).resolves.toEqual({
      flushed: 0,
      duplicates: 1,
    })
    expect(deps.release).toHaveBeenCalledWith('viewpending:episode')
  })

  it('반영에 실패하면 대기 키를 버퍼로 되돌리지 않는다', async () => {
    const deps = dependencies()
    vi.mocked(deps.apply).mockRejectedValue(new Error('db down'))
    const refreshAverages = vi.fn().mockResolvedValue(0)
    await expect(counterFlushJob({ ...deps, refreshAverages })).rejects.toThrow(
      'db down',
    )
    expect(deps.release).not.toHaveBeenCalled()
    expect(deps.purgeReceipts).not.toHaveBeenCalled()
    expect(refreshAverages).toHaveBeenCalledOnce()
  })

  it('조회 반영 뒤 최근 시청 평균을 고친다', async () => {
    const refreshAverages = vi.fn().mockResolvedValue(1)
    await counterFlushJob({ ...dependencies(), refreshAverages })
    expect(refreshAverages).toHaveBeenCalledOnce()
    expect(refreshAverages.mock.calls[0]?.[0]).toBeInstanceOf(Date)
  })

  it('빈 버퍼와 이미 사라진 대기 키는 건너뛴다', async () => {
    const deps = dependencies()
    vi.mocked(deps.scanPending).mockResolvedValue({
      cursor: '0',
      keys: ['viewpending:gone'],
    })
    vi.mocked(deps.readPending).mockResolvedValue(null)
    vi.mocked(deps.claim).mockResolvedValue(null)
    await expect(counterFlushJob(deps)).resolves.toEqual({
      flushed: 0,
      duplicates: 0,
    })
    expect(deps.apply).not.toHaveBeenCalled()
    expect(deps.release).not.toHaveBeenCalled()
  })

  it('깨진 청구는 지우고 안전한 정수 조회만 반영한다', async () => {
    const deps = dependencies()
    vi.mocked(deps.scanPending).mockResolvedValue({
      cursor: '0',
      keys: [
        'viewpending:bad',
        'viewpending:token',
        'viewpending:zero',
        'viewpending:huge',
      ],
    })
    vi.mocked(deps.scanFresh).mockResolvedValue({ cursor: '0', keys: [] })
    vi.mocked(deps.readPending).mockImplementation((key) => {
      if (key.endsWith('bad')) return Promise.resolve('nope')
      if (key.endsWith('token')) return Promise.resolve('not-a-uuid:3')
      if (key.endsWith('zero')) return Promise.resolve(`${TOKEN}:0`)
      return Promise.resolve(`${TOKEN}:9007199254740993`)
    })
    await expect(counterFlushJob(deps)).resolves.toEqual({
      flushed: 1,
      duplicates: 0,
    })
    expect(deps.apply).toHaveBeenCalledTimes(1)
    expect(deps.apply).toHaveBeenCalledWith('huge', TOKEN, 9007199254740993n)
    expect(deps.release).toHaveBeenCalledTimes(4)
  })

  it('스캔 커서가 남아 있으면 다음 페이지를 읽는다', async () => {
    const deps = dependencies()
    vi.mocked(deps.scanFresh)
      .mockResolvedValueOnce({ cursor: '5', keys: ['viewbuf:one'] })
      .mockResolvedValueOnce({ cursor: '0', keys: ['viewbuf:two'] })
    vi.mocked(deps.claim).mockImplementation((key) =>
      Promise.resolve(key.endsWith('one') ? `${TOKEN}:1` : `${OTHER}:2`),
    )
    await expect(counterFlushJob(deps)).resolves.toEqual({
      flushed: 2,
      duplicates: 0,
    })
    expect(deps.scanFresh).toHaveBeenCalledTimes(2)
    expect(deps.apply).toHaveBeenNthCalledWith(1, 'one', TOKEN, 1n)
    expect(deps.apply).toHaveBeenNthCalledWith(2, 'two', OTHER, 2n)
  })

  it('접두사가 아닌 키에서 멈춘다', async () => {
    const deps = dependencies()
    vi.mocked(deps.scanPending).mockResolvedValue({
      cursor: '0',
      keys: ['other'],
    })
    await expect(counterFlushJob(deps)).rejects.toThrow('unexpected view key')
    expect(deps.apply).not.toHaveBeenCalled()
    expect(deps.purgeReceipts).not.toHaveBeenCalled()
  })

  it('회차 번호가 비어 있으면 멈춘다', async () => {
    const deps = dependencies()
    vi.mocked(deps.scanFresh).mockResolvedValue({
      cursor: '0',
      keys: ['viewbuf:'],
    })
    await expect(counterFlushJob(deps)).rejects.toThrow('unexpected view key')
    expect(deps.claim).not.toHaveBeenCalled()
  })

  it('오류가 Error가 아니면 반영 실패로 감싼다', async () => {
    const deps = dependencies()
    vi.mocked(deps.apply).mockRejectedValue('db down')
    await expect(counterFlushJob(deps)).rejects.toThrow('counter flush failed')
    expect(deps.release).not.toHaveBeenCalled()
  })
})
