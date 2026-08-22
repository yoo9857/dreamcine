import { describe, expect, it } from 'vitest'

import { UploadStatus } from '../enums.js'
import {
  TERMINAL_UPLOAD_STATUS,
  canTransitionUpload,
  decideComplete,
  isTerminalUploadStatus,
} from './upload-state.js'

describe('isTerminalUploadStatus', () => {
  it.each(TERMINAL_UPLOAD_STATUS)('%s 는 끝난 상태다', (status) => {
    expect(isTerminalUploadStatus(status)).toBe(true)
  })

  it.each(['CREATED', 'UPLOADING'] as const)(
    '%s 는 아직 진행 중이다',
    (status) => {
      expect(isTerminalUploadStatus(status)).toBe(false)
    },
  )
})

describe('canTransitionUpload — 허용', () => {
  it.each([
    ['CREATED', 'UPLOADING'],
    ['CREATED', 'ABORTED'],
    ['CREATED', 'FAILED'],
    ['UPLOADING', 'UPLOADED'],
    ['UPLOADING', 'ABORTED'],
    ['UPLOADING', 'FAILED'],
  ] as const)('%s → %s', (from, to) => {
    expect(canTransitionUpload(from, to)).toBe(true)
  })
})

describe('canTransitionUpload — 금지', () => {
  it('끝난 상태에서는 어디로도 갈 수 없다', () => {
    for (const from of TERMINAL_UPLOAD_STATUS) {
      for (const to of UploadStatus) {
        expect(canTransitionUpload(from, to)).toBe(false)
      }
    }
  })

  it('같은 상태로의 전이를 허용하지 않는다', () => {
    // 멱등 처리는 "전이 가능" 이 아니라 "이미 도착해 있다" 로 판정해야 한다.
    // 둘을 섞으면 두 번째 완료가 새 자산을 만든다.
    for (const status of UploadStatus) {
      expect(canTransitionUpload(status, status)).toBe(false)
    }
  })

  it('업로드를 건너뛰고 완료할 수 없다', () => {
    expect(canTransitionUpload('CREATED', 'UPLOADED')).toBe(false)
  })

  it('전조합을 빠짐없이 판정한다', () => {
    // 표에 없는 상태가 추가되면 여기서 undefined 로 터진다.
    for (const from of UploadStatus) {
      for (const to of UploadStatus) {
        expect(typeof canTransitionUpload(from, to)).toBe('boolean')
      }
    }
  })
})

describe('decideComplete', () => {
  it.each(['CREATED', 'UPLOADING'] as const)('%s 는 진행한다', (status) => {
    expect(decideComplete(status)).toEqual({ kind: 'proceed' })
  })

  it('UPLOADED 는 이미 끝난 것으로 본다 (멱등)', () => {
    // 재시도로 완료가 두 번 오는 일은 실제로 자주 일어난다. 그때 자산이
    // 두 개 생기면 트랜스코드 비용이 두 배가 된다. (T05 §7 ★)
    expect(decideComplete('UPLOADED')).toEqual({ kind: 'already-completed' })
  })

  it('ABORTED 와 FAILED 를 구분해 거부한다', () => {
    // 사용자가 할 일이 다르다 — 중단은 새로 시작, 실패는 원인 확인.
    expect(decideComplete('ABORTED')).toEqual({
      kind: 'rejected',
      code: 'ABORTED',
    })
    expect(decideComplete('FAILED')).toEqual({
      kind: 'rejected',
      code: 'FAILED',
    })
  })

  it('모든 상태에 답을 준다', () => {
    for (const status of UploadStatus) {
      expect(decideComplete(status).kind).toBeDefined()
    }
  })
})
