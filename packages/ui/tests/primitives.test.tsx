// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Avatar } from '../src/primitives/Avatar.js'
import { Badge } from '../src/primitives/Badge.js'
import { Button } from '../src/primitives/Button.js'
import { Checkbox } from '../src/primitives/Checkbox.js'
import { Dialog } from '../src/primitives/Dialog.js'
import { EmptyState } from '../src/primitives/EmptyState.js'
import { ErrorState } from '../src/primitives/ErrorState.js'
import { IconButton } from '../src/primitives/IconButton.js'
import { Input } from '../src/primitives/Input.js'
import { Pagination } from '../src/primitives/Pagination.js'
import { Progress } from '../src/primitives/Progress.js'
import { Sheet } from '../src/primitives/Sheet.js'
import { Skeleton } from '../src/primitives/Skeleton.js'
import { Spinner } from '../src/primitives/Spinner.js'
import { Switch } from '../src/primitives/Switch.js'
import { Tabs } from '../src/primitives/Tabs.js'
import { Textarea } from '../src/primitives/Textarea.js'

afterEach(() => {
  cleanup()
})

const PROBE = 'probe-class'

/**
 * 모든 프리미티브는 `className` 을 합성해야 한다 — 배치는 도메인 컴포넌트가
 * 결정하고, 프리미티브는 모양만 책임진다. 이게 깨지면 화면마다 래퍼 div 가
 * 늘어난다.
 */
describe('className 합성', () => {
  it.each([
    ['Button', <Button key="b" className={PROBE} />],
    [
      'IconButton',
      <IconButton key="ib" label="아이콘" icon={<span />} className={PROBE} />,
    ],
    ['Input', <Input key="i" label="입력" className={PROBE} />],
    ['Textarea', <Textarea key="t" label="본문" className={PROBE} />],
    ['Checkbox', <Checkbox key="c" label="동의" className={PROBE} />],
    ['Switch', <Switch key="s" label="알림" className={PROBE} />],
    ['Badge', <Badge key="bd" className={PROBE} />],
    ['Skeleton', <Skeleton key="sk" className={PROBE} />],
    ['Spinner', <Spinner key="sp" className={PROBE} />],
    ['Avatar', <Avatar key="av" name="홍길동" className={PROBE} />],
    [
      'Progress',
      <Progress key="pr" value={50} label="진행률" className={PROBE} />,
    ],
    [
      'Pagination',
      <Pagination
        key="pg"
        hasPrevious={false}
        hasNext
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        className={PROBE}
      />,
    ],
    ['EmptyState', <EmptyState key="es" title="없음" className={PROBE} />],
    [
      'ErrorState',
      <ErrorState
        key="err"
        description="문제"
        onRetry={vi.fn()}
        className={PROBE}
      />,
    ],
  ])('%s', (_name, element) => {
    const { container } = render(element)

    expect(container.querySelector(`.${PROBE}`)).not.toBeNull()
  })
})

describe('Button', () => {
  it('기본 type 은 button 이다', () => {
    // 폼 안에서 type 없는 버튼은 의도치 않은 submit 을 일으킨다.
    render(<Button>확인</Button>)

    expect(screen.getByRole('button').getAttribute('type')).toBe('button')
  })

  it('로딩 중에는 클릭이 막힌다', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        저장
      </Button>,
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(onClick).not.toHaveBeenCalled()
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })

  it('로딩 중에는 진행 상태를 읽어준다', () => {
    render(<Button loading>저장</Button>)

    expect(screen.getByRole('status')).toBeDefined()
  })

  it('disabled 면 클릭이 막힌다', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        저장
      </Button>,
    )
    fireEvent.click(screen.getByRole('button'))

    expect(onClick).not.toHaveBeenCalled()
  })

  it('평소에는 클릭이 전달된다', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>저장</Button>)
    fireEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('asChild 는 자식에게 모양만 입힌다', () => {
    render(
      <Button asChild>
        <a href="/next">이동</a>
      </Button>,
    )

    const link = screen.getByRole('link')
    expect(link.tagName).toBe('A')
    expect(link.className).toContain('rounded-md')
  })
})

describe('IconButton', () => {
  it('접근성 이름을 반드시 갖는다', () => {
    render(<IconButton label="닫기" icon={<span />} />)

    expect(screen.getByRole('button', { name: '닫기' })).toBeDefined()
  })

  it('마우스 사용자에게도 이름을 보여준다', () => {
    render(<IconButton label="닫기" icon={<span />} />)

    expect(screen.getByRole('button').getAttribute('title')).toBe('닫기')
  })
})

describe('Input', () => {
  it('라벨이 입력과 연결된다', () => {
    render(<Input label="이메일" />)

    expect(screen.getByLabelText('이메일')).toBeDefined()
  })

  it('라벨을 숨겨도 접근성 이름은 남는다', () => {
    render(<Input label="검색어" hideLabel />)

    expect(screen.getByLabelText('검색어')).toBeDefined()
  })

  it('오류 상태가 aria-invalid 와 설명 연결을 만든다', () => {
    render(<Input label="이메일" error="형식이 올바르지 않습니다" />)

    const input = screen.getByLabelText('이메일')
    const described = input.getAttribute('aria-describedby') ?? ''

    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(described).not.toBe('')
    expect(document.getElementById(described)?.textContent).toBe(
      '형식이 올바르지 않습니다',
    )
  })

  it('오류는 즉시 읽어준다', () => {
    render(<Input label="이메일" error="형식 오류" />)

    expect(screen.getByRole('alert').textContent).toBe('형식 오류')
  })

  it('설명과 오류를 함께 연결한다', () => {
    render(<Input label="아이디" hint="3~20자" error="이미 사용 중" />)

    const described =
      screen.getByLabelText('아이디').getAttribute('aria-describedby') ?? ''
    const ids = described.split(' ')

    expect(ids).toHaveLength(2)
    const texts = ids.map((id) => document.getElementById(id)?.textContent)
    expect(texts).toContain('3~20자')
    expect(texts).toContain('이미 사용 중')
  })

  it('오류가 없으면 aria-invalid 를 붙이지 않는다', () => {
    render(<Input label="이메일" />)

    expect(screen.getByLabelText('이메일').hasAttribute('aria-invalid')).toBe(
      false,
    )
  })
})

describe('Textarea', () => {
  it('글자 수를 보여줄 수 있다', () => {
    render(
      <Textarea label="소개" maxLength={100} showCount value="안녕하세요" />,
    )

    expect(screen.getByText('5 / 100')).toBeDefined()
  })

  it('maxLength 가 없으면 글자 수를 숨긴다', () => {
    render(<Textarea label="소개" showCount value="안녕" />)

    expect(screen.queryByText(/\//u)).toBeNull()
  })
})

describe('Checkbox / Switch', () => {
  it('체크 변화를 알린다', () => {
    const onCheckedChange = vi.fn()
    render(<Checkbox label="동의" onCheckedChange={onCheckedChange} />)
    fireEvent.click(screen.getByRole('checkbox'))

    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('체크박스 라벨이 연결된다', () => {
    render(<Checkbox label="약관에 동의합니다" />)

    expect(
      screen.getByRole('checkbox', { name: '약관에 동의합니다' }),
    ).toBeDefined()
  })

  it('스위치 변화를 알린다', () => {
    const onCheckedChange = vi.fn()
    render(<Switch label="알림" onCheckedChange={onCheckedChange} />)
    fireEvent.click(screen.getByRole('switch'))

    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })
})

describe('Dialog', () => {
  it('열리면 제목이 접근성 이름이 된다', () => {
    render(
      <Dialog open onOpenChange={vi.fn()} title="정말 삭제할까요">
        <p>되돌릴 수 없습니다.</p>
      </Dialog>,
    )

    expect(
      screen.getByRole('dialog', { name: '정말 삭제할까요' }),
    ).toBeDefined()
  })

  it('닫혀 있으면 아무것도 렌더하지 않는다', () => {
    render(<Dialog open={false} onOpenChange={vi.fn()} title="숨김" />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Esc 로 닫을 수 있다', () => {
    const onOpenChange = vi.fn()
    render(<Dialog open onOpenChange={onOpenChange} title="확인" />)
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('포커스가 대화상자 안으로 들어간다', () => {
    render(<Dialog open onOpenChange={vi.fn()} title="확인" />)

    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('제목을 숨겨도 접근성 이름은 남는다', () => {
    render(<Dialog open onOpenChange={vi.fn()} title="숨은 제목" hideTitle />)

    expect(screen.getByRole('dialog', { name: '숨은 제목' })).toBeDefined()
  })

  it('닫기 버튼에 이름이 있다', () => {
    render(<Dialog open onOpenChange={vi.fn()} title="확인" />)

    expect(screen.getByRole('button', { name: '닫기' })).toBeDefined()
  })
})

describe('Sheet', () => {
  it('Dialog 와 같은 접근성 계약을 쓴다', () => {
    render(<Sheet open onOpenChange={vi.fn()} title="필터" side="left" />)

    expect(screen.getByRole('dialog', { name: '필터' })).toBeDefined()
  })

  it('Esc 로 닫을 수 있다', () => {
    const onOpenChange = vi.fn()
    render(<Sheet open onOpenChange={onOpenChange} title="필터" />)
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('Tabs', () => {
  const items = [
    { value: 'a', label: '첫째', content: <p>A 내용</p> },
    { value: 'b', label: '둘째', content: <p>B 내용</p> },
    { value: 'c', label: '셋째', content: <p>C 내용</p> },
  ]

  it('탭 목록에 접근성 이름이 있다', () => {
    render(<Tabs items={items} label="보기 방식" />)

    expect(screen.getByRole('tablist', { name: '보기 방식' })).toBeDefined()
  })

  it('첫 탭 내용을 먼저 보여준다', () => {
    render(<Tabs items={items} label="보기 방식" />)

    expect(screen.getByText('A 내용')).toBeDefined()
    expect(screen.queryByText('B 내용')).toBeNull()
  })

  it('오른쪽 화살표로 다음 탭에 포커스가 간다', async () => {
    render(<Tabs items={items} label="보기 방식" />)

    const first = screen.getByRole('tab', { name: '첫째' })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })

    // 10_NFR §10 — 키보드만으로 전 기능 조작. roving tabindex 가 살아있는지 본다.
    // Radix 는 포커스 이동을 다음 틱으로 미루므로 기다린다.
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('tab', { name: '둘째' }),
      )
    })
  })

  it('탭을 고르면 내용이 바뀐다', () => {
    const onValueChange = vi.fn()
    render(
      <Tabs items={items} label="보기 방식" onValueChange={onValueChange} />,
    )
    // Radix 탭은 click 이 아니라 mousedown 에서 활성화된다.
    fireEvent.mouseDown(screen.getByRole('tab', { name: '둘째' }))

    expect(onValueChange).toHaveBeenCalledWith('b')
    expect(screen.getByText('B 내용')).toBeDefined()
  })

  it('비활성 탭은 고를 수 없다', () => {
    const onValueChange = vi.fn()
    render(
      <Tabs
        items={[
          ...items,
          { value: 'd', label: '넷째', content: <p>D</p>, disabled: true },
        ]}
        label="보기 방식"
        onValueChange={onValueChange}
      />,
    )
    fireEvent.mouseDown(screen.getByRole('tab', { name: '넷째' }))

    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('제어 모드에서 지정한 탭을 보여준다', () => {
    render(<Tabs items={items} label="보기 방식" value="c" />)

    expect(screen.getByText('C 내용')).toBeDefined()
  })
})

describe('Progress', () => {
  it('범위를 벗어난 값을 잘라낸다', () => {
    const { rerender } = render(<Progress value={140} label="업로드" />)
    expect(screen.getByText('100%')).toBeDefined()

    rerender(<Progress value={-20} label="업로드" />)
    expect(screen.getByText('0%')).toBeDefined()
  })

  it('접근성 이름을 갖는다', () => {
    render(<Progress value={30} label="업로드" />)

    expect(screen.getByRole('progressbar', { name: '업로드' })).toBeDefined()
  })
})

describe('Avatar', () => {
  it('이미지가 없으면 이름의 첫 글자를 보여준다', () => {
    render(<Avatar name="홍길동" />)

    expect(screen.getByText('홍')).toBeDefined()
  })

  it('빈 이름도 깨지지 않는다', () => {
    render(<Avatar name="   " />)

    expect(screen.getByText('?')).toBeDefined()
  })

  it('영문 이름은 대문자로 보여준다', () => {
    render(<Avatar name="dreamer" />)

    expect(screen.getByText('D')).toBeDefined()
  })
})

describe('Skeleton', () => {
  it('여러 줄을 만들 수 있다', () => {
    const { container } = render(<Skeleton variant="text" lines={3} />)

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
  })

  it('보조기기에 노출하지 않는다', () => {
    const { container } = render(<Skeleton />)

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })
})

describe('Pagination', () => {
  it('커서 방식이라 페이지 번호를 노출하지 않는다', () => {
    render(
      <Pagination hasPrevious hasNext onPrevious={vi.fn()} onNext={vi.fn()} />,
    )

    // 05_API_CONTRACT §1 은 커서 페이지네이션만 허용한다.
    expect(screen.getAllByRole('button')).toHaveLength(2)
    expect(screen.queryByText('1')).toBeNull()
  })

  it('끝에 도달하면 버튼이 잠긴다', () => {
    const onNext = vi.fn()
    render(
      <Pagination
        hasPrevious={false}
        hasNext={false}
        onPrevious={vi.fn()}
        onNext={onNext}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(onNext).not.toHaveBeenCalled()
  })

  it('이동 중에는 잠긴다', () => {
    const onNext = vi.fn()
    render(
      <Pagination
        hasPrevious
        hasNext
        onPrevious={vi.fn()}
        onNext={onNext}
        loading
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    expect(onNext).not.toHaveBeenCalled()
  })
})

/** 08_UIUX_SPEC.md §10 — 다음 행동을 항상 제시한다. */
describe('EmptyState / ErrorState', () => {
  it('비어있음 상태가 다음 행동을 담을 수 있다', () => {
    render(
      <EmptyState
        title="아직 작품이 없습니다"
        description="인기 피드에서 먼저 둘러보세요"
        action={<Button>인기 피드로</Button>}
      />,
    )

    expect(screen.getByRole('button', { name: '인기 피드로' })).toBeDefined()
  })

  it('오류 상태는 재시도 수단을 반드시 갖는다', () => {
    const onRetry = vi.fn()
    render(<ErrorState description="불러오지 못했습니다" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('오류 상태는 즉시 읽어준다', () => {
    render(<ErrorState description="불러오지 못했습니다" onRetry={vi.fn()} />)

    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('문의 추적용 코드를 보여준다', () => {
    render(
      <ErrorState
        description="문제가 있었습니다"
        code="E_INTERNAL"
        requestId="01ABCDEF"
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('E_INTERNAL · 01ABCDEF')).toBeDefined()
  })
})
