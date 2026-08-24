import { AppError } from '@aidream/core'
import { spawn } from 'node:child_process'
import { access, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildLadder } from '../src/ladder.js'
import { probe } from '../src/probe.js'
import { makeThumbnails } from '../src/thumbnail.js'
import { transcodeToHls } from '../src/transcode-hls.js'

function run(binary: string, args: readonly string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, [...args], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.once('error', reject)
    child.once('close', (code) => {
      if (code === 0) resolve()
      else
        reject(
          new AppError(
            'E_MEDIA_TRANSCODE_FAILED',
            undefined,
            new Error(stderr),
          ),
        )
    })
  })
}

describe('actual ffmpeg pipeline', () => {
  it('lavfi fixture를 probe하고 HLS와 썸네일로 변환한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-ffmpeg-integration-'))
    const inputPath = join(root, 'input.mp4')
    const hlsDir = join(root, 'hls')
    const thumbsDir = join(root, 'thumbs')
    const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg'
    const ffprobePath = process.env.FFPROBE_PATH ?? 'ffprobe'
    await run(ffmpegPath, [
      '-hide_banner',
      '-nostdin',
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=640x360:rate=24',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=1000:sample_rate=48000',
      '-t',
      '2',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      inputPath,
    ])

    const metadata = await probe(inputPath, { ffprobePath })
    expect(metadata).toMatchObject({
      width: 640,
      height: 360,
      videoCodec: 'h264',
      audioCodec: 'aac',
    })
    const hls = await transcodeToHls(
      {
        inputPath,
        outDir: hlsDir,
        ladder: buildLadder(640, 360, ['360p']),
        rotation: metadata.rotation,
      },
      {
        durationSec: metadata.durationSec,
        timeoutMs: 30_000,
        ffmpegPath,
      },
    )
    await expect(access(hls.masterPath)).resolves.toBeUndefined()
    await expect(
      access(join(hlsDir, '360p', 'seg_00000.ts')),
    ).resolves.toBeUndefined()

    const thumbnails = await makeThumbnails({
      inputPath,
      outDir: thumbsDir,
      durationSec: metadata.durationSec,
      makeSprite: true,
      ffmpegPath,
      timeoutMs: 30_000,
    })
    await expect(access(thumbnails.thumbJpegPath)).resolves.toBeUndefined()
    await expect(access(thumbnails.posterPath)).resolves.toBeUndefined()
    await expect(
      access(thumbnails.spriteVttPath ?? ''),
    ).resolves.toBeUndefined()
  }, 45_000)
})
