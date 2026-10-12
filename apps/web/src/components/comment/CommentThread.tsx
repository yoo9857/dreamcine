'use client'

import {
  CommentPageSchema,
  CommentResponseSchema,
  LIMITS,
  sanitizeUserText,
  type CommentResponse,
  type CommentThreadItem,
} from '@aidream/core'
import { Avatar, Button, Textarea } from '@aidream/ui'
import { MessageSquare, CornerDownRight } from 'lucide-react'
import Link from 'next/link'
import React, { type ReactNode, useRef, useState } from 'react'

import { ReportDialog } from '@/src/components/ReportDialog'
import { UserTierLine } from '@/src/components/user/UserTierLine'
import { koMessages } from '@/src/lib/messages/ko'

const MESSAGES = koMessages().social
const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

async function request(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init)
  if (response.status === 204) return null
  const data: unknown = await response.json()
  if (!response.ok) {
    const code =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'object' &&
      data.error !== null &&
      'code' in data.error
        ? data.error.code
        : null
    const messages: Record<string, string> = {
      E_AUTH_REQUIRED:
        '로그인 후 다시 시도해 주세요. 작성한 내용은 유지됩니다.',
      E_AUTH_SESSION_EXPIRED: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
      E_AUTH_EMAIL_NOT_VERIFIED: '이메일 인증 후 댓글을 작성할 수 있습니다.',
      E_COMMENT_DISABLED: '크리에이터가 댓글 작성을 닫았습니다.',
      E_COMMENT_NOT_FOUND:
        '삭제되었거나 사용할 수 없는 댓글입니다. 새로고침해 주세요.',
      E_SOCIAL_BLOCKED: '차단 관계에서는 댓글이나 답글을 남길 수 없습니다.',
      E_RATE_LIMITED:
        '댓글을 너무 자주 등록했습니다. 잠시 후 다시 시도해 주세요.',
      E_PERM_DENIED:
        '수정 가능한 시간(등록 후 15분)이 지났거나 권한이 없습니다.',
      E_PERM_NOT_OWNER: '본인 댓글만 변경할 수 있습니다.',
      E_VALIDATION: '댓글 내용을 확인해 주세요.',
      E_COMMENT_TOO_LONG: `댓글은 ${String(LIMITS.COMMENT_MAX_LEN)}자까지 작성할 수 있습니다.`,
    }
    throw new Error(
      typeof code === 'string'
        ? (messages[code] ?? MESSAGES.commentFailed)
        : MESSAGES.commentFailed,
    )
  }
  return data
}

function failure(error: unknown): string {
  return error instanceof Error && !(error instanceof TypeError)
    ? error.message
    : '연결하지 못했습니다. 작성한 내용을 보존했으니 연결을 확인한 뒤 다시 시도해 주세요.'
}

function merge<T extends { readonly id: string }>(
  existing: readonly T[],
  incoming: readonly T[],
): T[] {
  const entries = new Map(existing.map((item) => [item.id, item]))
  for (const item of incoming) entries.set(item.id, item)
  return [...entries.values()]
}

function Composer({
  label,
  initialBody = '',
  submitLabel,
  onSubmit,
  onCancel,
}: {
  readonly label: string
  readonly initialBody?: string
  readonly submitLabel: string
  readonly onSubmit: (body: string) => Promise<void>
  readonly onCancel?: () => void
}): ReactNode {
  const [body, setBody] = useState(initialBody)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  const valid = sanitizeUserText(body).trim().length > 0
  async function submit(): Promise<void> {
    if (busy.current || !valid) return
    busy.current = true
    setPending(true)
    setError(null)
    try {
      await onSubmit(sanitizeUserText(body).trim())
      setBody('')
    } catch (cause: unknown) {
      setError(failure(cause))
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return (
    <form
      className="comment-composer"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <Textarea
        label={label}
        hideLabel
        value={body}
        rows={2}
        placeholder={
          label === MESSAGES.commentLabel
            ? '이 작품은 어떤 여운을 남겼나요?'
            : label
        }
        maxLength={LIMITS.COMMENT_MAX_LEN}
        disabled={pending}
        onChange={(event) => {
          setBody(event.target.value)
        }}
        onKeyDown={(event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            event.key === 'Enter' &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
          }
        }}
      />
      <div className="comment-composer-footer">
        <span>
          {body.length.toLocaleString('ko-KR')} /{' '}
          {LIMITS.COMMENT_MAX_LEN.toLocaleString('ko-KR')}
        </span>
        <div>
          {onCancel === undefined ? null : (
            <button type="button" disabled={pending} onClick={onCancel}>
              취소
            </button>
          )}
          <Button type="submit" disabled={!valid || pending} loading={pending}>
            {submitLabel}
          </Button>
        </div>
      </div>
      {error === null ? null : (
        <p role="alert" className="comment-error">
          {error}
        </p>
      )}
    </form>
  )
}

interface CommentRowProps {
  readonly comment: CommentResponse
  readonly authenticated: boolean
  readonly viewerHandle: string | null
  readonly canModerate: boolean
  readonly commentsOff: boolean
  readonly onUpdate: (comment: CommentResponse) => void
  readonly onDelete: (id: string) => void
  readonly onReply?: (body: string) => Promise<void>
}

function CommentRow({
  comment,
  authenticated,
  viewerHandle,
  canModerate,
  commentsOff,
  onUpdate,
  onDelete,
  onReply,
}: CommentRowProps): ReactNode {
  const [mode, setMode] = useState<'read' | 'edit' | 'reply' | 'delete'>('read')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  const owned = authenticated && viewerHandle === comment.user.handle
  const editable =
    owned &&
    Date.now() - Date.parse(comment.createdAt) <=
      LIMITS.COMMENT_EDIT_WINDOW_MIN * 60_000
  async function remove(): Promise<void> {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError(null)
    try {
      await request(`/api/comments/${encodeURIComponent(comment.id)}`, {
        method: 'DELETE',
      })
      onDelete(comment.id)
      setMode('read')
    } catch (cause: unknown) {
      setError(failure(cause))
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return (
    <article
      className={`comment-row${comment.deleted ? ' is-deleted' : ''}`}
      aria-label={`${comment.user.displayName}님의 댓글`}
    >
      <Avatar
        name={comment.user.displayName}
        src={comment.user.avatarUrl}
        size="md"
      />
      <div className="comment-content">
        <div className="comment-meta">
          <UserTierLine user={comment.user} compact />
          <time
            dateTime={comment.createdAt}
            title={new Date(comment.createdAt).toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
            })}
          >
            {DATE_FORMAT.format(new Date(comment.createdAt))}
          </time>
          {comment.updatedAt === comment.createdAt || comment.deleted ? null : (
            <small>수정됨</small>
          )}
        </div>
        {mode === 'edit' && !comment.deleted ? (
          <Composer
            label="댓글 수정 내용"
            initialBody={comment.body}
            submitLabel="수정 저장"
            onCancel={() => {
              setMode('read')
            }}
            onSubmit={async (body) => {
              const updated = CommentResponseSchema.parse(
                await request(
                  `/api/comments/${encodeURIComponent(comment.id)}`,
                  {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ body }),
                  },
                ),
              )
              onUpdate(updated)
              setMode('read')
            }}
          />
        ) : (
          <p className="comment-body">{comment.body}</p>
        )}
        {comment.deleted || mode !== 'read' ? null : (
          <div className="comment-actions">
            {authenticated && !commentsOff && onReply !== undefined ? (
              <button
                type="button"
                aria-expanded={false}
                onClick={() => {
                  setMode('reply')
                }}
              >
                <CornerDownRight aria-hidden="true" size={12} />
                답글
              </button>
            ) : null}
            {editable ? (
              <button
                type="button"
                onClick={() => {
                  setMode('edit')
                }}
              >
                수정
              </button>
            ) : null}
            {owned || canModerate ? (
              <button
                type="button"
                onClick={() => {
                  setMode('delete')
                }}
              >
                삭제
              </button>
            ) : authenticated ? (
              <ReportDialog
                target="COMMENT"
                targetId={comment.id}
                trigger="신고"
              />
            ) : null}
          </div>
        )}
        {mode === 'reply' && onReply !== undefined ? (
          <Composer
            label={`${comment.user.displayName}님에게 답글`}
            submitLabel="답글 등록"
            onCancel={() => {
              setMode('read')
            }}
            onSubmit={async (body) => {
              await onReply(body)
              setMode('read')
            }}
          />
        ) : null}
        {mode === 'delete' ? (
          <div className="comment-delete-confirm">
            <p>댓글을 삭제할까요? 삭제 후 복구할 수 없습니다.</p>
            <div>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setMode('read')
                  setError(null)
                }}
              >
                취소
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  void remove()
                }}
              >
                {pending ? '삭제 중…' : '삭제 확인'}
              </button>
            </div>
            {error === null ? null : (
              <p role="alert" className="comment-error">
                {error}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function Thread({
  item,
  episodeId,
  onReplies,
  ...props
}: Omit<CommentRowProps, 'comment' | 'onReply'> & {
  readonly item: CommentThreadItem
  readonly episodeId: string
  readonly onReplies: (id: string, replies: readonly CommentResponse[]) => void
}): ReactNode {
  const [cursor, setCursor] = useState<string | null | undefined>(undefined)
  const previewMayHaveMore = useRef(item.replies.length >= 3)
  const [expanded, setExpanded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)
  async function loadReplies(): Promise<void> {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError(null)
    try {
      const query = new URLSearchParams({ parentId: item.id, limit: '20' })
      if (cursor) query.set('cursor', cursor)
      const page = CommentPageSchema.parse(
        await request(
          `/api/episodes/${encodeURIComponent(episodeId)}/comments?${query.toString()}`,
        ),
      )
      onReplies(item.id, page.items)
      setCursor(page.nextCursor)
    } catch {
      setError('답글을 불러오지 못했습니다. 다시 시도해 주세요.')
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  return (
    <li className="comment-thread-item">
      <CommentRow
        {...props}
        comment={item}
        onReply={async (body) => {
          const created = CommentResponseSchema.parse(
            await request(
              `/api/episodes/${encodeURIComponent(episodeId)}/comments`,
              {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ body, parentId: item.id }),
              },
            ),
          )
          onReplies(item.id, [created])
          setExpanded(true)
        }}
      />
      {item.replies.length === 0 && !previewMayHaveMore.current ? null : (
        <details
          className="comment-replies"
          open={expanded}
          onToggle={(event) => {
            setExpanded(event.currentTarget.open)
          }}
        >
          <summary>
            답글 보기{' '}
            <span>
              {item.replies.length}
              {cursor === null || !previewMayHaveMore.current ? '' : '+'}
            </span>
          </summary>
          <ol>
            {item.replies.map((reply) => (
              <li key={reply.id}>
                <CommentRow {...props} comment={reply} />
              </li>
            ))}
          </ol>
          {cursor === null ||
          (cursor === undefined && !previewMayHaveMore.current) ? null : (
            <button
              type="button"
              className="comment-load-replies"
              disabled={pending}
              onClick={() => {
                void loadReplies()
              }}
            >
              {pending
                ? '불러오는 중…'
                : error === null
                  ? '답글 더 보기'
                  : '답글 다시 불러오기'}
            </button>
          )}
          {error === null ? null : (
            <p role="alert" className="comment-error">
              {error}
            </p>
          )}
        </details>
      )}
    </li>
  )
}

export function CommentThread({
  episodeId,
  initialItems,
  authenticated,
  initialCursor = null,
  viewerHandle = null,
  canModerate = false,
  commentsOff = false,
  initialError = false,
}: {
  readonly episodeId: string
  readonly initialItems: readonly CommentThreadItem[]
  readonly authenticated: boolean
  readonly initialCursor?: string | null
  readonly viewerHandle?: string | null
  readonly canModerate?: boolean
  readonly commentsOff?: boolean
  readonly initialError?: boolean
}): ReactNode {
  const [items, setItems] = useState(initialItems)
  const [cursor, setCursor] = useState(initialCursor)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(initialError)
  const [notice, setNotice] = useState('')
  const busy = useRef(false)
  const loginHref = `/login?next=${encodeURIComponent(`/watch/${episodeId}#comments`)}`
  async function load(): Promise<void> {
    if (busy.current) return
    busy.current = true
    setPending(true)
    try {
      const query = new URLSearchParams({ limit: '20' })
      if (cursor !== null) query.set('cursor', cursor)
      const page = CommentPageSchema.parse(
        await request(
          `/api/episodes/${encodeURIComponent(episodeId)}/comments?${query.toString()}`,
        ),
      )
      setItems((current) => merge(current, page.items))
      setCursor(page.nextCursor)
      setError(false)
    } catch {
      setError(true)
    } finally {
      busy.current = false
      setPending(false)
    }
  }
  function update(comment: CommentResponse): void {
    setItems((current) =>
      current.map((item) => ({
        ...(item.id === comment.id ? { ...item, ...comment } : item),
        replies: item.replies.map((reply) =>
          reply.id === comment.id ? comment : reply,
        ),
      })),
    )
    setNotice('댓글을 수정했습니다.')
  }
  function remove(id: string): void {
    setItems((current) =>
      current.flatMap((item) => {
        if (item.id === id)
          return item.replies.length === 0
            ? []
            : [{ ...item, body: '삭제된 댓글입니다.', deleted: true }]
        const replies = item.replies.filter((reply) => reply.id !== id)
        return [{ ...item, replies }]
      }),
    )
    setNotice('댓글을 삭제했습니다.')
  }
  function addReplies(id: string, replies: readonly CommentResponse[]): void {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              replies: merge(item.replies, replies).sort(
                (a, b) =>
                  a.createdAt.localeCompare(b.createdAt) ||
                  a.id.localeCompare(b.id),
              ),
            }
          : item,
      ),
    )
  }
  return (
    <section
      id="comments"
      aria-labelledby="comments-heading"
      className="comment-section"
      data-theme="dark"
    >
      <header className="comment-section-heading">
        <h2 id="comments-heading">
          <MessageSquare aria-hidden="true" size={17} />
          {MESSAGES.comments}
        </h2>
        <span>최신 댓글순</span>
      </header>
      {commentsOff ? (
        <p className="comment-login">크리에이터가 댓글 작성을 닫았습니다.</p>
      ) : authenticated ? (
        <Composer
          label={MESSAGES.commentLabel}
          submitLabel={MESSAGES.commentSubmit}
          onSubmit={async (body) => {
            const created = CommentResponseSchema.parse(
              await request(
                `/api/episodes/${encodeURIComponent(episodeId)}/comments`,
                {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ body }),
                },
              ),
            )
            setItems((current) => [
              { ...created, replies: [] },
              ...current.filter((item) => item.id !== created.id),
            ])
            setNotice('댓글을 등록했습니다.')
          }}
        />
      ) : (
        <div className="comment-login">
          <p>{MESSAGES.commentLogin}</p>
          <Link href={loginHref}>로그인하고 댓글 쓰기</Link>
        </div>
      )}
      <p role="status" className="comment-status">
        {notice}
      </p>
      {error ? (
        <div className="comment-list-error">
          <p role="alert">댓글을 불러오지 못했습니다.</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              void load()
            }}
          >
            {pending ? '불러오는 중…' : '다시 시도'}
          </button>
        </div>
      ) : null}
      {items.length === 0 && !error ? (
        <div className="comment-empty">
          <MessageSquare aria-hidden="true" size={22} />
          <p>{MESSAGES.commentEmpty}</p>
          <span>작품을 보고 느낀 점을 함께 나눠 주세요.</span>
        </div>
      ) : (
        <ol className="comment-list">
          {items.map((item) => (
            <Thread
              key={item.id}
              item={item}
              episodeId={episodeId}
              authenticated={authenticated}
              viewerHandle={viewerHandle}
              canModerate={canModerate}
              commentsOff={commentsOff}
              onUpdate={update}
              onDelete={remove}
              onReplies={addReplies}
            />
          ))}
        </ol>
      )}
      {cursor === null || error ? null : (
        <button
          type="button"
          className="comment-load-more"
          disabled={pending}
          onClick={() => {
            void load()
          }}
        >
          {pending ? '불러오는 중…' : '이전 댓글 더 보기'}
        </button>
      )}
    </section>
  )
}
