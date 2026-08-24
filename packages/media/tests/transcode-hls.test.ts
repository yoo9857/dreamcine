import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ spawn: vi.fn() }))
vi.mock('node:child_process', () => ({ spawn: mocks.spawn }))

const { buildLadder } = await import('../src/ladder.js')
const { transcodeToHls } = await import('../src/transcode-hls.js')

function fakeProcess(stderr: string, code: number, closeDelayMs = 0) {
  const child = new EventEmitter() as EventEmitter & {
    stderr: PassThrough
    kill: ReturnType<typeof vi.fn>
  }
  child.stderr = new PassThrough()
  child.kill = vi.fn(() => true)
  setTimeout(() => {
    child.stderr.end(stderr)
    child.emit('close', code)
  }, closeDelayMs)
  return child
}

async function outputFixture() {
  const outDir = await mkdtemp(join(tmpdir(), 'aidream-hls-test-'))
  await writeFile(join(outDir, 'master.m3u8'), '#EXTM3U')
  for (const name of ['720p', '360p']) {
    const dir = join(outDir, name)
    await mkdir(dir)
    await writeFile(join(dir, 'index.m3u8'), '#EXTM3U')
    await writeFile(join(dir, 'seg_00001.ts'), 'segment')
  }
  return outDir
}

beforeEach(() => {
  mocks.spawn.mockReset()
  vi.useRealTimers()
})

describe('transcodeToHls', () => {
  it('진행률을 단조 증가시키고 생성 파일 크기를 실측한다', async () => {
    const outDir = await outputFixture()
    const progress: number[] = []
    mocks.spawn.mockImplementation(() =>
      fakeProcess(
        'out_time_us=1000000\nout_time_us=500000\nout_time_us=10000000\n',
        0,
      ),
    )

    const result = await transcodeToHls(
      {
        inputPath: 'input.mp4',
        outDir,
        ladder: buildLadder(1280, 720, ['720p', '360p']),
        rotation: 0,
      },
      {
        durationSec: 10,
        timeoutMs: 10_000,
        ffmpegPath: 'ffmpeg',
        onProgress: (p) => progress.push(p),
      },
    )

    expect(result.renditions).toHaveLength(2)
    expect(result.totalBytes).toBeGreaterThan(0)
    expect(progress).toEqual([10, 100])
    expect(mocks.spawn).toHaveBeenCalledWith(
      'ffmpeg',
      expect.arrayContaining(['-nostdin', '-progress', 'pipe:2']),
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
  })

  it('비정상 종료를 stderr 패턴의 코드로 분류한다', async () => {
    mocks.spawn.mockImplementation(() =>
      fakeProcess('No space left on device', 1),
    )

    await expect(
      transcodeToHls(
        {
          inputPath: 'input.mp4',
          outDir: 'out',
          ladder: buildLadder(1280, 720, ['720p']),
          rotation: 0,
        },
        { durationSec: 10, timeoutMs: 10_000 },
      ),
    ).rejects.toEqual(expect.objectContaining({ code: 'E_MEDIA_DISK_FULL' }))
  })

  it('타임아웃이면 SIGTERM 후 timeout 코드로 실패한다', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof fakeProcess> | undefined
    mocks.spawn.mockImplementation(() => {
      child = fakeProcess('', 1, 20_000)
      return child
    })
    const promise = transcodeToHls(
      {
        inputPath: 'input.mp4',
        outDir: 'out',
        ladder: buildLadder(1280, 720, ['720p']),
        rotation: 0,
      },
      { durationSec: 10, timeoutMs: 100 },
    )
    const rejection = expect(promise).rejects.toEqual(
      expect.objectContaining({ code: 'E_MEDIA_TRANSCODE_TIMEOUT' }),
    )

    await vi.waitFor(() => {
      expect(mocks.spawn).toHaveBeenCalledOnce()
    })
    await vi.advanceTimersByTimeAsync(20_000)
    await rejection
    expect(child?.kill).toHaveBeenNthCalledWith(1, 'SIGTERM')
    expect(child?.kill).toHaveBeenNthCalledWith(2, 'SIGKILL')
  })

  it('잘못된 실행 옵션을 외부 프로세스 전에 거부한다', async () => {
    await expect(
      transcodeToHls(
        {
          inputPath: 'input.mp4',
          outDir: 'out',
          ladder: buildLadder(1280, 720, ['720p']),
          rotation: 0,
        },
        { durationSec: 0, timeoutMs: 100 },
      ),
    ).rejects.toEqual(expect.objectContaining({ code: 'E_VALIDATION' }))
    expect(mocks.spawn).not.toHaveBeenCalled()
  })
})
