# T09 — 피드 · 랭킹 · 검색 · 태그

## 진행 상태
- [x] S1 Spec 확인   — 2026-08-25 / 산출물 56개 확정 / DEP-004 승인 반영
- [ ] S2 Skeleton
- [ ] S3 구현

---

## 1. 목적

인기/최신/팔로잉 3종 피드와 검색·태그 탐색을 만든다.
랭킹은 **순수 함수 하나**로 계산하고 배치로 반영한다 (요청 시 계산 금지).

## 2. 참조 스펙

- `../00_SPEC/05_API_CONTRACT.md` §1 페이지네이션, §6 피드/검색
- `../00_SPEC/04_DOMAIN_MODEL.md` §6 인덱스 근거
- `../00_SPEC/08_UIUX_SPEC.md` §2 레이아웃, §3 상태, §8 성능
- `../00_SPEC/10_NFR.md` §1 성능 목표
- `../00_SPEC/01_ARCHITECTURE.md` §5 저장 위치 (피드 캐시)
- `../00_SPEC/03_TECH_STACK.md` §2 서버 상태, §4 테스트·품질
- `../00_SPEC/09_ERROR_CATALOG.md` (`E_FEED_INVALID_CURSOR`, `E_VALIDATION`, 가용성 오류)

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/rules/rank-score.ts` | ★ 랭킹 산식 (순수) | S2→S3 |
| `packages/core/src/schemas/pagination.schema.ts` | 커서/limit zod | S2→S3 |
| `packages/db/src/repositories/feed.repo.ts` | 피드 쿼리 (T02 에서 골격 완료) | S3 |
| `packages/db/src/repositories/search.repo.ts` | 검색 쿼리 | S2→S3 |
| `apps/web/src/services/feed/get-feed.ts` | 피드 유스케이스 + 캐시 | S2→S3 |
| `apps/web/src/services/feed/search.ts` | 검색 유스케이스 | S2→S3 |
| `apps/web/app/api/feed/route.ts` | GET | S3 |
| `apps/web/app/api/search/route.ts` | GET | S3 |
| `apps/web/app/api/tags/[tag]/episodes/route.ts` | GET | S3 |
| `apps/web/app/api/tags/trending/route.ts` | GET | S3 |
| `apps/worker/src/jobs/rank-recompute.ts` | 랭킹 배치 | S2→S3 |
| `apps/web/src/components/feed/FeedList.tsx` | 무한스크롤 + 상태 4종 | S2→S3 |
| `apps/web/src/components/feed/EpisodeCard.tsx` | 카드 | S3 |
| `apps/web/src/hooks/use-infinite-feed.ts` | react-query 무한스크롤 | S3 |
| `apps/web/app/(main)/page.tsx` | 홈 (인기 피드) | S3 |
| `apps/web/app/(main)/following/page.tsx` | 팔로잉 피드 | S3 |
| `apps/web/app/(main)/search/page.tsx` | 검색 | S3 |
| `apps/web/app/(main)/tags/[tag]/page.tsx` | 태그 피드 | S3 |

### S1 추가 산출물

현재 저장소의 repository·Redis·BullMQ·App Router 경계를 대조해, API 응답 계약과
배치 등록, 캐시 장애 우회, 테스트·성능 게이트가 실제 실행 경로까지 이어지도록 아래
파일을 범위에 포함한다.

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/entities.ts` | `FeedItem`·검색 결과·인기 태그 타입 | S2 |
| `packages/core/src/index.ts` | T09 타입·스키마·랭킹 규칙 export | S2 |
| `packages/core/src/rules/rank-score.test.ts` | 산식 경계·단조성·30일 감쇠 단위 테스트 | S3 |
| `packages/core/src/schemas/feed.schema.ts` | 피드 종류·검색·태그 query/response zod 계약 | S2→S3 |
| `packages/core/src/schemas/feed.schema.test.ts` | limit·검색어·응답 직렬화 계약 | S3 |
| `prisma/migrations/20260825_t09_feed_search/migration.sql` | `pg_trgm` 확장·검색 GIN 인덱스 | S2 |
| `packages/db/src/repositories/rank.repo.ts` | 랭킹 대상 조회·점수 일괄 갱신·30일 초과 초기화 | S2→S3 |
| `packages/db/src/index.ts` | T09 repository export | S2 |
| `packages/db/tests/feed-search.integration.test.ts` | 피드·검색·커서·필터·N+1·Redis 우회 통합 | S3 |
| `packages/db/tests/feed-performance.integration.test.ts` | 1,000건 시드·p95·3종 `EXPLAIN ANALYZE` | S3 |
| `packages/queue/src/jobs.ts` | 최근/만료 랭킹 재계산 payload zod | S2→S3 |
| `packages/queue/src/index.ts` | 랭킹 잡 계약 export | S2 |
| `packages/queue/src/jobs.test.ts` | 랭킹 잡 payload 검증 | S3 |
| `apps/worker/src/index.ts` | `FEED_RANK` consumer 등록 | S3 |
| `apps/worker/src/scheduler.ts` | 10분 재계산·일일 만료점수 초기화 scheduler 등록 | S3 |
| `apps/worker/src/scheduler.test.ts` | 랭킹 scheduler 단일 등록·주기 검증 | S3 |
| `apps/worker/src/jobs/rank-recompute.test.ts` | 순수 산식 사용·배치·실패 시 기존점수 보존 | S3 |
| `apps/web/src/lib/redis.ts` | TTL 포함 일반 `SET` 명령 추가 | S2→S3 |
| `apps/web/src/lib/redis.test.ts` | 캐시 SET/GET·장애 변환 검증 | S3 |
| `apps/web/src/services/feed/feed.integration.test.ts` | 캐시 정책·차단 후 보충·좋아요 일괄 조회 | S3 |
| `apps/web/src/components/feed/SearchResults.tsx` | 타입별 검색 결과·상태 4종 | S3 |
| `apps/web/src/components/feed/feed-components.test.tsx` | 카드 종횡비·피드/검색 상태·부분 실패 | S3 |
| `apps/web/src/hooks/use-infinite-feed.test.tsx` | 400px 프리페치·중복 방지·부분 실패 복구 | S3 |
| `apps/web/app/(main)/layout.tsx` | 데스크톱 상단바/사이드바·모바일 하단탭 | S3 |
| `apps/web/app/(main)/loading.tsx` | 공통 피드 스켈레톤 8개 | S3 |
| `apps/web/app/(main)/error.tsx` | 공통 오류 코드·재시도 화면 | S3 |
| `apps/web/src/components/layout/AppShell.tsx` | 반응형 메인 레이아웃 | S3 |
| `apps/web/src/components/layout/MainNav.tsx` | 홈·팔로잉·검색·업로드 내비게이션 | S3 |
| `apps/web/src/lib/messages/ko.ts` | 피드·검색·태그 상태와 오류 한국어 문구 | S3 |
| `apps/web/e2e/feed-ranking.e2e.ts` | 무한스크롤·복원·US-05 | S3 |
| `apps/web/e2e/feed-performance.e2e.ts` | 1,000건 조건 피드 API p95 측정 | S3 |
| `openapi.json` | T09 4개 REST 경로·응답 union 계약 | S3 |
| `package.json` | 승인된 Lighthouse CI 명령 등록 | S2 |
| `pnpm-lock.yaml` | 승인된 Lighthouse CI 버전 고정 | S2 |
| `lighthouserc.cjs` | 모바일 LCP·CLS 예산과 홈 수집 설정 | S2→S3 |
| `.github/workflows/gate.yml` | 프로덕션 서버 대상 Lighthouse 단계 연결 | S3 |
| `scripts/contract/check-deps.ts` | 승인된 `@lhci/cli` 의존성 근거 등록 | S2 |
| `scripts/contract/check-deps.test.ts` | 승인·미승인 품질도구 판정 회귀 테스트 | S3 |

### S1 경계 결정

- 기존 `feed.repo.ts`의 서명 커서 구현은 유지하되, API가 요구하는 시리즈·크리에이터·
  자산 메타데이터를 한 번에 조회하는 내부 feed row로 확장한다. 외부 응답에는 내부
  `creatorId`를 노출하지 않는다.
- 공용 첫 페이지 캐시는 개인 정보가 없는 feed row만 저장한다. 차단 creator 제거와
  `isLiked` 일괄 조회는 캐시 적중 뒤 사용자별로 적용하며, 필터로 빈 페이지가 되면
  다음 커서를 최대 3회 따라가 보충한다.
- `popular` 첫 페이지 TTL은 60초, `latest`는 30초, 태그 첫 페이지는 60초다.
  `following`과 두 번째 이후 페이지는 캐시하지 않는다. Redis 오류는 DB 직행으로
  우회하며 응답 자체는 실패시키지 않는다.
- 검색 응답은 `type`에 따라 `series` 카드, `episode` feed item, `user` 공개 프로필의
  판별 가능한 union으로 고정한다. 인기 태그는 `{ items: [{ name, useCount }] }`, 태그
  피드는 일반 `{ items, nextCursor }` 형태로 고정해 OpenAPI와 zod가 같은 계약을 쓴다.
- `%`, `_`, `\\`는 LIKE 패턴에서 escape하고 모든 값은 파라미터 바인딩한다. 검색은
  공개·미삭제 리소스만 반환하고 차단 필터는 피드와 동일하게 서버에서 적용한다.
- `FEED_RANK` 잡은 `{ scope: 'recent' | 'expired' }`만 받는다. `recent`는 10분마다 최근
  30일을 1,000개씩 순수 `rankScore()`로 갱신하고, `expired`는 하루 한 번 30일 초과
  점수를 0으로 만든다. SQL에는 랭킹 산식을 중복하지 않는다.
- 홈은 인기, `/following`은 팔로잉, `/tags/[tag]`는 태그 첫 페이지를 SSR한다.
  `/search`는 URL query를 기준으로 클라이언트 요청하며 모든 데이터 화면은 로딩·
  비어있음·오류·정상 상태를 갖는다.
- Lighthouse CI 도구는 `DEP-004` 사용자 승인에 따라 개발·CI 전용 의존성으로만
  설치한다. npm 공식 레지스트리의 `0.15.1`로 고정하고 런타임 번들에는 포함하지 않는다.

## 4. S2 Skeleton

```ts
// packages/core/src/rules/rank-score.ts — 순수 함수
export interface RankInput {
  viewCount: number
  likeCount: number
  commentCount: number
  publishedAt: Date
  now: Date
}
export function rankScore(input: RankInput): number {
  throw new NotImplementedError('T09:rankScore')
}
```

### 랭킹 산식 (확정 — 임의 변경 금지)

```
engagement = viewCount * 1.0 + likeCount * 8.0 + commentCount * 15.0

ageHours   = (now - publishedAt) / 3600_000
gravity    = 1.5

score      = engagement / pow(ageHours + 2, gravity)
```

| 결정 | 이유 |
|---|---|
| 좋아요 8배, 댓글 15배 | 조회는 수동적, 댓글은 능동적 참여. 참여 신호를 더 신뢰 |
| `+2` 오프셋 | 갓 올라온 글의 점수가 무한대로 튀는 것 방지 |
| `gravity 1.5` | Hacker News 계열 값. 약 24시간 반감기 |
| 배치 계산 | 요청마다 계산하면 인덱스를 쓸 수 없다 (정렬 불가) |

**변경하려면** `_ISSUES.md` 에 [OBS-###] 로 근거(실측 분포)를 남기고 승인받는다.

```ts
// apps/web/src/components/feed/FeedList.tsx
export interface FeedListProps {
  type: 'popular' | 'latest' | 'following'
  initialItems: FeedItem[]          // SSR 로 받은 첫 페이지
  initialCursor: string | null
}
```

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T09:rankScore` | 위 산식 |
| 2 | `T09:paginationSchema` | limit 1~50, cursor 문자열 |
| 3 | `T09:feedRepoQueries` | T02 골격 채우기 — 3종 쿼리 (튜플 커서) |
| 4 | `T09:searchRepo` | Postgres 전문검색 (아래) |
| 5 | `T09:getFeed` | 캐시 + 차단 필터 + 응답 조립 |
| 6 | `T09:search` | 검색 유스케이스 |
| 7 | `T09:trendingTags` | `useCount` 상위 20 (5분 캐시) |
| 8 | `T09:rankRecomputeJob` | 배치 (아래) |
| 9 | `T09:useInfiniteFeed` | react-query `useInfiniteQuery` |
| 10 | `T09:FeedList` | 무한스크롤 + 상태 4종 |
| 11 | `T09:EpisodeCard` | 카드 (종횡비 고정 → CLS 0) |
| 12 | `T09:feedPages` | 4개 화면 |

### 검색 구현 (Postgres 만으로)

**Elasticsearch 를 도입하지 않는다.** 초기 규모에서는 과잉이다.

```sql
-- 한국어는 형태소 분석이 없어 to_tsvector('simple') 로는 부정확하다.
-- 대신 trigram 유사도 + ILIKE 조합을 쓴다.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_episode_title_trgm ON episode USING gin (title gin_trgm_ops);
CREATE INDEX idx_series_title_trgm  ON series  USING gin (title gin_trgm_ops);
CREATE INDEX idx_user_search_trgm   ON "user"  USING gin (handle gin_trgm_ops, display_name gin_trgm_ops);
```

```
검색 쿼리:
  WHERE (title ILIKE '%' || $q || '%' OR similarity(title, $q) > 0.2)
    AND status='PUBLISHED' AND deleted_at IS NULL
  ORDER BY similarity(title, $q) DESC, rank_score DESC, id DESC
  LIMIT $limit + 1

제약:
- 검색어 최소 2자 (1자 검색은 전체 스캔에 가까움 → 거부)
- 검색어 최대 50자
- 검색어의 % 와 _ 는 이스케이프 (LIKE 와일드카드 주입 방지)
```

**한계 명시**: trigram 검색은 "드라마" 로 "AI드라마" 를 찾지만
"연애" 로 "로맨스" 를 찾지는 못한다. 의미 검색은 Phase 3.
이 한계를 지금 문서에 적어두어 나중에 "검색이 이상하다" 는 논의를 줄인다.

### 랭킹 배치 (`rank-recompute.ts`)

```
스케줄: 10분마다 (scheduler, 리더 락)

대상: status='PUBLISHED' AND published_at > now() - interval '30 days'
      (30일 초과 에피소드는 점수가 사실상 0 이므로 재계산 불필요)

방식: 배치 UPDATE. 1000개씩 나눠서.
  UPDATE episode SET rank_score = (계산식)
  WHERE id = ANY($ids)

★ SQL 안에 산식을 중복 작성하지 않는다.
  → 행을 읽어서 rankScore() 순수 함수로 계산하고 UPDATE 한다.
    (산식이 두 곳에 있으면 반드시 어긋난다. 성능보다 일관성이 중요하다.)

30일 초과 에피소드는 하루 1회 별도 잡으로 0 에 수렴시킨다.
```

### 피드 캐시

| 대상 | 캐시 | TTL |
|---|---|---|
| 인기 피드 **첫 페이지** (cursor 없음) | Redis | 60초 |
| 최신 피드 첫 페이지 | Redis | 30초 |
| 팔로잉 피드 | **캐시 안 함** | — (사용자별이라 히트율 0) |
| 태그 피드 첫 페이지 | Redis | 60초 |
| 인기 태그 | Redis | 5분 |
| 2페이지 이후 | **캐시 안 함** | — (히트율 낮음) |

```
캐시 키: feed:{type}:{limit}
차단 필터 때문에 로그인 사용자는 캐시를 그대로 쓸 수 없다.
→ 캐시된 결과에서 차단된 크리에이터의 항목만 필터링해서 반환한다.
  (캐시는 공용, 필터는 개인별)
→ 필터로 줄어든 개수는 보충하지 않는다 (페이지당 개수가 약간 달라지는 것 수용)
```

### `isLiked` 처리 (N+1 방지)

```
피드 20개에 대해 각각 Like 조회 → 20번 쿼리 (금지)

대신:
  SELECT episode_id FROM "like"
  WHERE user_id = $me AND episode_id = ANY($episodeIds)
→ 1번 쿼리로 Set 을 만들고 매핑한다.
```

## 6. 예외처리

| 상황 | 에러코드 | 처리 |
|---|---|---|
| `limit` 범위 초과 | `E_VALIDATION` | 422 (조용히 clamp 하지 않는다 — 클라이언트 버그를 드러냄) |
| 커서 복호화/서명 실패 | `E_FEED_INVALID_CURSOR` | 400 + "처음부터 보기". **로그 남김** |
| 팔로잉 피드 미로그인 | `E_AUTH_REQUIRED` | 401 → 로그인 유도 |
| 팔로잉 0명 | — | 빈 목록 + 추천 크리에이터 (에러 아님) |
| 검색어 1자 | `E_VALIDATION` | 422 + "2자 이상 입력" |
| 검색어 50자 초과 | `E_VALIDATION` | 422 |
| 검색 결과 0건 | — | 빈 상태 + 인기 태그 제시 |
| 존재하지 않는 태그 | — | 빈 목록 (404 아님 — 태그는 자유 문자열) |
| Redis 장애 (캐시) | — | **캐시 우회하고 DB 직접 조회.** 서비스 계속 |
| DB 타임아웃 | `E_DB_UNAVAILABLE` | 503 + 재시도 버튼 |
| 랭킹 배치 실패 | — | 이전 점수 유지 (피드는 계속 동작). 알럿 |
| 무한스크롤 중 실패 | — | 이미 로드된 항목 유지 + 하단에 재시도 버튼. **전체를 오류로 바꾸지 않는다** |
| 차단 필터로 페이지가 비어짐 | — | 다음 페이지를 자동 요청 (최대 3회) |

**무한스크롤 실패 처리가 중요하다.** 스크롤 중 한 번 실패했다고 이미 본 목록이
사라지면 사용자 경험이 크게 나빠진다.

## 7. 테스트

| 케이스 | 방식 |
|---|---|
| `rankScore` — 참여도 동일, 시간 차 → 최신이 높음 | 단위 |
| `rankScore` — 시간 동일, 참여도 차 → 높은 쪽이 높음 | 단위 |
| `rankScore` — 방금 게시(ageHours=0) 에서 발산하지 않음 | 단위 |
| `rankScore` — 30일 경과 시 0 에 근접 | 단위 |
| `rankScore` — 단조성 (각 입력 증가 시 점수 증가) | 단위 (속성 테스트) |
| 3종 피드 쿼리 정상 | 통합 |
| **동일 `publishedAt` 20개에서 커서 중복/누락 없음** | 통합 ★ |
| 페이지 사이에 새 에피소드 삽입 → 중복 없음 | 통합 ★ |
| 차단한 크리에이터의 에피소드 미노출 | 통합 |
| 비공개/삭제 에피소드 미노출 | 통합 |
| `isLiked` 가 1번 쿼리로 해결 (쿼리 카운트 단정) | 통합 ★ |
| 팔로잉 피드 — 팔로우한 사람 것만 | 통합 |
| 검색 — 부분 일치 | 통합 |
| 검색 — `%`/`_` 이스케이프 (주입 시도) | 통합 ★ |
| 검색 — 1자 거부 | 통합 |
| 인기 태그 상위 20 | 통합 |
| 랭킹 배치 실행 후 `rank_score` 갱신 | 통합 |
| 랭킹 배치가 SQL 과 순수함수에서 동일 결과 | 통합 (산식 중복 방지 검증) |
| Redis 다운 시 피드 정상 응답 | 통합 |
| `FeedList` 상태 4종 렌더 | 컴포넌트 |
| 무한스크롤 실패 시 기존 항목 유지 | 컴포넌트 |
| 피드 → 재생 → 뒤로 → 스크롤 위치 유지 | E2E |
| 팔로우 후 팔로잉 피드에 신작 노출 | E2E (US-05) |
| 피드 LCP ≤ 2.5s | Lighthouse CI |
| CLS ≤ 0.05 (카드 종횡비 고정) | Lighthouse CI |

## 8. 완료 조건 (DoD)

- [ ] `pnpm gate` 통과
- [ ] 잔존 `NotImplementedError('T09:...')` = 0
- [ ] 커서 중복/누락 테스트 통과 (동일 정렬키 20개)
- [ ] `isLiked` N+1 없음 (쿼리 카운트 테스트)
- [ ] US-05 E2E 통과
- [ ] Lighthouse CI: LCP ≤ 2.5s, CLS ≤ 0.05
- [ ] 피드 API p95 ≤ 300ms (에피소드 1000개 시드 상태에서 측정)
- [ ] `EXPLAIN ANALYZE` 로 3종 피드 쿼리가 **인덱스 스캔**임을 확인 (Seq Scan 이면 실패)
- [ ] 랭킹 산식이 코드에 한 번만 존재 (SQL 중복 없음)
- [ ] Redis 를 끈 상태에서 피드가 정상 동작
