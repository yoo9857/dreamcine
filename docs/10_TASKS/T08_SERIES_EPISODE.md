# T08 — 시리즈 · 에피소드 · 공개예약

## 진행 상태
- [x] S1 Spec 확인   — 2026-08-25 / 산출물 60개 확정 / ISS-014·015·016 승인 반영
- [x] S2 Skeleton    — 2026-08-25 / gate:s2 PASS / 센티넬 18개
- [ ] S3 구현        — 구현·정적·계약 완료 / 로컬 Docker 부재로 L3·US-02·US-08 CI 확인 대기

---

## 1. 목적

크리에이터가 시리즈를 만들고 에피소드를 붙여 공개(또는 예약공개)할 수 있게 한다.
상태 전이는 **순수 상태기계 하나**를 통과해야만 일어난다.

## 2. 참조 스펙

- `../00_SPEC/04_DOMAIN_MODEL.md` §2 (Series/Season/Episode), §3 상태기계
- `../00_SPEC/05_API_CONTRACT.md` §5
- `../00_SPEC/00_PRODUCT.md` §6 (AI 제작 표기 필수)
- `../00_SPEC/08_UIUX_SPEC.md` §1, §3
- `../00_SPEC/09_ERROR_CATALOG.md` (SERIES/EPISODE 절)
- `../00_SPEC/10_NFR.md` §4 `LIMITS`

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/state/episode-state.ts` | ★ 상태 전이 판정 (순수) | S2→S3 |
| `packages/core/src/schemas/series.schema.ts` | 시리즈 zod | S2→S3 |
| `packages/core/src/schemas/episode.schema.ts` | 에피소드 zod | S2→S3 |
| `packages/core/src/rules/slug.ts` | 슬러그 생성/정규화 (순수) | S2→S3 |
| `packages/core/src/rules/tag.ts` | 태그 정규화 (순수) | S2→S3 |
| `apps/web/src/services/series/create-series.ts` | 시리즈 생성 | S2→S3 |
| `apps/web/src/services/series/update-series.ts` | 수정 | S3 |
| `apps/web/src/services/series/delete-series.ts` | 소프트 삭제 (연쇄) | S3 |
| `apps/web/src/services/episode/create-episode.ts` | 에피소드 생성 | S2→S3 |
| `apps/web/src/services/episode/update-episode.ts` | 수정 | S3 |
| `apps/web/src/services/episode/publish-episode.ts` | ★ 상태 전이 | S2→S3 |
| `apps/web/app/api/series/route.ts` | GET/POST | S3 |
| `apps/web/app/api/series/[id]/route.ts` | GET/PATCH/DELETE | S3 |
| `apps/web/app/api/episodes/route.ts` | POST | S3 |
| `apps/web/app/api/episodes/[id]/route.ts` | GET/PATCH/DELETE | S3 |
| `apps/web/app/api/episodes/[id]/publish/route.ts` | POST | S3 |
| `apps/worker/src/jobs/publish-scheduled.ts` | 예약공개 실행 | S2→S3 |
| `apps/web/app/(main)/series/[seriesId]/page.tsx` | 시리즈 상세 | S3 |
| `apps/web/app/(studio)/studio/page.tsx` | 대시보드 | S3 |
| `apps/web/app/(studio)/studio/series/new/page.tsx` | 시리즈 생성 | S3 |
| `apps/web/app/(studio)/studio/series/[seriesId]/page.tsx` | 에피소드 관리 | S3 |
| `apps/web/src/components/studio/EpisodeTable.tsx` | 상태 배지 + 액션 | S3 |
| `apps/web/src/components/studio/AiDisclosureField.tsx` | AI 표기 입력 | S3 |
| `apps/web/src/components/SeriesCard.tsx` | 시리즈 카드 | S3 |

### S1 추가 산출물

기존 저장소의 서비스/리포지토리/큐 경계를 대조해, 라우트가 DB를 직접 호출하지 않고
예약공개·미디어 삭제가 실제 워커까지 연결되도록 아래 파일을 범위에 포함한다.

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/enums.ts` | 승인된 `PUBLISH_FAILED` 알림 enum | S2 |
| `packages/core/src/index.ts` | T08 스키마·상태기계·규칙 export | S2 |
| `packages/core/src/state/episode-state.test.ts` | 상태 × 조건 × 실행주체 전수 테스트 | S3 |
| `packages/core/src/rules/series-rules.test.ts` | 슬러그·고유화·태그 경계값 | S3 |
| `packages/core/src/schemas/series-episode.schema.test.ts` | REST 입력·출력 zod 계약 | S3 |
| `prisma/schema.prisma` | `PUBLISH_FAILED` enum 반영 | S2 |
| `prisma/migrations/20260825090000_t08_publish_failed_notification/migration.sql` | 알림 enum 마이그레이션 | S2 |
| `packages/db/src/repositories/series.repo.ts` | 시리즈 조회·한도·생성·수정·연쇄삭제 | S2→S3 |
| `packages/db/src/repositories/episode.repo.ts` | 시즌·에피소드·태그·상태 전이 트랜잭션 | S2→S3 |
| `packages/db/src/repositories/asset.repo.ts` | 자산 소유자·연결 여부 조회 | S3 |
| `packages/db/src/index.ts` | T08 repository export | S2 |
| `packages/db/tests/series-episode.integration.test.ts` | 시리즈·에피소드·상태·연쇄삭제 DB 통합 | S3 |
| `packages/queue/src/queues.ts` | 에피소드 미디어 삭제 큐 상수 | S2 |
| `packages/queue/src/jobs.ts` | 예약공개·알림·미디어 삭제 payload zod | S2→S3 |
| `packages/queue/src/index.ts` | T08 큐 스키마 export | S2 |
| `packages/queue/src/jobs.test.ts` | T08 잡 payload 검증 | S3 |
| `apps/worker/src/index.ts` | 예약공개·미디어 삭제 consumer 등록 | S3 |
| `apps/worker/src/scheduler.ts` | 1분 예약공개 등록 + 30초 리더 락/10초 갱신 | S3 |
| `apps/worker/src/scheduler.test.ts` | 이중 scheduler 중 단일 리더 검증 | S3 |
| `apps/worker/src/jobs/delete-episode-media.ts` | 삭제된 에피소드 HLS 제거 | S2→S3 |
| `apps/worker/src/jobs/episode-jobs.test.ts` | 예약공개·미디어 삭제·알림 멱등 통합 | S3 |
| `apps/web/src/services/series/list-series.ts` | 공개 시리즈 커서 목록 | S3 |
| `apps/web/src/services/series/get-series.ts` | 시리즈 상세 + 공개 에피소드 목록 | S3 |
| `apps/web/src/services/episode/get-episode.ts` | 공개/소유자 에피소드 상세 | S3 |
| `apps/web/src/services/episode/delete-episode.ts` | 상태기계를 통한 REMOVED 전이 | S3 |
| `apps/web/src/services/series/series-episode.integration.test.ts` | 서비스 권한·한도·상태·큐 통합 | S3 |
| `apps/web/app/(main)/series/[seriesId]/loading.tsx` | 시리즈 상세 로딩 상태 | S3 |
| `apps/web/app/(main)/series/[seriesId]/error.tsx` | 시리즈 상세 오류·재시도 상태 | S3 |
| `apps/web/app/(studio)/studio/loading.tsx` | 스튜디오 목록 로딩 상태 | S3 |
| `apps/web/app/(studio)/studio/error.tsx` | 스튜디오 목록 오류·재시도 상태 | S3 |
| `apps/web/app/(studio)/studio/series/[seriesId]/loading.tsx` | 에피소드 관리 로딩 상태 | S3 |
| `apps/web/app/(studio)/studio/series/[seriesId]/error.tsx` | 에피소드 관리 오류·재시도 상태 | S3 |
| `apps/web/src/components/studio/studio-components.test.tsx` | T08 화면 상태·AI 필수·액션 컴포넌트 | S3 |
| `apps/web/src/lib/messages/ko.ts` | 시리즈·에피소드·예약공개 한국어 문구 | S3 |
| `apps/web/e2e/series-episode.e2e.ts` | US-02, US-08 | S3 |
| `openapi.json` | T08 시리즈·에피소드 REST 계약 | S3 |

### S1 경계 결정

- T08은 `EPISODE_PUBLISH`, `NOTIFY_FANOUT`, 에피소드 미디어 삭제 잡의 payload와
  발행까지 소유한다. 신작 팬아웃의 실제 소비·알림 목록 UI는 T10이 확장한다.
- 삭제 서비스는 에피소드별 `assetId`를 미디어 삭제 큐에 멱등 `jobId`로 발행한다.
  워커는 HLS만 즉시 지우며 원본과 DB 자산의 보존·물리 삭제는 기존 정리 정책을 따른다.
- 예약공개 잡은 처리 결과(공개/초안복귀/실패 건수)를 구조화해 반환한다. 공통 잡
  메트릭 수집은 T11의 `withJob`이 이 결과를 계측하도록 연결한다.
- 공개/소유자 조회, 커서 목록, 삭제 라우트도 서비스 계층을 거친다. 라우트에서
  repository를 직접 호출하지 않는다.

## 4. S2 Skeleton

```ts
// packages/core/src/state/episode-state.ts — 이 프로젝트에서 가장 중요한 순수 함수
export type TransitionActor =
  | { kind: 'USER'; role: UserRole; isOwner: boolean }
  | { kind: 'SCHEDULER' }

export interface TransitionContext {
  current: EpisodeStatus
  next: EpisodeStatus
  assetStatus: AssetStatus | null
  aiDisclosure: string | null
  publishAt: Date | null
  publishedAt: Date | null
  now: Date
  actor: TransitionActor
}

export type TransitionVerdict =
  | { ok: true; patch: { publishAt: Date | null; publishedAt: Date | null } }
  | { ok: false; code: ErrorCode }

export function checkEpisodeTransition(ctx: TransitionContext): TransitionVerdict {
  throw new NotImplementedError('T08:checkEpisodeTransition')
}
```

**이 함수가 반환하는 `patch` 를 그대로 DB 에 쓴다.** 서비스 계층이
`publishedAt` 을 스스로 계산하지 않는다 — 계산 로직이 두 곳에 있으면 반드시 어긋난다.
최초 공개는 `publishedAt: now`, 재공개(`HIDDEN → PUBLISHED`)는 입력으로 받은 기존
`publishedAt` 을 그대로 반환한다.

```ts
// packages/core/src/rules/slug.ts
export function toSlug(title: string): string            // 한글 허용, 공백→'-', 소문자
export function ensureUniqueSlug(base: string, taken: (s: string) => Promise<boolean>): Promise<string>
```

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T08:checkEpisodeTransition` | `04_DOMAIN_MODEL.md` §3 전이표 전부 |
| 2 | `T08:toSlug` | 한글 보존, 특수문자 제거, 연속 하이픈 축약, 앞뒤 하이픈 제거 |
| 3 | `T08:ensureUniqueSlug` | 중복 시 `-2`, `-3` … 최대 100회 후 랜덤 접미 |
| 4 | `T08:normalizeTag` | 소문자, 공백→`-`, 길이 24 절단, 빈 문자열 거부 |
| 5 | `T08:createSeries` | 권한 → 한도(200개) → 슬러그 → INSERT → 카운터 |
| 6 | `T08:createEpisode` | 아래 순서 |
| 7 | `T08:publishEpisode` | 아래 순서 |
| 8 | `T08:updateEpisode` | 상태 무관 필드만. 상태 변경은 publish 로만 |
| 9 | `T08:deleteSeries` | 소프트 삭제 + 하위 에피소드 연쇄 + HLS 삭제 잡 발행 |
| 10 | `T08:publishScheduledJob` | 예약공개 배치 |
| 11 | `T08:studioPages` | 스튜디오 화면 (상태 4종) |

#### `createEpisode` 순서

```
1. can(actor, 'episode.create')                      → E_PERM_DENIED
2. 시리즈 조회 + 소유자 확인                            → E_SERIES_NOT_FOUND / E_PERM_NOT_OWNER
3. 에피소드 한도 (시리즈당 500)                          → E_SERIES_LIMIT_EXCEEDED
4. 자산 조회 + 소유자 확인                              → E_ASSET_NOT_FOUND
5. 자산이 이미 다른 에피소드에 연결됨?                     → E_DB_CONFLICT
6. 시즌 결정 (seasonNumber 없으면 기본 시즌 1 자동 생성)
7. 화수 중복 확인 (seriesId, seasonId, number)          → E_EPISODE_NUMBER_DUPLICATE
8. 태그 정규화 + 최대 10개                              → E_VALIDATION
9. 트랜잭션: Episode INSERT + EpisodeTag + Tag.useCount
10. 201 (status = DRAFT)
```

**5번이 중요하다.** 같은 자산을 두 에피소드에 연결하면 삭제 시 HLS 가 사라져
살아있는 에피소드가 깨진다. `Episode.assetId` 가 `@unique` 이므로 DB 도 막지만,
명시적 검사로 좋은 에러 메시지를 준다.

#### `publishEpisode` 순서

```
1. 에피소드 + 시리즈 + 자산 조회
2. can(actor, 'episode.publish' | 'episode.hide', { ownerId })
3. action → next 상태 매핑
     PUBLISH → PUBLISHED,  SCHEDULE → SCHEDULED,
     HIDE → HIDDEN,        UNHIDE → PUBLISHED
4. checkEpisodeTransition(ctx)                        → verdict
5. verdict.ok === false → throw AppError(verdict.code)
6. 트랜잭션:
     updateEpisodeStatus(id, next, verdict.patch)
     Series.episodeCount 재계산 (PUBLISHED 개수)
7. next === 'PUBLISHED' 이고 최초 공개면:
     enqueue(NOTIFY_FANOUT, { type: 'NEW_EPISODE', episodeId })
8. 200
```

#### 예약공개 잡 (`publish-scheduled.ts`)

```
스케줄: 1분마다 (scheduler 가 등록, 리더 락 필수)

1. SELECT ... WHERE status='SCHEDULED' AND publish_at <= now()
   ORDER BY publish_at LIMIT 100                      ← 인덱스 (status, publish_at)
2. 각 에피소드에 대해:
     checkEpisodeTransition({ current:'SCHEDULED', next:'PUBLISHED', ... })
     ok  → 전이 + 알림 팬아웃 발행
     실패 → checkEpisodeTransition({ current:'SCHEDULED', next:'DRAFT',
                                     actor:{ kind:'SCHEDULER' }, ... })
            를 통과해 DRAFT 로 되돌리고 크리에이터에게 PUBLISH_FAILED 알림
            (예: 자산이 그 사이 FAILED 가 된 경우)
3. 처리 건수를 메트릭으로 기록
4. 100건을 모두 처리했으면 즉시 다시 실행 (밀린 물량 소화)

★ 상태기계를 여기서도 통과시킨다. "예약했으니 무조건 공개" 는 위험하다.
  예약 후 자산이 실패했거나 AI 표기가 지워졌을 수 있다.
```

#### scheduler 리더 락

```
컨테이너가 실수로 2개 떠도 반복 잡이 2번 돌지 않게:

키:   sched:leader
값:   {인스턴스ID}
명령: SET sched:leader {id} NX EX 30
      리더면 10초마다 EXPIRE 갱신
      리더가 아니면 반복 잡을 등록하지 않고 대기하며 재시도

★ compose replicas:1 과 이중 방어. 배포 중 순간적으로 2개가 겹치는 일이 실제로 있다.
```

## 6. 예외처리

| 상황 | 에러코드 | 처리 |
|---|---|---|
| 권한 없음 | `E_PERM_DENIED` | 403 |
| 남의 시리즈 | `E_PERM_NOT_OWNER` | 403 |
| 시리즈 없음/삭제됨 | `E_SERIES_NOT_FOUND` | 404 |
| 시리즈 한도 초과 (200) | `E_SERIES_LIMIT_EXCEEDED` | 409 + 현재 개수 안내 |
| 에피소드 한도 초과 (500) | `E_SERIES_LIMIT_EXCEEDED` | 409 |
| 화수 중복 | `E_EPISODE_NUMBER_DUPLICATE` | 409 + 사용 가능한 다음 번호 제안 |
| 자산 없음 | `E_ASSET_NOT_FOUND` | 404 |
| 자산 재사용 | `E_DB_CONFLICT` | 409 + "이미 다른 화에 사용됨" |
| 자산 미준비 상태로 공개 | `E_EPISODE_ASSET_NOT_READY` | 409 + 변환 진행률 표시 |
| AI 표기 누락 | `E_EPISODE_AI_DISCLOSURE_REQUIRED` | 422 + 입력 필드로 포커스 |
| 예약 시각이 과거 | `E_EPISODE_SCHEDULE_IN_PAST` | 422 |
| 금지된 전이 (예: REMOVED → PUBLISHED) | `E_EPISODE_INVALID_TRANSITION` | 409 |
| 슬러그 중복 100회 실패 | — | 랜덤 6자 접미로 강제 생성. 실패시키지 않음 |
| 태그 11개 이상 | `E_VALIDATION` | 422 + 최대 개수 안내 |
| 예약공개 시 자산 실패 발견 | — | `DRAFT` 로 복귀 + 알림. **조용히 실패시키지 않는다** |
| 예약공개 잡 중 일부 실패 | — | 성공한 것은 커밋. 실패는 개별 로그 + 다음 주기 재시도 |
| 시리즈 삭제 시 HLS 삭제 실패 | — | 삭제 잡을 재시도 큐에. 소프트 삭제는 이미 완료 |
| scheduler 리더 락 획득 실패 | — | 대기 (정상 동작). info 로그 1회만 |

## 7. 테스트

### 상태기계 (전수 테스트 — 가장 중요)

```
5개 상태 × 5개 상태 = 25개 전이 조합을
  × 자산상태 3종 (READY / TRANSCODING / null)
  × AI표기 2종 (있음 / 없음)
  × 역할 3종 (소유자 / 모더레이터 / 타인)
전부 테스트한다. 표로 정의하고 반복 실행한다.
별도로 scheduler 주체의 `SCHEDULED → PUBLISHED/DRAFT` 허용과 나머지 전이 거부를
전수 테스트한다.
```

| 케이스 | 방식 |
|---|---|
| 전이 전수 조합 (위) | 단위 ★ |
| `REMOVED` 에서 어떤 상태로도 못 감 | 단위 |
| AI 표기 없이 `PUBLISHED` 불가 | 단위 |
| 자산 `READY` 아니면 `PUBLISHED` 불가 | 단위 |
| 최초 공개 시 `publishedAt` 설정, 재공개(UNHIDE) 시 유지 | 단위 ★ |
| 타인은 `HIDE` 불가, 모더레이터는 가능 | 단위 |
| `toSlug` — 한글/영문/숫자/특수문자/연속공백 | 단위 |
| `toSlug` — 빈 결과 시 대체값 | 단위 |
| `normalizeTag` — 경계값 | 단위 |
| `createEpisode` 정상 | 통합 |
| 화수 중복 → 정확한 에러 | 통합 |
| 자산 재사용 → 거부 | 통합 |
| 시즌 미지정 시 기본 시즌 자동 생성 | 통합 |
| `publishEpisode` 각 액션 | 통합 |
| 예약공개 잡 — 시각 도래분만 공개 | 통합 |
| 예약공개 잡 — 자산 실패 시 DRAFT 복귀 | 통합 ★ |
| 예약공개 잡 2회 실행 → 중복 알림 없음 | 통합 |
| 리더 락 — 2개 인스턴스 중 1개만 등록 | 통합 |
| 시리즈 소프트 삭제 → 에피소드 연쇄 + 피드 미노출 | 통합 |
| 시리즈 생성 → 에피소드 업로드 → 공개 | E2E (US-02) |
| 예약공개 → 시각 도래 → 공개 확인 | E2E (US-08, 시각 조작) |

**`publishedAt` 유지 테스트(★)**: `HIDE` 후 `UNHIDE` 할 때 `publishedAt` 을
다시 쓰면 피드에서 오래된 에피소드가 최신으로 올라온다. 실제로 흔한 버그다.

## 8. 완료 조건 (DoD)

- [ ] `pnpm gate` 통과
- [ ] 잔존 `NotImplementedError('T08:...')` = 0
- [ ] 상태 전이 전수 조합 테스트 통과
- [ ] US-02, US-08 E2E 통과
- [ ] 상태 변경 코드가 `checkEpisodeTransition` 밖에 없음
      (`status:` 직접 대입을 grep 으로 확인 — 리포지토리 1곳만 허용)
- [ ] `publishedAt` 이 UNHIDE 로 갱신되지 않음
- [ ] AI 표기 없이 공개가 **UI 와 API 양쪽에서** 막힘
- [ ] scheduler 2개 실행 시 예약공개가 1번만 일어남 (수동 검증)
