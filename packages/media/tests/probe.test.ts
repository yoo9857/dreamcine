import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
}))

vi.mock('node:child_process', () => ({ spawn: mocks.spawn }))

const { probe } = await import('../src/probe.js')

function processResult(stdout: string, code = 0) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough
    stderr: PassThrough
  }
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  queueMicrotask(() => {
    child.stdout.end(stdout)
    child.stderr.end(code === 0 ? '' : 'ffprobe failed for a private path')
    child.emit('close', code)
  })
  return child
}

beforeEach(() => {
  mocks.spawn.mockReset()
})

describe('probe', () => {
  it('ffprobe JSON을 도메인 메타데이터로 변환한다', async () => {
    mocks.spawn.mockReturnValue(
      processResult(
        JSON.stringify({
          streams: [
            {
              codec_type: 'video',
              codec_name: 'h264',
              width: 1280,
              height: 720,
              avg_frame_rate: '24000/1001',
            },
            { codec_type: 'audio', codec_name: 'aac' },
          ],
          format: { duration: '12.5', bit_rate: '3000000' },
        }),
      ),
    )

    await expect(probe('/private/input.mp4')).resolves.toEqual({
      durationSec: 12.5,
      width: 1280,
      height: 720,
      videoCodec: 'h264',
      audioCodec: 'aac',
      bitrateKbps: 3000,
      frameRate: 24000 / 1001,
      hasAudio: true,
      rotation: 0,
    })
    expect(mocks.spawn).toHaveBeenCalledWith(
      'ffprobe',
      expect.arrayContaining(['-print_format', 'json', '/private/input.mp4']),
      expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] }),
    )
  })

  it.each([
    [90, 720, 1280],
    [-90, 720, 1280],
  ])(
    '회전 %d도 영상은 표시 치수로 교환한다',
    async (rotation, width, height) => {
      mocks.spawn.mockReturnValue(
        processResult(
          JSON.stringify({
            streams: [
              {
                codec_type: 'video',
                codec_name: 'h264',
                width: 1280,
                height: 720,
                r_frame_rate: '30/1',
                side_data_list: [{ rotation }],
              },
            ],
            format: { duration: 10 },
          }),
        ),
      )

      await expect(probe('vertical.mp4')).resolves.toMatchObject({
        width,
        height,
        rotation: rotation === -90 ? 270 : 90,
      })
    },
  )

  it('스트림 부재는 정책 검증이 분류할 수 있는 결과로 반환한다', async () => {
    mocks.spawn.mockReturnValue(
      processResult(JSON.stringify({ streams: [], format: {} })),
    )

    await expect(probe('empty.mp4')).resolves.toMatchObject({
      videoCodec: '',
      audioCodec: null,
      hasAudio: false,
    })
  })

  it.each([
    ['비정상 종료', '{}', 1],
    ['깨진 JSON', '{not-json', 0],
  ])('%s를 probe 오류로 정규화한다', async (_, stdout, code) => {
    mocks.spawn.mockReturnValue(processResult(stdout, code))

    await expect(probe('broken.mp4')).rejects.toEqual(
      expect.objectContaining({ code: 'E_MEDIA_PROBE_FAILED' }),
    )
  })

  it('실행 파일 시작 실패를 probe 오류로 정규화한다', async () => {
    const child = processResult('')
    queueMicrotask(() => child.emit('error', new Error('ENOENT')))
    mocks.spawn.mockReturnValue(child)

    await expect(probe('input.mp4')).rejects.toEqual(
      expect.objectContaining({ code: 'E_MEDIA_PROBE_FAILED' }),
    )
  })
})
