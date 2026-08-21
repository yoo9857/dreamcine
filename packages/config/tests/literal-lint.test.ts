import { randomBytes } from 'node:crypto'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ESLint } from 'eslint'
import { afterEach, describe, expect, it } from 'vitest'

/**
 * 08_UIUX_SPEC.md §7 은 "컴포넌트에 색상/간격 리터럴 작성 금지. 린트로 차단한다"
 * 라고 못 박았다. 규칙이 실제로 발화하는지 검사한다 — 발화하지 않는 규칙은
 * 없는 것보다 나쁘다(거짓 안심을 준다).
 *
 * 가상 경로로는 검사할 수 없다. 타입 기반 린팅이 프로젝트에 없는 파일을
 * 거부하므로, tsconfig include 안에 실제 파일을 만들고 지운다.
 */
const eslint = new ESLint({ cwd: process.cwd() })

const created: string[] = []

afterEach(async () => {
  await Promise.all(created.splice(0).map((path) => rm(path, { force: true })))
})

async function lint(code: string, directory: string, extension: string) {
  const name = `__probe_${randomBytes(6).toString('hex')}.${extension}`
  const relative = join(directory, name)
  const absolute = join(process.cwd(), relative)
  created.push(absolute)
  await writeFile(absolute, code, 'utf8')

  const results = await eslint.lintFiles([relative])
  const messages = (results[0]?.messages ?? []).map(
    (message) => message.message,
  )
  return messages.join('\n')
}

function component(body: string): string {
  return [
    "import type { ReactNode } from 'react'",
    '',
    body,
    '',
    'export function Probe(): ReactNode {',
    '  return <div className={CLASS} />',
    '}',
    '',
  ].join('\n')
}

const PRIMITIVES = join('packages', 'ui', 'src', 'primitives')
const TOKENS = join('packages', 'ui', 'src', 'tokens')

describe('색·간격 리터럴 금지 규칙', () => {
  it.each([
    ['16진 색', "const CLASS = 'bg-[#ff0000]'", '색 리터럴'],
    ['짧은 16진 색', "const CLASS = 'text-[#abc]'", '색 리터럴'],
    ['rgb()', "const CLASS = 'shadow-[0_0_0_rgb(0,0,0)]'", '색 리터럴'],
    ['hsl()', "const CLASS = 'text-[hsl(200,50%,50%)]'", '색 리터럴'],
    ['px 길이', "const CLASS = 'p-[13px]'", '간격'],
    ['rem 길이', "const CLASS = 'gap-[1.5rem]'", '간격'],
    [
      '임의 브레이크포인트',
      "const CLASS = 'min-[900px]:flex'",
      '브레이크포인트',
    ],
  ])(
    '%s 을 막는다',
    async (_name, body, expected) => {
      const output = await lint(component(body), PRIMITIVES, 'tsx')

      expect(output).toContain(expected)
    },
    30_000,
  )

  it('템플릿 문자열 안의 색 리터럴도 막는다', async () => {
    const output = await lint(
      component('const CLASS = `bg-[#ff0000] ${String(1)}`'),
      PRIMITIVES,
      'tsx',
    )

    expect(output).toContain('색 리터럴')
  }, 30_000)

  it.each([
    ['토큰 스케일', "const CLASS = 'gap-4 px-3 size-8 border-4 py-0.5'"],
    [
      '이름 있는 브레이크포인트',
      "const CLASS = 'sm:grid-cols-2 wide:grid-cols-4'",
    ],
    ['비율 폭', "const CLASS = 'w-2/3 max-w-md'"],
    ['뷰포트 단위', "const CLASS = 'max-h-[80dvh] min-h-[100dvh]'"],
    ['CSS 변수 참조', "const CLASS = 'min-w-(--radix-select-trigger-width)'"],
    [
      '토큰 색 유틸리티',
      "const CLASS = 'bg-bg-elevated text-fg border-border'",
    ],
  ])(
    '%s 은 통과시킨다',
    async (_name, body) => {
      const output = await lint(component(body), PRIMITIVES, 'tsx')

      expect(output).not.toContain('리터럴')
      expect(output).not.toContain('브레이크포인트')
    },
    30_000,
  )

  it('토큰 정의 지점은 색 리터럴을 쓸 수 있다', async () => {
    // 값의 원천이므로 당연히 예외다. 여기까지 막으면 토큰을 정의할 수 없다.
    const output = await lint(
      "export const PROBE_COLOR = '#0b0b10'\n",
      TOKENS,
      'ts',
    )

    expect(output).not.toContain('색 리터럴')
  })
})
