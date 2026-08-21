// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Container } from '../src/layout/Container.js'
import { Grid } from '../src/layout/Grid.js'
import { Stack } from '../src/layout/Stack.js'

afterEach(() => {
  cleanup()
})

function classesOf(element: Element | null): string[] {
  return (element?.className ?? '').split(' ').filter((value) => value !== '')
}

describe('Stack', () => {
  it('기본은 열 방향이다', () => {
    const { container } = render(<Stack data-testid="stack" />)

    expect(classesOf(container.firstElementChild)).toContain('flex-col')
  })

  it('행 방향을 지정할 수 있다', () => {
    const { container } = render(<Stack direction="row" />)

    expect(classesOf(container.firstElementChild)).toContain('flex-row')
  })

  it.each([1, 2, 3, 4, 6, 8, 12] as const)(
    '간격 %s 를 토큰 유틸리티로 만든다',
    (gap) => {
      const { container } = render(<Stack gap={gap} />)

      expect(classesOf(container.firstElementChild)).toContain(
        `gap-${String(gap)}`,
      )
    },
  )

  it('정렬과 배치를 지정할 수 있다', () => {
    const { container } = render(
      <Stack align="center" justify="between" wrap />,
    )
    const classes = classesOf(container.firstElementChild)

    expect(classes).toContain('items-center')
    expect(classes).toContain('justify-between')
    expect(classes).toContain('flex-wrap')
  })

  it('전달한 className 을 합성한다', () => {
    const { container } = render(<Stack className="probe-class" />)

    expect(classesOf(container.firstElementChild)).toContain('probe-class')
  })

  it('자식을 그대로 렌더한다', () => {
    const { getByText } = render(
      <Stack>
        <span>내용</span>
      </Stack>,
    )

    expect(getByText('내용')).toBeDefined()
  })
})

describe('Grid', () => {
  /** 08_UIUX_SPEC.md §2 — <640 1열, 640~1023 2열, 1024~1439 3열, ≥1440 4열 */
  it('피드는 스펙 표 그대로 1/2/3/4열을 만든다', () => {
    const { container } = render(<Grid />)
    const classes = classesOf(container.firstElementChild)

    expect(classes).toContain('grid-cols-1')
    expect(classes).toContain('sm:grid-cols-2')
    expect(classes).toContain('lg:grid-cols-3')
    expect(classes).toContain('wide:grid-cols-4')
  })

  it('임의 브레이크포인트를 쓰지 않는다', () => {
    const { container } = render(<Grid />)

    // min-[1440px] 같은 리터럴이 들어오면 린트 규칙과 어긋난다.
    expect(container.firstElementChild?.className ?? '').not.toContain('min-[')
  })

  it('pair 는 2열까지만 늘어난다', () => {
    const { container } = render(<Grid variant="pair" />)
    const classes = classesOf(container.firstElementChild)

    expect(classes).toContain('sm:grid-cols-2')
    expect(classes).not.toContain('lg:grid-cols-3')
  })

  it('전달한 className 을 합성한다', () => {
    const { container } = render(<Grid className="probe-class" />)

    expect(classesOf(container.firstElementChild)).toContain('probe-class')
  })
})

describe('Container', () => {
  it.each([
    ['narrow', 'max-w-md'],
    ['default', 'max-w-5xl'],
    ['wide', 'max-w-7xl'],
  ] as const)('%s 는 %s 로 폭을 제한한다', (size, expected) => {
    const { container } = render(<Container size={size} />)

    expect(classesOf(container.firstElementChild)).toContain(expected)
  })

  it('기본은 좌우 여백을 준다', () => {
    const { container } = render(<Container />)

    expect(classesOf(container.firstElementChild)).toContain('px-4')
  })

  it('여백을 끌 수 있다', () => {
    const { container } = render(<Container padded={false} />)

    expect(classesOf(container.firstElementChild)).not.toContain('px-4')
  })

  it('가운데 정렬한다', () => {
    const { container } = render(<Container />)

    expect(classesOf(container.firstElementChild)).toContain('mx-auto')
  })
})
