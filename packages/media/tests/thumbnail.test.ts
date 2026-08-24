import { EventEmitter } from 'node:events'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ spawn: vi.fn() }))
vi.mock('node:child_process', () => ({ spawn: mocks.spawn }))

const { makeThumbnails } = await import('../src/thumbnail.js')

function processResult(code = 0) {
  const child = new EventEmitter() as EventEmitter & {
    stderr: PassThrough
    kill: ReturnType<typeof vi.fn>
  }
  child.stderr = new PassThrough()
  child.kill = vi.fn(() => true)
  queueMicrotask(() => {
    child.stderr.end()
    child.emit('close', code)
  })
  return child
}

function hangingProcess() {
  const child = new EventEmitter() as EventEmitter & {
    stderr: PassThrough
    kill: ReturnType<typeof vi.fn>
  }
  child.stderr = new PassThrough()
  child.kill = vi.fn((signal: string) => {
    if (signal === 'SIGKILL') queueMicrotask(() => child.emit('close', null))
    return true
  })
  return child
}

beforeEach(() => {
  mocks.spawn.mockReset()
  mocks.spawn.mockImplementation(() => processResult())
})

describe('makeThumbnails', () => {
  it('thumb 두 형식과 자동 poster를 10% 지점에서 만든다', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'aidream-thumb-test-'))
    const result = await makeThumbnails({
      inputPath: 'input.mp4',
      outDir,
      durationSec: 100,
      makeSprite: false,
      ffmpegPath: 'ffmpeg',
    })

    expect(mocks.spawn).toHaveBeenCalledTimes(3)
    expect(mocks.spawn.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining([
        '-ss',
        '10',
        'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720',
      ]),
    )
    expect(mocks.spawn.mock.calls[2]?.[1]).toEqual(
      expect.arrayContaining([
        'scale=800:1200:force_original_aspect_ratio=increase,crop=800:1200',
      ]),
    )
    expect(result).toMatchObject({ spritePath: null, spriteVttPath: null })
  })

  it('sprite와 WebVTT 좌표를 함께 만든다', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'aidream-thumb-test-'))
    const result = await makeThumbnails({
      inputPath: 'input.mp4',
      outDir,
      durationSec: 25,
      makeSprite: true,
      ffmpegPath: 'ffmpeg',
    })

    expect(mocks.spawn).toHaveBeenCalledTimes(4)
    expect(result.spriteVttPath).not.toBeNull()
    const vtt = await readFile(result.spriteVttPath ?? '', 'utf8')
    expect(vtt).toContain('WEBVTT')
    expect(vtt).toContain('00:00:20.000 --> 00:00:25.000')
    expect(vtt).toContain('sprite.jpg#xywh=320,0,160,90')
  })

  it('ffmpeg 실패를 트랜스코드 오류로 정규화한다', async () => {
    mocks.spawn.mockImplementation(() => processResult(1))
    const outDir = await mkdtemp(join(tmpdir(), 'aidream-thumb-test-'))

    await expect(
      makeThumbnails({
        inputPath: 'input.mp4',
        outDir,
        durationSec: 10,
        makeSprite: false,
        ffmpegPath: 'ffmpeg',
      }),
    ).rejects.toEqual(
      expect.objectContaining({ code: 'E_MEDIA_TRANSCODE_FAILED' }),
    )
  })

  it('잘못된 길이를 프로세스 실행 전에 거부한다', async () => {
    await expect(
      makeThumbnails({
        inputPath: 'input.mp4',
        outDir: 'out',
        durationSec: 0,
        makeSprite: false,
      }),
    ).rejects.toEqual(expect.objectContaining({ code: 'E_MEDIA_PROBE_FAILED' }))
    expect(mocks.spawn).not.toHaveBeenCalled()
  })

  it('타임아웃이면 SIGTERM 후 5초 뒤 SIGKILL한다', async () => {
    vi.useFakeTimers()
    const child = hangingProcess()
    mocks.spawn.mockReturnValue(child)
    const outDir = await mkdtemp(join(tmpdir(), 'aidream-thumb-test-'))
    const promise = makeThumbnails({
      inputPath: 'input.mp4',
      outDir,
      durationSec: 10,
      makeSprite: false,
      timeoutMs: 100,
    })
    const rejection = expect(promise).rejects.toEqual(
      expect.objectContaining({ code: 'E_MEDIA_TRANSCODE_FAILED' }),
    )

    await vi.waitFor(() => {
      expect(mocks.spawn).toHaveBeenCalledOnce()
    })
    await vi.advanceTimersByTimeAsync(5_100)
    await rejection
    expect(child.kill).toHaveBeenNthCalledWith(1, 'SIGTERM')
    expect(child.kill).toHaveBeenNthCalledWith(2, 'SIGKILL')
    vi.useRealTimers()
  })
})
