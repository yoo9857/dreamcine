# T10 — 소셜: 팔로우 · 좋아요 · 댓글 · 알림

## 진행 상태
- [x] S1 Spec 확인   — 2026-08-25 / 산출물 61개 확정 / 기존 T02 소셜 repository 재사용
- [x] S2 Skeleton    — 2026-08-25 / gate:s2 PASS / 센티넬 27개
- [ ] S3 구현

---

## 1. 목적

SNS 의 본체를 붙인다. 모든 소셜 동작은 **멱등**하고, 카운터는 **정합성이 깨져도
서비스가 멈추지 않게** 만든다.

## 2. 참조 스펙

- `../00_SPEC/05_API_CONTRACT.md` §7 소셜, §10 레이트리밋
- `../00_SPEC/04_DOMAIN_MODEL.md` §2 (Follow/Block/Like/Comment/Notification), §4 카운터
- `../00_SPEC/08_UIUX_SPEC.md` §3 상태, §6 컴포넌트
- `../00_SPEC/09_ERROR_CATALOG.md` (SOCIAL/COMMENT 절)
- `../00_SPEC/07_AUTH_SECURITY.md` §5 사용자 생성 문자열

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/schemas/comment.schema.ts` | 댓글 zod | S2→S3 |
| `packages/core/src/schemas/notification.schema.ts` | 알림 payload 타입별 zod | S2→S3 |
| `packages/core/src/rules/sanitize-text.ts` | 제어문자/zero-width 제거 (순수) | S2→S3 |
| `apps/web/src/services/social/follow-user.ts` | 팔로우/언팔 (멱등) | S2→S3 |
| `apps/web/src/services/social/block-user.ts` | 차단/해제 | S2→S3 |
| `apps/web/src/services/social/toggle-like.ts` | 좋아요 (멱등) | S2→S3 |
| `apps/web/src/services/social/create-comment.ts` | 댓글 작성 | S2→S3 |
| `apps/web/src/services/social/delete-comment.ts` | 댓글 삭제 | S3 |
| `apps/web/src/services/notification/notify.ts` | 알림 생성 (단일 관문) | S2→S3 |
| `apps/web/app/api/users/[handle]/follow/route.ts` | PUT/DELETE | S3 |
| `apps/web/app/api/users/[handle]/block/route.ts` | PUT/DELETE | S3 |
| `apps/web/app/api/episodes/[id]/likes/route.ts` | PUT/DELETE | S3 |
| `apps/web/app/api/episodes/[id]/comments/route.ts` | GET/POST | S3 |
| `apps/web/app/api/comments/[id]/route.ts` | PATCH/DELETE | S3 |
| `apps/web/app/api/notifications/route.ts` | GET | S3 |
| `apps/web/app/api/notifications/read/route.ts` | POST | S3 |
| `apps/worker/src/jobs/notification-fanout.ts` | ★ 팬아웃 배치 | S2→S3 |
| `apps/worker/src/jobs/counter-flush.ts` | 조회수 버퍼 반영 | S2→S3 |
| `apps/worker/src/jobs/counter-reconcile.ts` | 카운터 정합성 보정 | S2→S3 |
| `apps/web/src/components/comment/CommentThread.tsx` | 댓글 UI | S3 |
| `apps/web/src/components/social/LikeButton.tsx` | 낙관적 UI | S3 |
| `apps/web/src/components/social/FollowButton.tsx` | 낙관적 UI | S3 |
| `apps/web/src/components/NotificationList.tsx` | 알림 목록 | S3 |
| `apps/web/app/(main)/u/[handle]/page.tsx` | 프로필 | S3 |
| `apps/web/app/(main)/notifications/page.tsx` | 알림 화면 | S3 |
| `apps/web/e2e/social.e2e.ts` | US-05, US-06 | S3 |

### S1 추가 산출물

기존 저장소의 Prisma repository, Redis, BullMQ, App Router 경계를 대조해 멱등
트랜잭션과 알림·카운터 잡이 실제 실행 경로까지 이어지도록 아래 파일을 범위에
포함한다. 새 Prisma 모델이나 인덱스는 추가하지 않는다.

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/entities.ts` | 댓글 사용자·알림 표시용 응답 타입 | S2 |
| `packages/core/src/index.ts` | T10 스키마·규칙·타입 export | S2 |
| `packages/core/src/rules/sanitize-text.test.ts` | 제어문자·zero-width·개행 정규화 단위 테스트 | S3 |
| `packages/core/src/schemas/comment.schema.test.ts` | 댓글 길이·부모·커서 계약 테스트 | S3 |
| `packages/core/src/schemas/notification.schema.test.ts` | 타입별 알림 payload 판별 테스트 | S3 |
| `packages/db/src/repositories/social.repo.ts` | 멱등 팔로우·차단·좋아요·댓글 트랜잭션 | S2→S3 |
| `packages/db/src/repositories/notification.repo.ts` | 알림 생성·목록·읽음·팬아웃 배치 | S2→S3 |
| `packages/db/src/repositories/counter.repo.ts` | 카운터 flush·실측·보정 쿼리 | S2→S3 |
| `packages/db/src/mappers/social.mapper.ts` | 댓글 사용자·검증된 알림 payload 매핑 | S2→S3 |
| `packages/db/src/index.ts` | T10 repository export | S2 |
| `packages/db/tests/social.integration.test.ts` | 멱등·동시성·차단·댓글·알림 통합 테스트 | S3 |
| `packages/db/tests/counter.integration.test.ts` | 실측 카운터 보정 통합 테스트 | S3 |
| `packages/queue/src/jobs.ts` | 알림 팬아웃·flush·reconcile payload zod | S2→S3 |
| `packages/queue/src/index.ts` | T10 잡 계약 export | S2 |
| `packages/queue/src/jobs.test.ts` | T10 잡 payload 검증 | S3 |
| `apps/worker/src/index.ts` | T10 consumer 등록 | S3 |
| `apps/worker/src/scheduler.ts` | 1분 flush·매일 04시 reconcile 등록 | S3 |
| `apps/worker/src/scheduler.test.ts` | T10 scheduler 단일 등록·주기 검증 | S3 |
| `apps/worker/src/jobs/notification-fanout.test.ts` | 3배치·재개·중복 안전 테스트 | S3 |
| `apps/worker/src/jobs/counter-flush.test.ts` | GETDEL 후 DB 실패 시 복원 테스트 | S3 |
| `apps/worker/src/jobs/counter-reconcile.test.ts` | 불일치 보정·경고 메트릭 테스트 | S3 |
| `apps/web/src/lib/redis.ts` | 알림 SET NX·조회수 GETDEL/INCRBY 명령 | S2→S3 |
| `apps/web/src/lib/redis.test.ts` | T10 Redis 명령·장애 변환 테스트 | S3 |
| `apps/web/src/services/social/unblock-user.ts` | 차단 해제 유스케이스 | S2→S3 |
| `apps/web/src/services/social/update-comment.ts` | 15분 내 댓글 수정·소유권 검사 | S2→S3 |
| `apps/web/src/services/social/list-comments.ts` | 댓글 커서·대댓글 미리보기 3개 | S2→S3 |
| `apps/web/src/services/social/social.integration.test.ts` | 서비스 차단·알림 실패 격리 테스트 | S3 |
| `apps/web/src/services/notification/list-notifications.ts` | 사용자 알림 커서 목록 | S2→S3 |
| `apps/web/src/services/notification/mark-notifications-read.ts` | 본인 알림 일괄 읽음 | S2→S3 |
| `apps/web/src/services/user/get-profile.ts` | 공개 프로필·팔로우 상태 조회 | S2→S3 |
| `apps/web/src/components/social/social-components.test.tsx` | 좋아요·팔로우 낙관 UI와 연타 방지 | S3 |
| `apps/web/src/components/comment/comment-thread.test.tsx` | 댓글 상태 4종·작성·삭제 UI | S3 |
| `apps/web/src/components/notification-list.test.tsx` | 알림 타입·상태 4종 UI | S3 |
| `apps/web/src/lib/messages/ko.ts` | 소셜·댓글·알림 상태와 오류 문구 | S3 |
| `openapi.json` | T10 12개 REST 동작의 요청·응답 계약 | S3 |

## 4. S2 Skeleton

```ts
// apps/web/src/services/notification/notify.ts
// ★ 알림 생성의 유일한 관문. 다른 서비스가 Notification 을 직접 INSERT 하지 않는다.
export type NotifyInput =
  | { type: 'NEW_FOLLOWER';     to: string; actorId: string }
  | { type: 'NEW_LIKE';         to: string; actorId: string; episodeId: string }
  | { type: 'NEW_COMMENT';      to: string; actorId: string; episodeId: string; commentId: string }
  | { type: 'NEW_EPISODE';      to: string; seriesId: string; episodeId: string }
  | { type: 'TRANSCODE_DONE';   to: string; assetId: string; episodeId?: string }
  | { type: 'TRANSCODE_FAILED'; to: string; assetId: string; errorCode: string }
  | { type: 'PUBLISH_FAILED';   to: string; episodeId: string; errorCode: string }
  | { type: 'MODERATION';       to: string; targetType: string; targetId: string; action: string }

export function notify(input: NotifyInput): Promise<void> {
  throw new NotImplementedError('T10:notify')
}
```

```ts
// apps/web/src/services/social/toggle-like.ts
export function addLike(episodeId: string, userId: string): Promise<{ likeCount: number }> {
  throw new NotImplementedError('T10:addLike')
}
export function removeLike(episodeId: string, userId: string): Promise<{ likeCount: number }> {
  throw new NotImplementedError('T10:removeLike')
}
```

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T10:sanitizeText` | 제어문자·zero-width·과도한 개행(3개 이상 → 2개) 제거 |
| 2 | `T10:notify` | 자기 자신에게 알림 금지 + 중복 억제 (아래) |
| 3 | `T10:followUser` | 멱등 + 카운터 트랜잭션 + 알림 |
| 4 | `T10:unfollowUser` | 멱등 |
| 5 | `T10:blockUser` | 차단 시 **양방향 팔로우 자동 해제** |
| 6 | `T10:addLike` / `T10:removeLike` | 멱등 + 카운터 |
| 7 | `T10:createComment` | 깊이 검사 + 차단 검사 + 카운터 + 알림 |
| 8 | `T10:deleteComment` | 소프트 삭제. 대댓글이 있으면 본문만 "삭제된 댓글" |
| 9 | `T10:listComments` | 커서 + 대댓글 미리보기 3개 |
| 10 | `T10:notificationFanoutJob` | 신작 알림 배치 (아래) |
| 11 | `T10:counterFlushJob` | Redis 조회수 → Postgres |
| 12 | `T10:counterReconcileJob` | 실측 대조 보정 |
| 13 | `T10:socialComponents` | 낙관적 UI 컴포넌트 |

### 멱등 구현 패턴

```ts
// 팔로우 — 이미 팔로우 중이어도 200
await withTransaction(async (tx) => {
  const r = await tx.follow.createMany({
    data: { followerId, followingId },
    skipDuplicates: true,            // ★ 핵심
  })
  if (r.count === 1) {               // 실제로 생겼을 때만 카운터/알림
    await tx.user.update({ where: { id: followingId },
                           data: { followerCount: { increment: 1 } } })
    created = true
  }
})
if (created) await notify({ type: 'NEW_FOLLOWER', to: followingId, actorId: followerId })
```

**`skipDuplicates` 로 P2002 를 애초에 피하고, `count` 로 실제 변경을 판단한다.**
이러면 재시도가 카운터를 부풀리지 않는다.

**알림은 트랜잭션 밖에서 발행한다.** 알림 실패가 팔로우를 롤백시키면 안 된다.

### 차단의 연쇄 효과 (놓치기 쉬움)

```
blockUser(A → B) 시:
1. Block 행 생성 (멱등)
2. A→B 팔로우 삭제 + B.followerCount 감소
3. B→A 팔로우 삭제 + A.followerCount 감소
4. 이후 피드/댓글/검색에서 상호 미노출 (T09 필터)
5. B 가 A 에게 알림을 보낼 수 없음 (notify 에서 차단 검사)

★ 2·3 을 빼먹으면 "차단했는데 여전히 팔로워 목록에 있다" 는 버그가 된다.
```

### 알림 중복 억제

```
같은 사람이 같은 에피소드에 좋아요를 취소하고 다시 누르면
알림이 두 번 가면 안 된다.

억제 키: notif:dedup:{to}:{type}:{actorId}:{targetId}
TTL: 24시간
SET NX 성공 시에만 알림 생성.

예외: NEW_COMMENT 는 억제하지 않는다 (댓글마다 알림이 맞다).
```

### 신작 알림 팬아웃 (`notification-fanout.ts`)

```
입력: { type: 'NEW_EPISODE', episodeId }

1. 에피소드 → 시리즈 → 소유자 확인
2. 소유자의 팔로워 목록을 **커서로 배치 조회** (1000명씩)
3. 각 배치마다:
     - 차단 관계 제외
     - createMany(skipDuplicates) 로 Notification 일괄 INSERT
4. 다음 배치 계속

★ 팔로워 10만 명을 한 번에 INSERT 하면 트랜잭션이 터진다. 반드시 배치.
★ 잡이 중간에 죽으면? 커서를 잡 데이터에 저장해 재개한다.
  (createMany skipDuplicates 이므로 중복 실행도 안전)

레이트: 팔로워 수가 매우 많으면 배치 사이에 짧은 지연을 둔다 (DB 부하 분산).
```

### 카운터 정합성 보정 (`counter-reconcile.ts`)

```
스케줄: 매일 새벽 4시 (트래픽 최저)

대상: 최근 7일 내 변경된 에피소드 + 사용자
방식:
  실측 = SELECT count(*) FROM "like" WHERE episode_id = ...
  저장 = episode.like_count
  다르면 실측으로 UPDATE + warn 로그 (어긋난 개수를 메트릭으로)

★ 어긋남이 지속적으로 발생하면 트랜잭션 누락 버그가 있다는 신호다.
  메트릭으로 추적해서 원인을 찾는다. 조용히 고치고 넘어가지 않는다.
```

### 낙관적 UI 규칙

```
좋아요 버튼:
1. 클릭 즉시 UI 를 변경 (하트 채움, 카운트 +1)
2. API 호출
3. 성공 → 서버가 준 실제 카운트로 동기화
4. 실패 → UI 롤백 + 토스트 "잠시 후 다시 시도해 주세요"

★ 서버 응답에 최신 카운트를 포함시키는 이유가 여기 있다.
  낙관적 +1 이 실제와 다를 수 있으므로(다른 사람이 동시에 눌렀을 때) 동기화가 필요하다.

연타 방지: 클릭 후 500ms 동안 버튼 비활성. 마지막 상태만 서버에 반영 (디바운스 아님 —
          중간 상태를 보내면 서버에 불필요한 요청이 쌓인다)
```

## 6. 예외처리

| 상황 | 에러코드 | 처리 |
|---|---|---|
| 자기 자신 팔로우/신고 | `E_USER_SELF_ACTION` | 400. UI 에서도 버튼 숨김 |
| 이미 팔로우 중 | — | **200 (멱등)**. 카운터 증가 안 함 |
| 팔로우 안 한 상태에서 언팔 | — | **200 (멱등)** |
| 대상 사용자 없음 | `E_USER_NOT_FOUND` | 404 |
| 차단 관계에서 상호작용 | `E_SOCIAL_BLOCKED` | 403 |
| 좋아요 중복 | — | 200 (멱등) |
| 댓글 1000자 초과 | `E_COMMENT_TOO_LONG` | 422 + 남은 글자 수 표시 |
| 대댓글의 대댓글 | `E_COMMENT_DEPTH_EXCEEDED` | 422 |
| 댓글 차단된 시리즈 | `E_COMMENT_DISABLED` | 403 + 입력창 숨김 |
| 비공개 에피소드에 댓글 | `E_EPISODE_NOT_FOUND` | 404 |
| 15분 지난 댓글 수정 | `E_PERM_DENIED` | 403 + 수정 버튼 숨김 |
| 남의 댓글 삭제 | `E_PERM_NOT_OWNER` | 403 (모더레이터는 허용) |
| 댓글 도배 | `E_RATE_LIMITED` | 429 + 대기 시간 |
| 알림 생성 실패 | — | **원 동작은 성공 유지.** error 로그. 재시도 큐 |
| 팬아웃 잡 중간 실패 | — | 커서 저장 후 재시도. 중복 안전 |
| 카운터 불일치 발견 | — | 보정 + warn 로그 + 메트릭. 사용자에게 안 보임 |
| Redis 장애 (조회수 버퍼) | — | 조회수 증가 유실 수용. 재생은 정상 |
| `counter-flush` 실패 | — | **Redis 키를 삭제하지 않는다.** 다음 주기에 재시도 |
| 삭제된 댓글의 대댓글 | — | 부모는 "삭제된 댓글입니다" 로 표시, 대댓글은 유지 |

### `counter-flush` 의 유실 방지

```
잘못된 구현:
  GET viewbuf:{id} → DB 반영 → DEL viewbuf:{id}
  (DB 반영과 DEL 사이에 죽으면 중복 반영, GET 이후 증가분은 유실)

올바른 구현:
  1. n = GETDEL viewbuf:{id}          ← 원자적으로 읽고 삭제
  2. n 을 DB 에 increment
  3. 2번이 실패하면 INCRBY viewbuf:{id} n 으로 되돌린다  ← 유실 방지

Redis 7 의 GETDEL 을 사용한다.
```

## 7. 테스트

| 케이스 | 방식 |
|---|---|
| `sanitizeText` — 제어문자/zero-width/개행 | 단위 |
| 팔로우 멱등 — 2회 호출 → 카운터 1 증가 | 통합 ★ |
| 언팔 멱등 — 2회 호출 → 에러 없음 | 통합 |
| 자기 팔로우 → `E_USER_SELF_ACTION` | 통합 |
| 차단 시 양방향 팔로우 해제 + 카운터 감소 | 통합 ★ |
| 차단 후 상호작용 → `E_SOCIAL_BLOCKED` | 통합 |
| 좋아요 멱등 — 2회 → 카운터 1 | 통합 ★ |
| 좋아요 → 취소 → 좋아요 → 알림 1회만 | 통합 ★ |
| 좋아요 동시 10요청 → 카운터 정확히 1 | 통합 ★ |
| 댓글 깊이 2단 시도 → 거부 | 통합 |
| 댓글 카운터 정확성 | 통합 |
| 삭제된 댓글의 대댓글 유지 | 통합 |
| 15분 경과 후 수정 거부 | 통합 (시각 조작) |
| `notify` 자기 자신에게는 생성 안 함 | 통합 |
| `notify` 차단 관계면 생성 안 함 | 통합 |
| 팬아웃 — 팔로워 2500명 → 전원 알림 (3배치) | 통합 ★ |
| 팬아웃 2회 실행 → 알림 중복 없음 | 통합 ★ |
| `counter-flush` — DB 실패 시 Redis 값 복원 | 통합 ★ |
| `counter-reconcile` — 인위적 불일치 보정 | 통합 |
| `LikeButton` 낙관적 UI → 실패 시 롤백 | 컴포넌트 |
| `FollowButton` 연타 → 요청 1회 | 컴포넌트 |
| `CommentThread` 상태 4종 | 컴포넌트 |
| 팔로우 → 팔로잉 피드 노출 | E2E (US-05) |
| 좋아요·댓글 → 크리에이터 알림 수신 | E2E (US-06) |

## 8. 완료 조건 (DoD)

- [ ] `pnpm gate` 통과
- [ ] 잔존 `NotImplementedError('T10:...')` = 0
- [ ] 멱등성 테스트 전부 통과 (팔로우/좋아요/팬아웃)
- [ ] 동시성 테스트 통과 (좋아요 10병렬 → 카운터 1)
- [ ] US-05, US-06 E2E 통과
- [ ] `Notification` 을 직접 INSERT 하는 코드가 `notify.ts` 밖에 없음 (grep)
- [ ] 차단 시 팔로우 양방향 해제 확인
- [ ] `counter-flush` 유실 방지 (GETDEL + 복원) 테스트 통과
- [ ] 낙관적 UI 롤백 동작 확인 (API 강제 실패 상태에서 수동)
