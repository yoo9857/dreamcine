# T02 — 데이터베이스: Prisma 스키마 · 마이그레이션 · 리포지토리

## 진행 상태
- [ ] S1 Spec 확인
- [ ] S2 Skeleton
- [ ] S3 구현

---

## 1. 목적

`04_DOMAIN_MODEL.md` 의 스키마를 실제 DB로 만들고, **모든 쿼리가 통과하는 단일 관문**
(`packages/db/src/repositories/`)을 세운다. 이 태스크가 끝나면 앱 코드에서
Prisma 를 직접 만질 필요가 영구히 없어진다.

## 2. 참조 스펙

- `../00_SPEC/04_DOMAIN_MODEL.md` (전체 — 스키마를 그대로 옮긴다)
- `../00_SPEC/09_ERROR_CATALOG.md` (DB 관련 코드)
- `../00_SPEC/10_NFR.md` §4 `LIMITS`, §8 커버리지
- `../GLOSSARY.md` §3 명명 규칙

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `prisma/schema.prisma` | 04 문서의 스키마 **그대로** | S2 |
| `prisma/migrations/**` | 초기 마이그레이션 | S3 |
| `prisma/seed.ts` | 개발용 시드 (사용자 3, 시리즈 2, 에피소드 6) | S3 |
| `packages/db/src/client.ts` | PrismaClient 싱글턴 (핫리로드 안전) | S3 |
| `packages/db/src/tx.ts` | `withTransaction()` | S3 |
| `packages/db/src/errors.ts` | Prisma 에러 → `AppError` 변환 | S3 |
| `packages/db/src/cursor.ts` | 커서 인코딩/디코딩 + 서명 | S3 |
| `packages/db/src/mappers/*.ts` | Prisma 모델 → core 엔티티 | S3 |
| `packages/db/src/repositories/user.repo.ts` | 사용자 조회/생성/카운터 | S2→S3 |
| `packages/db/src/repositories/series.repo.ts` | 시리즈 CRUD | S2→S3 |
| `packages/db/src/repositories/episode.repo.ts` | 에피소드 CRUD + 상태 전이 저장 | S2→S3 |
| `packages/db/src/repositories/asset.repo.ts` | 자산·렌디션 | S2→S3 |
| `packages/db/src/repositories/upload.repo.ts` | 업로드 세션 | S2→S3 |
| `packages/db/src/repositories/feed.repo.ts` | 피드 쿼리 (커서) | S2→S3 |
| `packages/db/src/repositories/social.repo.ts` | 팔로우/좋아요/댓글/알림 | S2→S3 |
| `packages/db/src/repositories/report.repo.ts` | 신고/심사 | S2→S3 |
| `packages/db/src/index.ts` | 공개 배럴 (`client` 는 export 하지 않는다) | S2 |
| `packages/db/tests/**` | testcontainers 통합 테스트 | S3 |

**`packages/db/src/index.ts` 가 `PrismaClient` 를 export 하지 않는 것이 핵심이다.**
export 하면 누군가 반드시 직접 쓴다. 리포지토리 함수만 내보낸다.

## 4. S2 Skeleton

### 리포지토리 시그니처 규약

```ts
// packages/db/src/repositories/episode.repo.ts
import type { Episode, EpisodeStatus } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

export interface ListEpisodesOptions {
  seriesId: string
  status?: EpisodeStatus[]
  includeDeleted?: false        // true 를 넣을 수 없게 타입으로 막는다
  limit: number
  cursor?: string
}

export interface Page<T> { items: T[]; nextCursor: string | null }

export function findEpisodeById(id: string): Promise<Episode | null> {
  throw new NotImplementedError('T02:findEpisodeById')
}

export function listEpisodesBySeries(o: ListEpisodesOptions): Promise<Page<Episode>> {
  throw new NotImplementedError('T02:listEpisodesBySeries')
}

export function createEpisode(input: CreateEpisodeData): Promise<Episode> {
  throw new NotImplementedError('T02:createEpisode')
}

/** 상태 전이 저장. 전이 허용 판정은 core 의 상태기계가 이미 끝냈다고 가정한다. */
export function updateEpisodeStatus(
  id: string,
  next: EpisodeStatus,
  patch: { publishAt?: Date | null; publishedAt?: Date | null },
): Promise<Episode> {
  throw new NotImplementedError('T02:updateEpisodeStatus')
}
```

### 커서 계약

```ts
// packages/db/src/cursor.ts
export interface CursorPayload { k: string | number; id: string }   // 정렬키 + 타이브레이커
export function encodeCursor(p: CursorPayload): string              // base64url + HMAC 서명
export function decodeCursor(s: string): CursorPayload               // 실패 시 E_FEED_INVALID_CURSOR
```

**타이브레이커에 `id` 를 반드시 포함한다.** 정렬키만 쓰면 동일 값이 여러 개일 때
행이 중복/누락된다. (`publishedAt` 이 같은 에피소드가 실제로 존재한다)

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | — | `schema.prisma` 작성 → `pnpm prisma migrate dev --name t02_initial` |
| 2 | `T02:client` | 싱글턴. `globalThis` 캐시로 Next 핫리로드 시 커넥션 누수 방지 |
| 3 | `T02:dbErrors` | Prisma 에러코드 → `AppError` 매핑 (아래 표) |
| 4 | `T02:cursor` | HMAC 서명 커서. 키는 `AUTH_SECRET` 파생 |
| 5 | `T02:tx` | `withTransaction` (타임아웃 10초, 격리수준 기본) |
| 6 | `T02:mappers` | BigInt → string 변환 포함 |
| 7 | `T02:userRepo` | 조회/생성/핸들중복확인/카운터 증감 |
| 8 | `T02:seriesRepo` | CRUD + 소프트삭제 |
| 9 | `T02:episodeRepo` | CRUD + 상태전이 + 화수 중복 검사 |
| 10 | `T02:assetRepo` | 자산/렌디션 + 상태전이 |
| 11 | `T02:uploadRepo` | 세션 + `completedParts` JSON 갱신 |
| 12 | `T02:feedRepo` | 3종 피드 커서 쿼리 (가장 어려움 — §알고리즘) |
| 13 | `T02:socialRepo` | 팔로우/좋아요/댓글/알림 + 카운터 트랜잭션 |
| 14 | `T02:reportRepo` | 신고 + 심사큐 |
| 15 | `T02:seed` | 시드 데이터 |

### Prisma 에러 매핑 (필수)

| Prisma 코드 | 의미 | `AppError` |
|---|---|---|
| `P2002` | 유니크 위반 | `E_DB_CONFLICT` (필드명을 `detail` 에) |
| `P2003` | 외래키 위반 | `E_DB_CONFLICT` |
| `P2025` | 대상 없음 | `E_NOT_FOUND` |
| `P1001` `P1002` | 연결 실패/타임아웃 | `E_DB_UNAVAILABLE` |
| `P2024` | 커넥션 풀 고갈 | `E_DB_UNAVAILABLE` |
| 그 외 | — | `E_INTERNAL` (원본 코드를 `detail` 에) |

**`P2002` 를 `E_DB_CONFLICT` 로 뭉개지 말아야 하는 경우**가 있다.
예: 회원가입의 이메일 중복은 `E_USER_EMAIL_TAKEN` 이어야 한다.
→ 리포지토리는 `E_DB_CONFLICT` 로 올리고, **서비스 계층이 문맥에 맞게 재분류**한다.

### 피드 쿼리 알고리즘

```
[popular]  WHERE status='PUBLISHED' AND deleted_at IS NULL
           ORDER BY rank_score DESC, id DESC
           커서: (rank_score, id) 튜플 비교

[latest]   WHERE status='PUBLISHED' AND deleted_at IS NULL
           ORDER BY published_at DESC, id DESC

[following] WHERE status='PUBLISHED' AND deleted_at IS NULL
            AND series.owner_id IN (SELECT following_id FROM follow WHERE follower_id=$me)
            ORDER BY published_at DESC, id DESC

공통: limit+1 개를 가져와 초과분이 있으면 nextCursor 생성, 반환은 limit 개
차단 필터: AND series.owner_id NOT IN (SELECT blocked_id FROM block WHERE blocker_id=$me)
```

**커서 비교는 튜플 비교로 한다** (`(rank_score, id) < ($k, $id)`).
`OFFSET` 은 절대 쓰지 않는다 — 깊은 페이지에서 느려지고, 새 글이 삽입되면 중복이 나온다.

팔로잉 피드에서 `IN` 서브쿼리가 느려지면 (팔로우 수가 큰 사용자)
`EXISTS` 조인으로 바꾼다. 판단 기준은 `EXPLAIN ANALYZE` 결과이며,
바꿀 때는 `_ISSUES.md` 에 [OBS-###] 로 근거를 남긴다.

### 카운터 트랜잭션 규약

```ts
// 좋아요 예시 — 반드시 한 트랜잭션
await withTransaction(async (tx) => {
  await tx.like.create({ data: { userId, episodeId } })        // P2002 → 이미 좋아요 상태
  await tx.episode.update({ where: { id: episodeId },
                            data: { likeCount: { increment: 1 } } })
})
```

`increment` 를 쓴다. **읽어서 +1 해서 쓰지 않는다** (경합 시 유실).

## 6. 예외처리

| 상황 | 에러코드 | 처리 |
|---|---|---|
| DB 연결 불가 | `E_DB_UNAVAILABLE` | 503. 재시도 가능(○). 알럿 |
| 커넥션 풀 고갈 | `E_DB_UNAVAILABLE` | 풀 크기·누수 점검 알럿 |
| 유니크 위반 | `E_DB_CONFLICT` | 서비스가 문맥별로 재분류 |
| 대상 없음 (update/delete) | `E_NOT_FOUND` | |
| 트랜잭션 타임아웃 | `E_DB_CONFLICT` | 재시도 1회 후 실패 |
| 커서 복호화 실패 | `E_FEED_INVALID_CURSOR` | 400. 첫 페이지로 안내 |
| 커서 서명 불일치 | `E_FEED_INVALID_CURSOR` | 동일. **로그에 남긴다** (위조 시도 가능성) |
| 소프트 삭제 행 조회 | — | 조회 결과에서 제외 (에러 아님) |
| BigInt 직렬화 | — | mapper 가 string 으로 변환. `JSON.stringify` 직접 호출 금지 |

### 소프트 삭제 누락 방지 하네스

리포지토리 함수마다 `deletedAt: null` 을 손으로 넣는 것은 반드시 빠뜨린다.
그래서 **테스트로 강제한다**:

```ts
// packages/db/tests/soft-delete.test.ts
// 모든 find*/list* 함수에 대해: 삭제된 행을 만들고, 결과에 포함되지 않음을 단정
// 새 리포지토리 함수를 추가하면 이 테스트 목록에도 추가해야 한다 (누락 시 리뷰에서 잡힘)
```

## 7. 테스트

| 케이스 | 방식 |
|---|---|
| 마이그레이션이 빈 DB 에 적용된다 | testcontainers |
| 스키마 ↔ 마이그레이션 드리프트 없음 | `contract:prisma` 게이트 |
| 각 리포지토리 정상 경로 | 통합 |
| 유니크 위반 → `E_DB_CONFLICT` | 통합 |
| 없는 id 조회 → `null` (throw 아님) | 통합 |
| 소프트 삭제 행이 조회에서 제외 | 통합 (§6) |
| 커서 왕복 (encode→decode) 동일성 | 단위 |
| 위조 커서 → `E_FEED_INVALID_CURSOR` | 단위 |
| 커서 페이지네이션 중복/누락 없음 | 통합 — **동일 `publishedAt` 을 가진 행 10개**로 검증 |
| 페이지 경계에서 새 행 삽입 시 중복 없음 | 통합 |
| 카운터 동시 증가 (10병렬) 정확성 | 통합 |
| BigInt 가 string 으로 매핑 | 단위 |
| 커버리지 ≥ 70% (`packages/db`) | 게이트 |

**동일 정렬키 10개 테스트가 핵심이다.** 커서 페이지네이션 버그는 거의 항상
여기서 나오고, 실제 서비스에서는 재현이 어렵다.

## 8. 완료 조건 (DoD)

- [ ] `pnpm gate` 통과
- [ ] `contract:prisma` 드리프트 0
- [ ] 잔존 `NotImplementedError('T02:...')` = 0
- [ ] `pnpm db:seed` 후 시드 데이터 조회 확인
- [ ] `packages/db` 커버리지 ≥ 70%
- [ ] `packages/db/src/index.ts` 가 `PrismaClient` 를 export 하지 않음 (grep 확인)
- [ ] `apps/**` 에 `@prisma/client` import 0건 (depcruise 가 보장하지만 직접 확인)
- [ ] 피드 커서 중복/누락 테스트 통과
