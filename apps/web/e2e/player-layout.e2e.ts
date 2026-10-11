import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const css = ['player.css', 'watch-experience.css']
  .map((file) => readFileSync(resolve('apps/web/src/styles', file), 'utf8'))
  .join('\n')
for (const width of [320, 390, 1000, 1440]) {
  test(`video occupies its entire frame at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.setContent(
      `<style>body{margin:0} ${css}</style><div class="watch-player-shell" style="box-sizing:border-box;width:100%"><div class="ilog-player"><video class="ilog-player-video"></video></div></div>`,
    )
    const video = await page.locator('video').boundingBox()
    const frame = await page.locator('.ilog-player').boundingBox()
    expect(video).not.toBeNull()
    expect(frame).not.toBeNull()
    expect(video?.x).toBe(frame?.x)
    expect(video?.y).toBe(frame?.y)
    expect(video?.width).toBe(frame?.width)
    expect(video?.height).toBe(frame?.height)
    expect(
      await page
        .locator('video')
        .evaluate((element) => getComputedStyle(element).objectFit),
    ).toBe('contain')
  })
}

test('live watch playback stays aligned in normal and fullscreen modes', async ({
  page,
}, testInfo) => {
  test.skip(
    process.env.WATCH_QA_LIVE !== '1',
    'Requires the reported production episode',
  )
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/watch/cmtl395df0013oa012exnoupq')
    const video = page.locator('.ilog-player-video')
    await expect(video).toBeVisible()
    await expect
      .poll(() =>
        video.evaluate((element: HTMLVideoElement) => element.videoWidth),
      )
      .toBeGreaterThan(0)
    const box = await video.boundingBox()
    expect(box).toEqual(await page.locator('.ilog-player').boundingBox())
    await expect(page.getByText('NOW PLAYING', { exact: true })).toHaveCount(0)
    await expect(page.locator('.watch-production-details time')).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath(`watch-${String(width)}.png`),
      fullPage: true,
    })
  }
  const video = page.locator('.ilog-player-video')
  if (await video.evaluate((element: HTMLVideoElement) => element.paused))
    await page.locator('.ilog-player-center-action').click()
  const time = await video.evaluate(
    (element: HTMLVideoElement) => element.currentTime,
  )
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(time + 0.2)
  await page.locator('.ilog-player').hover()
  await page.getByRole('button', { name: '전체 화면', exact: true }).click()
  await expect
    .poll(() =>
      page
        .locator('.ilog-player')
        .evaluate((element) => document.fullscreenElement === element),
    )
    .toBe(true)
  expect(await video.boundingBox()).toEqual(
    await page.locator('.ilog-player').boundingBox(),
  )
  await page.keyboard.press('Escape')
  expect(errors).toEqual([])
})
