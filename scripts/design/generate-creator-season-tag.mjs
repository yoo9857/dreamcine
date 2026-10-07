import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

const requireWeb = createRequire(
  new URL('../../apps/web/package.json', import.meta.url),
)
const sharp = requireWeb('sharp')

// One month: node scripts/design/generate-creator-season-tag.mjs 2026 10
// Full year: node scripts/design/generate-creator-season-tag.mjs 2026 all
const [year = '2026', month = '10'] = process.argv.slice(2)
if (
  !/^\d{4}$/u.test(year) ||
  (month !== 'all' && !/^(?:0?[1-9]|1[0-2])$/u.test(month))
) {
  throw new Error(
    'Usage: node scripts/design/generate-creator-season-tag.mjs YYYY MM|all',
  )
}
const output = new URL('../../apps/web/public/brand/tags/', import.meta.url)
await mkdir(output, { recursive: true })

const seasons = {
  spring: {
    name: 'SPRING',
    colors: ['#e8fae7', '#8cc2a3', '#d1ebcf', '#407260', '#89bda1', '#e2f6d8'],
    accent: '#a6d6b0',
    icon: '<path d="M0-10C7-14 10-7 5-2C14-3 15 5 8 7C10 15 1 16 0 8C-5 15-12 10-8 4C-17 2-12-7-5-3C-8-12-1-16 0-10Z"/><circle r="2.5"/>',
  },
  summer: {
    name: 'SUMMER',
    colors: ['#fff2cc', '#cfab60', '#f7e6b3', '#8c6832', '#d1ac63', '#fff0c2'],
    accent: '#e6c379',
    icon: '<circle r="5"/><path d="M0-12V-9M0 9V12M-12 0H-9M9 0H12M-9-9-6-6M6 6 9 9M-9 9-6 6M6-6 9-9"/>',
  },
  autumn: {
    name: 'AUTUMN',
    colors: ['#ffe8cc', '#c38a53', '#f4d2a9', '#815134', '#c88e55', '#ffdfb6'],
    accent: '#e5aa73',
    icon: '<path d="M-9 8C-13-8-2-13 10-10C14 4 3 12-9 8ZM-9 8 6-6M-3 2V-5M2-3H8"/>',
  },
  winter: {
    name: 'WINTER',
    colors: ['#eefaff', '#8eb8d8', '#cceafa', '#476585', '#93bddb', '#e4f5ff'],
    accent: '#acd8f3',
    icon: '<path d="M0-12V12M-10-6 10 6M-10 6 10-6M-3-9 0-6 3-9M-3 9 0 6 3 9M-9-2-5-3-6-7M9 2 5 3 6 7M-9 2-5 3-6 7M9-2 5-3 6-7"/>',
  },
}
const seasonFor = (value) =>
  value >= 3 && value <= 5
    ? seasons.spring
    : value >= 6 && value <= 8
      ? seasons.summer
      : value >= 9 && value <= 11
        ? seasons.autumn
        : seasons.winter

function artwork(caption, monthValue = 0) {
  const style = monthValue === 0 ? seasons.summer : seasonFor(monthValue)
  const markers = Array.from({ length: 12 }, (_, index) => {
    const angle = ((index * 30 - 90) * Math.PI) / 180
    const x = (120 + Math.cos(angle) * 47).toFixed(2)
    const y = (124 + Math.sin(angle) * 47).toFixed(2)
    return `<circle cx="${x}" cy="${y}" r="${index + 1 === monthValue ? '2.8' : '1.1'}" fill="${style.accent}" opacity="${index + 1 === monthValue ? '1' : '.3'}"/>`
  }).join('')
  const stamp =
    monthValue === 0
      ? '<rect x="74" y="221" width="92" height="23" rx="5" fill="#101820" stroke="#b59860" stroke-opacity=".5"/><text x="120" y="237" text-anchor="middle" fill="#e5ce9c" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2">SEASON</text>'
      : `<rect x="68" y="221" width="66" height="23" rx="5" fill="#101820" stroke="${style.accent}" stroke-opacity=".5"/><text x="101" y="237" text-anchor="middle" fill="${style.accent}" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="1">${year}</text><rect x="139" y="221" width="33" height="23" rx="5" fill="${style.accent}"/><text x="155.5" y="237" text-anchor="middle" fill="#101820" font-family="Arial,sans-serif" font-size="14" font-weight="700">${String(monthValue).padStart(2, '0')}</text>`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="280" viewBox="0 0 240 280" role="img" aria-labelledby="title desc">
  <title id="title">ILOG Creator Season ${caption}</title>
  <desc id="desc">A ${style.name.toLowerCase()} creator emblem with a seasonal symbol, twelve month markers, an engraved year and a highlighted month stamp.</desc>
  <defs>
    <linearGradient id="metal" x1="24" y1="12" x2="215" y2="250" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff2cc"/><stop offset=".18" stop-color="#cfab60"/><stop offset=".38" stop-color="#f7e6b3"/><stop offset=".55" stop-color="#8c6832"/><stop offset=".73" stop-color="#d1ac63"/><stop offset="1" stop-color="#fff0c2"/>
    </linearGradient>
    <linearGradient id="enamel" x1="45" y1="32" x2="184" y2="222" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2b343c"/><stop offset=".52" stop-color="#111b23"/><stop offset="1" stop-color="#060d13"/>
    </linearGradient>
    <linearGradient id="shine" x1="67" y1="39" x2="153" y2="146" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff7e2" stop-opacity=".28"/><stop offset=".65" stop-color="#fff7e2" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-25%" width="160%" height="165%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#000" flood-opacity=".5"/></filter>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  <g filter="url(#shadow)">
    <path d="M120 12 207 44 224 119 201 201 120 256 39 201 16 119 33 44Z" fill="url(#metal)"/>
    <path d="M120 18 202 49 218 119 196 197 120 248 44 197 22 119 38 49Z" fill="url(#enamel)" stroke="#f3dca1" stroke-opacity=".5"/>
    <path d="M120 27 195 55 209 119 189 191 120 237 51 191 31 119 45 55Z" fill="none" stroke="url(#metal)" stroke-width="1.4"/>
    <path d="M39 73 57 47 120 24 181 47 81 164 42 178 27 119Z" fill="url(#shine)"/>
    <path d="M50 77 43 113M190 77 197 113M48 160 62 185M192 160 178 185" fill="none" stroke="#c7a569" stroke-width="2" stroke-linecap="round"/>
    <text x="120" y="58" text-anchor="middle" fill="#d6bd88" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="4">ILOG</text>
    <circle cx="120" cy="124" r="53" fill="#101820" stroke="#bd9d60" stroke-opacity=".45"/>
    ${markers}
    <path d="M145 96A36 36 0 1 0 145 152" fill="none" stroke="#e6c379" stroke-width="13" stroke-linecap="square" opacity=".32" filter="url(#glow)"/>
    <path d="M145 96A36 36 0 1 0 145 152" fill="none" stroke="url(#metal)" stroke-width="11" stroke-linecap="square"/>
    <path d="m147 109 5 10 11 5-11 5-5 10-5-10-11-5 11-5Z" fill="url(#metal)"/>
    <g transform="translate(175 69) scale(.65)" fill="none" stroke="${style.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${style.icon}</g>
    <text x="120" y="69" text-anchor="middle" fill="${style.accent}" font-family="Arial,sans-serif" font-size="6.5" font-weight="700" letter-spacing="1.5">${monthValue === 0 ? 'SEASON EDITION' : style.name}</text>
    <path d="M33 180H207L217 192 207 220H33L23 192Z" fill="url(#metal)"/>
    <path d="M35 184H205L212 193 203 216H37L28 193Z" fill="#131b20" stroke="#fff0c2" stroke-opacity=".28"/>
    <text x="120" y="205" text-anchor="middle" fill="#f3db9f" font-family="Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="2">CREATOR</text>
    ${stamp}
  </g>
</svg>\n`
  const original = seasons.summer.colors
  return original.reduce(
    (result, color, index) => result.replaceAll(color, style.colors[index]),
    svg,
  )
}

const months =
  month === 'all'
    ? Array.from({ length: 12 }, (_, index) => index + 1)
    : [Number(month)]
for (const monthValue of [...months, 0]) {
  const monthCode = String(monthValue).padStart(2, '0')
  const name =
    monthValue === 0 ? 'creator-season' : `creator-season-${year}-${monthCode}`
  const svg = artwork(
    monthValue === 0 ? 'SEASON' : `${year}.${monthCode}`,
    monthValue,
  )
  await writeFile(new URL(`${name}.svg`, output), svg)
  await sharp(Buffer.from(svg))
    .resize(720, 840)
    .png()
    .toFile(fileURLToPath(new URL(`${name}.png`, output)))
}
const entries = (await readdir(output))
  .flatMap((file) => {
    const match = /^creator-season-(\d{4})-(\d{2})\.png$/u.exec(file)
    return match === null
      ? []
      : [[`${match[1]}.${match[2]}`, `/brand/tags/${file}`]]
  })
  .sort(([a], [b]) => a.localeCompare(b))
await writeFile(
  new URL(
    '../../apps/web/src/content/creator-season-artwork.generated.ts',
    import.meta.url,
  ),
  `const artworkIndex: Readonly<Record<string, string>> = {\n${entries.map(([key, path]) => `  '${key}': '${path}',`).join('\n')}\n}\n\nexport default artworkIndex\n`,
)
process.stdout.write(
  `Created creator season artwork in ${fileURLToPath(output)}\n`,
)
