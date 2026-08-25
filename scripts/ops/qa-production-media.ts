/// <reference lib="dom" />

import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Locator,
} from '@playwright/test'

const APP_URL = process.env.QA_APP_URL ?? 'https://ilog.info'
const SERVER = process.env.QA_SSH_SERVER ?? 'root@172.233.81.32'
const SSH_KEY = process.env.QA_SSH_KEY ?? join(homedir(), '.ssh', 'id_rsa')
const VIDEO_PATH = resolve(process.argv[2] ?? 'ohhanbin_opt.mp4')
const EXISTING_ASSET_ID = process.env.QA_ASSET_ID
const EXISTING_SERIES_ID = process.env.QA_SERIES_ID
const EXISTING_EPISODE_ID = process.env.QA_EPISODE_ID
const QA_USER_ID = 'media_qa_20260826'
const QA_HANDLE = 'media_qa_20260826'
const SESSION_COOKIE = '__Secure-authjs.session-token'

function log(message: string): void {
  process.stdout.write(`[media-qa] ${message}\n`)
}

interface ApiResult<T> {
  readonly status: number
  readonly body: T
}

interface UploadComplete {
  readonly assetId: string
  readonly status: string
}

interface SeriesCreated {
  readonly id: string
}

interface EpisodeCreated {
  readonly id: string
}

interface PlaybackCheck {
  readonly profile: string
  readonly duration: number
  readonly currentTime: number
  readonly readyState: number
  readonly paused: boolean
  readonly playbackRate: number
  readonly qualityOptions: readonly string[]
  readonly playlistRequests: number
  readonly segmentRequests: number
  readonly consoleErrors: readonly string[]
  readonly failedResponses: readonly string[]
  readonly screenshot: string
}

interface MediaState {
  readonly duration: number
  readonly currentTime: number
  readonly readyState: number
  readonly paused: boolean
  readonly playbackRate: number
}

async function mediaState(video: Locator): Promise<MediaState> {
  return video.evaluate((element: HTMLVideoElement) => ({
    duration: element.duration,
    currentTime: element.currentTime,
    readyState: element.readyState,
    paused: element.paused,
    playbackRate: element.playbackRate,
  }))
}

async function waitForMedia(
  video: Locator,
  predicate: (state: MediaState) => boolean,
  description: string,
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const state = await mediaState(video)
    if (predicate(state)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for media ${description}`)
}

function sshSql(sql: string): void {
  execFileSync(
    'ssh',
    [
      '-i',
      SSH_KEY,
      '-o',
      'BatchMode=yes',
      '-o',
      'IdentitiesOnly=yes',
      SERVER,
      'docker exec -i aidream-postgres-1 psql -v ON_ERROR_STOP=1 -U aidream -d aidream',
    ],
    { input: sql, stdio: ['pipe', 'pipe', 'pipe'] },
  )
}

function createQaSession(token: string): void {
  sshSql(`
INSERT INTO "user" (
  id, handle, email, email_verified, display_name, role, status,
  follower_count, series_count, created_at, updated_at
) VALUES (
  '${QA_USER_ID}', '${QA_HANDLE}', 'media-qa-20260826@invalid.example', NOW(),
  '미디어 재생 QA', 'CREATOR', 'ACTIVE', 0, 0, NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email_verified = NOW(), role = 'CREATOR', status = 'ACTIVE', updated_at = NOW();
DELETE FROM "session" WHERE user_id = '${QA_USER_ID}';
INSERT INTO "session" (id, session_token, user_id, expires)
VALUES ('media_qa_session_20260826', '${token}', '${QA_USER_ID}', NOW() + INTERVAL '2 hours');
`)
}

function deleteQaSession(): void {
  sshSql(`DELETE FROM "session" WHERE user_id = '${QA_USER_ID}';\n`)
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true })
  } catch {
    return chromium.launch({ headless: true })
  }
}

async function api<T>(
  context: BrowserContext,
  path: string,
  body: unknown,
): Promise<ApiResult<T>> {
  const response = await context.request.post(`${APP_URL}${path}`, {
    data: body,
    headers: {
      'content-type': 'application/json',
      origin: new URL(APP_URL).origin,
    },
  })
  const text = await response.text()
  const parsed = JSON.parse(text) as T
  if (!response.ok()) {
    throw new Error(`${path} failed (${String(response.status())}): ${text}`)
  }
  return { status: response.status(), body: parsed }
}

async function checkPlayback(
  browser: Browser,
  episodeId: string,
  profile: string,
  viewport: { readonly width: number; readonly height: number },
  outputDirectory: string,
): Promise<PlaybackCheck> {
  const context = await browser.newContext({
    viewport,
    isMobile: profile === 'mobile',
    hasTouch: profile === 'mobile',
  })
  const page = await context.newPage()
  const consoleErrors: string[] = []
  const failedResponses: string[] = []
  let playlistRequests = 0
  let segmentRequests = 0

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('response', (response) => {
    const url = response.url()
    if (/\.m3u8(?:\?|$)/u.test(url)) playlistRequests += 1
    if (/\.(?:ts|m4s)(?:\?|$)/u.test(url)) segmentRequests += 1
    if (response.status() >= 400 && !url.includes('/favicon')) {
      failedResponses.push(`${String(response.status())} ${url}`)
    }
  })

  await page.goto(`${APP_URL}/watch/${episodeId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  const video = page.getByLabel('에피소드 동영상')
  await video.waitFor({ state: 'visible', timeout: 60_000 })
  await waitForMedia(video, (state) => state.readyState >= 1, 'metadata')
  await video.evaluate(async (element: HTMLVideoElement) => {
    element.muted = true
    await element.play()
  })
  await waitForMedia(video, (state) => state.currentTime >= 2, 'playback')

  await page.getByRole('button', { name: '10초 앞으로' }).click()
  await page.getByLabel('재생 속도').selectOption('1.5')
  await page.getByLabel('볼륨').fill('0.4')
  await page.waitForTimeout(2_000)

  const qualityOptions = await page
    .getByLabel('화질')
    .locator('option')
    .allTextContents()
  if (qualityOptions.length < 2) {
    throw new Error(`No HLS renditions discovered for ${profile}`)
  }

  const state = await mediaState(video)
  if (!Number.isFinite(state.duration) || state.duration <= 0) {
    throw new Error(`Invalid media duration for ${profile}`)
  }
  if (state.currentTime < 10 || state.readyState < 2 || state.paused) {
    throw new Error(`Playback interaction did not take effect for ${profile}`)
  }
  if (playlistRequests === 0 || segmentRequests === 0) {
    throw new Error(`HLS network traffic missing for ${profile}`)
  }
  if (failedResponses.length > 0) {
    throw new Error(`Playback responses failed for ${profile}`)
  }

  const screenshot = join(outputDirectory, `${profile}.png`)
  await page.screenshot({ path: screenshot, fullPage: true })
  await context.close()
  return {
    profile,
    ...state,
    qualityOptions,
    playlistRequests,
    segmentRequests,
    consoleErrors,
    failedResponses,
    screenshot,
  }
}

async function main(): Promise<void> {
  const token = randomBytes(32).toString('hex')
  const runId = new Date().toISOString().replace(/[:.]/gu, '-')
  const outputDirectory = resolve('artifacts', 'production-media-qa', runId)
  await mkdir(outputDirectory, { recursive: true })
  log('creating one-time production QA session')
  createQaSession(token)
  log('QA session ready')

  const browser = await launchBrowser()
  log('headless Chrome ready')
  try {
    const context = await browser.newContext()
    await context.addCookies([
      {
        name: SESSION_COOKIE,
        value: token,
        url: APP_URL,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
      {
        name: 'authjs.session-token',
        value: token,
        url: APP_URL,
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
    ])
    const page = await context.newPage()
    page.setDefaultTimeout(30_000)
    const browserErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() !== 'error') return
      browserErrors.push(message.text())
      log(`browser console: ${message.text()}`)
    })
    page.on('pageerror', (error) => {
      browserErrors.push(error.message)
      log(`browser page error: ${error.message}`)
    })
    log('opening production upload page')
    await page.goto(`${APP_URL}/studio/upload`, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    })
    if (new URL(page.url()).pathname !== '/studio/upload') {
      throw new Error(`Upload page redirected to ${page.url()}`)
    }
    let upload: UploadComplete
    if (EXISTING_ASSET_ID !== undefined && EXISTING_ASSET_ID !== '') {
      upload = { assetId: EXISTING_ASSET_ID, status: 'READY' }
      log(`reusing ready asset ${EXISTING_ASSET_ID}`)
    } else {
      log('upload page authenticated; starting multipart upload')
      const created = page.waitForResponse(
        (response) => {
          const url = new URL(response.url())
          return (
            response.request().method() === 'POST' &&
            url.pathname === '/api/uploads'
          )
        },
        { timeout: 60_000 },
      )
      await page.getByLabel('업로드할 영상 선택').setInputFiles(VIDEO_PATH)
      const createResponse = await created.catch((error: unknown) => {
        throw new Error(
          `Upload creation request was not observed. Browser errors: ${browserErrors.join(' | ') || 'none'}`,
          { cause: error },
        )
      })
      if (!createResponse.ok()) {
        throw new Error(
          `Upload creation failed (${String(createResponse.status())}): ${await createResponse.text()}`,
        )
      }
      log('upload session created; transferring signed parts')
      const completed = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /\/api\/uploads\/[^/]+\/complete$/u.test(response.url()),
        { timeout: 10 * 60_000 },
      )
      const completeResponse = await completed
      upload = (await completeResponse.json()) as UploadComplete
      if (!completeResponse.ok()) {
        throw new Error(
          `Upload completion failed (${String(completeResponse.status())})`,
        )
      }
      log(`multipart upload complete; asset ${upload.assetId} transcoding`)
      await page.getByText('영상 준비가 완료되었습니다').waitFor({
        state: 'visible',
        timeout: 15 * 60_000,
      })
      log('transcoding complete')
      await page.screenshot({
        path: join(outputDirectory, 'upload-ready.png'),
        fullPage: true,
      })
    }

    let seriesId: string
    let episodeId: string
    if (EXISTING_EPISODE_ID !== undefined && EXISTING_EPISODE_ID !== '') {
      seriesId = EXISTING_SERIES_ID ?? 'existing'
      episodeId = EXISTING_EPISODE_ID
      log(`reusing published episode ${episodeId}`)
    } else {
      const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ')
      const series = await api<SeriesCreated>(context, '/api/series', {
        title: `재생장치 검수 ${stamp}`,
        synopsis: '운영 HLS 변환과 데스크톱·모바일 플레이어 검수용 시리즈',
        ageRating: 'ALL',
      })
      seriesId = series.body.id
      log(`series created: ${seriesId}`)
      const episode = await api<EpisodeCreated>(context, '/api/episodes', {
        seriesId,
        seasonNumber: 1,
        number: 1,
        title: 'ohhanbin_opt 재생 검수',
        description: '실제 업로드·트랜스코드·HLS 재생장치 검수 영상',
        assetId: upload.assetId,
        ageRating: 'ALL',
        aiDisclosure: '운영 재생 검수용으로 제공된 원본 영상입니다.',
        tags: ['qa', 'player', 'device'],
      })
      episodeId = episode.body.id
      await api(context, `/api/episodes/${episodeId}/publish`, {
        action: 'PUBLISH',
      })
      log(`episode published: ${episodeId}`)
    }
    await context.close()

    log('checking desktop HLS playback and controls')
    const desktop = await checkPlayback(
      browser,
      episodeId,
      'desktop',
      { width: 1440, height: 900 },
      outputDirectory,
    )
    log('desktop playback passed; checking mobile viewport')
    const mobile = await checkPlayback(
      browser,
      episodeId,
      'mobile',
      { width: 390, height: 844 },
      outputDirectory,
    )
    log('mobile playback passed')
    const report = {
      generatedAt: new Date().toISOString(),
      appUrl: APP_URL,
      source: VIDEO_PATH,
      assetId: upload.assetId,
      seriesId,
      episodeId,
      watchUrl: `${APP_URL}/watch/${episodeId}`,
      desktop,
      mobile,
    }
    await writeFile(
      join(outputDirectory, 'report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    )
    process.stdout.write(`${JSON.stringify(report)}\n`)
  } finally {
    await browser.close()
    deleteQaSession()
    log('one-time QA session removed')
  }
}

await main()
