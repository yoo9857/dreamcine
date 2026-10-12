// @vitest-environment jsdom

import type { CommentThreadItem } from '@aidream/core'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CommentThread } from './CommentThread'

const item: CommentThreadItem = {
  id: 'comment_1',
  episodeId: 'episode_1',
  body: '삭제된 댓글입니다.',
  parentId: null,
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z',
  deleted: true,
  user: {
    handle: 'creator',
    displayName: '제작자',
    avatarUrl: null,
    tier: 'BRONZE',
    isVerified: false,
  },
  replies: [
    {
      id: 'comment_2',
      episodeId: 'episode_1',
      body: '남아 있는 답글',
      parentId: 'comment_1',
      createdAt: '2026-08-25T00:01:00.000Z',
      updatedAt: '2026-08-25T00:01:00.000Z',
      deleted: false,
      user: {
        handle: 'viewer',
        displayName: '시청자',
        avatarUrl: null,
        tier: 'BRONZE',
        isVerified: false,
      },
    },
  ],
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function active(overrides: Partial<CommentThreadItem> = {}): CommentThreadItem {
  return {
    ...item,
    body: '좋은 작품이에요',
    deleted: false,
    replies: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function reply(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), { status })
}

function formOf(element: HTMLElement): HTMLFormElement {
  const form = element.closest('form')
  if (form === null) throw new Error('composer form missing')
  return form
}

describe('CommentThread', () => {
  it('renders deleted parents, active replies, and a signed-out composer state', () => {
    render(
      <CommentThread
        episodeId="episode_1"
        initialItems={[item]}
        authenticated={false}
      />,
    )
    expect(screen.getByText('삭제된 댓글입니다.')).toBeTruthy()
    expect(screen.getByText('남아 있는 답글')).toBeTruthy()
    expect(
      screen.getByText('로그인하면 댓글을 작성할 수 있습니다.'),
    ).toBeTruthy()
  })

  it('renders the honest empty state', () => {
    render(
      <CommentThread episodeId="episode_1" initialItems={[]} authenticated />,
    )
    expect(screen.getByText('첫 댓글을 남겨 보세요.')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '댓글 내용' })).toBeTruthy()
  })

  it('links login back to this episode and hides the disabled composer', () => {
    const { rerender } = render(
      <CommentThread episodeId="ep" initialItems={[]} authenticated={false} />,
    )
    expect(
      screen
        .getByRole('link', { name: '로그인하고 댓글 쓰기' })
        .getAttribute('href'),
    ).toBe('/login?next=%2Fwatch%2Fep%23comments')
    rerender(
      <CommentThread
        episodeId="ep"
        initialItems={[]}
        authenticated
        commentsOff
      />,
    )
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(
      screen.getByText('크리에이터가 댓글 작성을 닫았습니다.'),
    ).toBeTruthy()
  })

  it('rejects whitespace and invisible-only text without a request', () => {
    const fetcher = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetcher)
    render(<CommentThread episodeId="ep" initialItems={[]} authenticated />)
    const input = screen.getByRole<HTMLTextAreaElement>('textbox', {
      name: '댓글 내용',
    })
    fireEvent.change(input, { target: { value: ' \u200B ' } })
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: '댓글 등록' })
        .disabled,
    ).toBe(true)
    fireEvent.submit(formOf(input))
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('locks repeated submissions and clears the draft only after registration', async () => {
    let resolve: (response: Response) => void = () => undefined
    const fetcher = vi.fn(
      (_url: string, _init?: RequestInit) =>
        new Promise<Response>((done) => {
          resolve = done
        }),
    )
    vi.stubGlobal('fetch', fetcher)
    render(
      <CommentThread
        episodeId="ep"
        initialItems={[]}
        authenticated
        viewerHandle="creator"
      />,
    )
    const input = screen.getByRole<HTMLTextAreaElement>('textbox', {
      name: '댓글 내용',
    })
    fireEvent.change(input, { target: { value: ' 새 댓글 ' } })
    fireEvent.submit(formOf(input))
    fireEvent.submit(formOf(input))
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(input.disabled).toBe(true)
    expect(input.value).toBe(' 새 댓글 ')
    expect(JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string)).toEqual({
      body: '새 댓글',
    })
    resolve(reply(active({ body: '새 댓글' }), 201))
    await screen.findByText('새 댓글')
    expect(input.value).toBe('')
    expect(screen.getByRole('status').textContent).toBe('댓글을 등록했습니다.')
  })

  it('preserves the draft on a rate limit and lets the user retry', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply({ error: { code: 'E_RATE_LIMITED' } }, 429))
      .mockResolvedValueOnce(reply(active({ body: '내 댓글' }), 201))
    vi.stubGlobal('fetch', fetcher)
    render(<CommentThread episodeId="ep" initialItems={[]} authenticated />)
    const input = screen.getByRole<HTMLTextAreaElement>('textbox', {
      name: '댓글 내용',
    })
    fireEvent.change(input, { target: { value: '내 댓글' } })
    fireEvent.click(screen.getByRole('button', { name: '댓글 등록' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      '너무 자주',
    )
    expect(input.value).toBe('내 댓글')
    fireEvent.click(screen.getByRole('button', { name: '댓글 등록' }))
    await screen.findByText('내 댓글')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('adds a one-level reply and opens it without replacing the parent', async () => {
    const parent = active()
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        reply(
          { ...parent, id: 'new-reply', body: '새 답글', parentId: parent.id },
          201,
        ),
      )
    vi.stubGlobal('fetch', fetcher)
    render(
      <CommentThread
        episodeId="ep"
        initialItems={[parent]}
        authenticated
        viewerHandle="creator"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '답글' }))
    fireEvent.change(
      screen.getByRole('textbox', { name: '제작자님에게 답글' }),
      { target: { value: '새 답글' } },
    )
    fireEvent.click(screen.getByRole('button', { name: '답글 등록' }))
    await screen.findByText('새 답글')
    expect(JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string)).toEqual({
      body: '새 답글',
      parentId: parent.id,
    })
    expect(document.querySelector('details')?.open).toBe(true)
    expect(screen.getByText(parent.body)).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '답글' })).toHaveLength(1)
  })

  it('edits only recent owned comments and preserves the thread', async () => {
    const parent = active({ replies: item.replies })
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      reply({
        ...parent,
        body: '수정한 댓글',
        updatedAt: new Date(Date.now() + 1000).toISOString(),
      }),
    )
    vi.stubGlobal('fetch', fetcher)
    render(
      <CommentThread
        episodeId="ep"
        initialItems={[parent]}
        authenticated
        viewerHandle="creator"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: '댓글 수정 내용' }), {
      target: { value: '수정한 댓글' },
    })
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }))
    await screen.findByText('수정한 댓글')
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe('PATCH')
    expect(screen.getByText('수정됨')).toBeTruthy()
    expect(screen.getByText('남아 있는 답글')).toBeTruthy()
  })

  it('does not offer editing after 15 minutes or deletion for strangers', () => {
    render(
      <CommentThread
        episodeId="ep"
        initialItems={[active({ createdAt: item.createdAt })]}
        authenticated
        viewerHandle="other"
      />,
    )
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull()
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull()
    expect(screen.getByRole('button', { name: '신고' })).toBeTruthy()
  })

  it('requires confirmation and keeps replies when deleting the parent', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(reply(null, 204))
    vi.stubGlobal('fetch', fetcher)
    render(
      <CommentThread
        episodeId="ep"
        initialItems={[active({ replies: item.replies })]}
        authenticated
        viewerHandle="creator"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(fetcher).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }))
    await screen.findByText('삭제된 댓글입니다.')
    expect(screen.getByText('남아 있는 답글')).toBeTruthy()
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe('DELETE')
  })

  it('retries the same cursor after a failed next-page request without duplicates', async () => {
    const parent = active()
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(
        reply({
          items: [parent, active({ id: 'older', body: '이전 댓글' })],
          nextCursor: null,
        }),
      )
    vi.stubGlobal('fetch', fetcher)
    render(
      <CommentThread
        episodeId="ep"
        initialItems={[parent]}
        initialCursor="cursor+/="
        authenticated={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '이전 댓글 더 보기' }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    await screen.findByText('이전 댓글')
    expect(fetcher.mock.calls[0]?.[0]).toBe(fetcher.mock.calls[1]?.[0])
    expect(fetcher.mock.calls[1]?.[0]).toContain('cursor=cursor%2B%2F%3D')
    expect(screen.getAllByText(parent.body)).toHaveLength(1)
    expect(
      screen.queryByRole('button', { name: '이전 댓글 더 보기' }),
    ).toBeNull()
  })

  it('loads replies beyond the three-item preview with a separate cursor', async () => {
    const replies = [1, 2, 3].map((id) => ({
      ...active({
        id: `r${String(id)}`,
        body: `답글 ${String(id)}`,
        parentId: 'comment_1',
      }),
    }))
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      reply({
        items: [
          ...replies,
          active({ id: 'r4', body: '네 번째 답글', parentId: 'comment_1' }),
        ],
        nextCursor: null,
      }),
    )
    vi.stubGlobal('fetch', fetcher)
    render(
      <CommentThread
        episodeId="ep"
        initialItems={[active({ replies })]}
        authenticated={false}
      />,
    )
    fireEvent.click(screen.getByText('답글 보기', { exact: false }))
    fireEvent.click(screen.getByRole('button', { name: '답글 더 보기' }))
    await screen.findByText('네 번째 답글')
    expect(fetcher.mock.calls[0]?.[0]).toContain('parentId=comment_1')
    expect(document.querySelectorAll('.comment-replies article')).toHaveLength(
      4,
    )
    expect(screen.queryByRole('button', { name: '답글 더 보기' })).toBeNull()
  })

  it('distinguishes a failed initial load from an empty thread', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(reply({ items: [], nextCursor: null })),
    )
    render(
      <CommentThread
        episodeId="ep"
        initialItems={[]}
        initialError
        authenticated={false}
      />,
    )
    expect(screen.queryByText('첫 댓글을 남겨 보세요.')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    await screen.findByText('첫 댓글을 남겨 보세요.')
  })
})
