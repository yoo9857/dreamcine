'use client'

import { AlertTriangle, LoaderCircle, Trash2, X } from 'lucide-react'
import React, { useEffect, useRef, useState, type ReactNode } from 'react'

interface AccountDeletionPanelProps {
  readonly handle: string
  readonly hasPassword: boolean
}

export function AccountDeletionPanel({
  handle,
  hasPassword,
}: AccountDeletionPanelProps): ReactNode {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const confirmationRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    confirmationRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !saving) setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, saving])

  const ready =
    confirmation === handle &&
    understood &&
    (!hasPassword || password.length > 0) &&
    !saving

  async function submit(): Promise<void> {
    if (!ready) return
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          confirmation,
          ...(hasPassword ? { password } : {}),
        }),
      })
      const payload = (await response.json()) as {
        error?: { message?: string }
      }
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            '마지막 관리자 계정은 탈퇴할 수 없습니다. 다른 관리자에게 권한을 이전해 주세요.',
          )
        }
        throw new Error(
          payload.error?.message ?? '탈퇴 요청을 처리하지 못했습니다.',
        )
      }
      window.location.assign('/login?accountDeleted=1')
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.',
      )
      setSaving(false)
    }
  }

  return (
    <>
      <div className="account-deletion-row">
        <div>
          <strong>회원탈퇴</strong>
          <p>30일 복구 기간을 거쳐 계정과 미디어를 안전하게 정리합니다.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(true)
          }}
        >
          회원탈퇴
        </button>
      </div>

      {open ? (
        <div className="account-delete-overlay" role="presentation">
          <section
            className="account-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-delete-title"
          >
            <button
              type="button"
              className="account-delete-close"
              aria-label="닫기"
              disabled={saving}
              onClick={() => {
                setOpen(false)
              }}
            >
              <X aria-hidden="true" />
            </button>
            <AlertTriangle
              className="account-delete-warning"
              aria-hidden="true"
            />
            <span>DELETE ACCOUNT</span>
            <h2 id="account-delete-title">정말 탈퇴하시겠어요?</h2>
            <p className="account-delete-lead">
              탈퇴 즉시 로그아웃되고 프로필과 작품이 비공개 처리됩니다. 30일 뒤
              아래 데이터가 물리적으로 제거됩니다.
            </p>
            <p className="account-delete-backup-note">
              등록된 이메일로 일회용 복구 링크를 보내드립니다. 30일 안에는 해당
              링크로 탈퇴를 취소할 수 있습니다.
            </p>
            <ul>
              <li>프로필, 작품, 댓글, 좋아요, 시청 기록과 알림</li>
              <li>업로드 원본, 변환 영상(HLS), 썸네일과 자막</li>
              <li>로그인 세션, 연결 계정과 내부 계정 데이터</li>
              <li>
                진행 중인 업로드는 중단되며 복구 후에도 자동 재개되지 않음
              </li>
            </ul>
            <p className="account-delete-backup-note">
              재해 복구용 암호화 백업의 사본은 정해진 보존주기가 끝나면 자동
              제거됩니다.
            </p>
            <label htmlFor="delete-account-handle">
              확인을 위해 <strong>{handle}</strong>을 입력하세요.
            </label>
            <input
              ref={confirmationRef}
              id="delete-account-handle"
              value={confirmation}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setConfirmation(event.currentTarget.value)
              }}
            />
            {hasPassword ? (
              <>
                <label htmlFor="delete-account-password">현재 비밀번호</label>
                <input
                  id="delete-account-password"
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => {
                    setPassword(event.currentTarget.value)
                  }}
                />
              </>
            ) : null}
            <label className="account-delete-check">
              <input
                type="checkbox"
                checked={understood}
                onChange={(event) => {
                  setUnderstood(event.currentTarget.checked)
                }}
              />
              <span>30일 복구 기간과 영구 삭제 절차를 확인했습니다.</span>
            </label>
            <p className="account-delete-message" role="alert">
              {message}
            </p>
            <div className="account-delete-actions">
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setOpen(false)
                }}
              >
                돌아가기
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={() => {
                  void submit()
                }}
              >
                {saving ? (
                  <LoaderCircle className="is-spinning" aria-hidden="true" />
                ) : (
                  <Trash2 aria-hidden="true" />
                )}
                {saving ? '처리 중' : '계정 삭제 요청'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
