import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import sharp from 'sharp'

const web = fileURLToPath(new URL('../', import.meta.url))
const workspace = path.resolve(web, '..', '..')
const font = path.join(web, 'scripts/assets/og/ilog-og-sans.ttf')
const scale = 2
const width = 1200
const height = 630
const headlines = [
  ['창작은 자유롭게.', 272, 60],
  ['감상은 즐겁게.', 358, 60],
]
const alt = 'ilog — AI 영화·드라마 플랫폼. 창작은 자유롭게. 감상은 즐겁게.'

const svg = (content) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">${content}</svg>`,
  )
const escape = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

async function text(value, x, y, size, color, weight = 'normal', tracking = 0) {
  const { data, info } = await sharp({
    text: {
      text: `<span foreground="${color}" weight="${weight}" letter_spacing="${tracking}">${escape(value)}</span>`,
      font: `ilog OG Sans ${size}`,
      fontfile: font,
      dpi: 72 * scale,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true })
  if (
    x < 48 ||
    y < 48 ||
    x * scale + info.width > (width - 48) * scale ||
    y * scale + info.height > (height - 40) * scale
  ) {
    throw new Error(`OG text exceeds the safe area: ${value}`)
  }
  return { input: data, left: x * scale, top: y * scale }
}

async function main() {
  await access(font)
  const background = await sharp(
    path.join(web, 'scripts/assets/og/ilog-keyart.png'),
  )
    .resize(width * scale, height * scale, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()
  const atmosphere = svg(`
    <defs>
      <linearGradient id="left"><stop stop-color="#080808" stop-opacity=".18"/><stop offset=".50" stop-color="#080808" stop-opacity=".06"/><stop offset="1" stop-color="#080808" stop-opacity="0"/></linearGradient>
      <linearGradient id="bottom" x2="0" y2="1"><stop stop-color="#080808" stop-opacity="0"/><stop offset=".70" stop-color="#080808" stop-opacity="0"/><stop offset="1" stop-color="#080808" stop-opacity=".58"/></linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#left)"/>
    <rect width="1200" height="630" fill="url(#bottom)"/>
  `)

  const logo = await sharp(path.join(web, 'public/brand/leftlogo-display.webp'))
    .resize(540 * scale, 180 * scale)
    .png()
    .toBuffer()

  const layers = [
    { input: atmosphere, left: 0, top: 0 },
    { input: logo, left: 0, top: 14 * scale },
    await text('AI 영화·드라마 플랫폼', 64, 195, 34, '#f4b19e', 'bold'),
    ...(await Promise.all(
      headlines.map(([copy, y, size]) =>
        text(copy, 59, y, size, '#fbf7ef', 'bold', -1400),
      ),
    )),
    await text(
      'WATCH. CREATE. CONNECT.',
      64,
      501,
      18,
      '#cbc2b5',
      'normal',
      1200,
    ),
    await text('ilog.info', 64, 565, 23, '#e2d8c8', 'bold'),
  ]

  const master = await sharp(background).composite(layers).png().toBuffer()
  const production = await sharp(master)
    .resize(width, height, { kernel: 'lanczos3' })
    .png({
      palette: true,
      colours: 256,
      dither: 0.5,
      compressionLevel: 9,
      effort: 10,
    })
    .toBuffer()
  const metadata = await sharp(production).metadata()
  if (
    metadata.width !== width ||
    metadata.height !== height ||
    production.length > 600_000
  ) {
    throw new Error('OG output violates dimension or 600 KB size budget')
  }
  const output = path.join(workspace, 'output/og')
  await mkdir(output, { recursive: true })
  const target = path.join(web, 'app/opengraph-image.png')
  const sha256 = createHash('sha256').update(production).digest('hex')
  const manifest = {
    path: '/opengraph-image.png',
    revision: sha256.slice(0, 12),
    sha256,
    width,
    height,
    bytes: production.length,
    alt,
  }
  await writeFile(path.join(output, 'ilog-social-master.png'), master)
  await sharp(production)
    .resize(320, 168)
    .png()
    .toFile(path.join(output, 'ilog-social-preview-320.png'))
  await writeFile(target, production)
  await writeFile(path.join(web, 'app/opengraph-image.alt.txt'), `${alt}\n`)
  await writeFile(
    path.join(web, 'src/lib/seo/og-image.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  process.stdout.write(
    `OG generated: ${width}x${height}, ${String(production.length)} bytes\n${target}\n`,
  )
}

await main()
