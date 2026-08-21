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
  // 린트는 루트 게이트(`pnpm lint`)가 단일 지점에서 수행한다.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
}

export default nextConfig
