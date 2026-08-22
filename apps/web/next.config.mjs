import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 03_TECH_STACK.md §2 — Docker 런너가 standalone 산출물을 그대로 실행한다.
  output: 'standalone',
  outputFileTracingRoot: join(here, '..', '..'),
  poweredByHeader: false,
  reactStrictMode: true,
  // workspace 패키지는 TypeScript 소스를 그대로 노출한다.
  transpilePackages: [
    '@aidream/core',
    '@aidream/db',
    '@aidream/queue',
    '@aidream/storage',
  ],
  // 린트는 루트 게이트(`pnpm lint`)가 단일 지점에서 수행한다.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  webpack: (config) => {
    // packages/* 는 ESM 규약대로 `./foo.js` 로 import 한다. 실제 파일은 `.ts` 이므로
    // 번들러에게 확장자 별칭을 알려준다. (TypeScript 의 moduleResolution 과 동일한 규칙)
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    }
    return config
  },
}

export default nextConfig
