# T16 — 역할 사다리 · 회원 등급 체계

> 근거: `_ISSUES.md` `[ISS-020]` (2026-08-27 소유자 승인)
> 선행: T03(인증) · T12(심사) · T15(메타데이터)
> 목표: 권한을 7단계 사다리로 세우고, 활동 기반 회원 등급을 혜택 축으로 분리한다.

---

## 1. 무엇이 문제였는가

| 문제 | 증상 |
|---|---|
| `GUEST` 가 1급 시민이 아니었다 | `can()` 이 로그인 사용자만 받아, 비로그인 판정이 라우트마다 `session === null` 로 흩어졌다. `07_AUTH_SECURITY` §2 철칙("판정은 `can()` 밖에 없다")이 **이미 깨져 있었다** |
| 이메일 인증 상태가 역할이 아니었다 | 가입 직후와 인증 완료가 같은 `VIEWER`. `can()` 이 동작마다 `emailVerified` 를 따로 확인하고, 빠뜨리면 조용히 통과 |
| 크리에이터 우대 단계가 없었다 | 정산·우대 한도 대상을 구분할 축이 없어 서버 용량을 사용자별로 배분 불가 |
| 활동 등급이 없었다 | 시청·업로드·팔로워 실적이 아무 데도 반영되지 않음 |
| 역할 변경 이력이 없었다 | 누가 누구를 언제 어떤 역할로 바꿨는지 남지 않음 |
| 직접 역할 비교 2건 | `MainNav.tsx:15`, `delete-comment.ts:30` 이 `can()` 우회 |

---

## 2. 역할 사다리

| 순위 | 역할 | 저장 | 뜻 |
|---|---|---|---|
| 0 | `GUEST` | **안 함** | 비로그인 |
| 1 | `VIEWER` | ○ | 가입 완료, 이메일 미인증 |
| 2 | `MEMBER` | ○ (유도) | 이메일 인증 완료 |
| 3 | `CREATOR` | ○ | 업로드·시리즈 운영 |
| 4 | `PARTNER` | ○ | CREATOR + 우대 한도, 정산 대상 |
| 5 | `MODERATOR` | ○ | 심사·숨김·계정 제한 |
| 6 | `ADMIN` | ○ | 전관 + 역할 부여 |

전체 매트릭스는 `00_SPEC/07_AUTH_SECURITY.md` §2 가 소유한다.

### 결정 3개

**`GUEST` 를 DB 열거형에 넣지 않는다.** 게스트는 행이 없다. 저장 가능한 값으로
만들면 "GUEST 로 저장된 계정" 이라는 불가능한 상태가 타입상 표현 가능해지고,
그런 행이 하나 생기는 순간 그 계정은 로그인은 되면서 아무 동작도 못 하는 유령이
된다. `ActorRole = UserRole | 'GUEST'` 를 판정 계층에만 둔다.

**`MEMBER` 를 저장하지 않고 유도한다.** `emailVerified` 가 이미 진실의 단일
출처다. 역할 컬럼에 또 적으면 이메일 변경·인증 철회 시 두 값이 갈라질 수 있고,
갈라진 쪽이 판정에 쓰이면 인증 게이트가 무력화된다. 그래서 `MEMBER` 는
`GRANTABLE_ROLES` 에 없다 — ADMIN 도 직접 지정하지 못한다.

반대 방향(강등)은 유도하지 않는다. `CREATOR` 가 이메일을 미인증으로 되돌려도
역할은 `CREATOR` 로 남고, 업로드는 `can()` 이 `emailVerified` 로 따로 막는다.
역할을 흔들면 그 사람의 기존 작품 **소유 판정**까지 흔들린다.

**사다리 비교로 권한을 판정하지 않는다.** `MODERATOR` 는 `CREATOR` 보다 위지만
업로드는 못 한다 — 운영 권한과 제작 권한은 다른 축이다. `hasAtLeast()` 는
"이 역할 이상에게만 보이는 화면" 같은 표시 게이트 전용이며,
`roles.test.ts` 가 `hasAtLeast('MODERATOR','CREATOR') === true` 이면서
`isAuthorRole('MODERATOR') === false` 임을 고정한다.

---

## 3. 회원 등급 (혜택)

`MemberTier`: `BRONZE` `SILVER` `GOLD` `PLATINUM` `DIAMOND`

### 점수 산정 (`computeTierPoints`)

| 항목 | 가중치 | 상한 | 최대 기여 |
|---|---|---|---|
| 팔로워 | 1/명 | 50,000 | 50,000 |
| 공개 회차 | 40/편 | 1,000 | 40,000 |
| 누적 조회 | 1/100회 | 60,000 | 60,000 |
| 계정 연령 | 2/일 | 3,650 | 7,300 |
| 시청 시간 | 5/시간 | 10,000 | 50,000 |
| 남긴 댓글 | 1/개 | 10,000 | 10,000 |
| 누른 좋아요 | 1/개 | 10,000 | 10,000 |

하한선: `SILVER` 500 · `GOLD` 5,000 · `PLATINUM` 25,000 · `DIAMOND` 100,000

**핵심 불변식**: 어떤 한 항목의 최대 기여점도 `DIAMOND` 하한보다 작다. 즉
**DIAMOND 는 한 축을 극단으로 밀어서 도달할 수 없고 최소 두 축을 요구한다.**
최초 설계는 조회수 상한이 100,000이어서 조회수 하나로 DIAMOND 에 도달했다 —
그러면 등급이 "조회수의 다른 이름" 이 된다. 테스트가 이 결함을 잡았고,
`TIER_CATEGORY_MAX` 표와 `member-tier.test.ts` 가 재발을 막는다.

**하락을 허용한다.** 등급을 내리지 않으면 한 번 올라간 계정이 활동을 멈춰도
혜택을 계속 쓴다. 혜택은 서버 용량의 배분이므로 유령 등급이 쌓이면 실제로
활동하는 계정의 몫이 줄어든다. 등급은 상태가 아니라 현재 실적의 표현이다.

**음수 입력은 0으로 본다.** 카운터 보정 배치가 일시적으로 음수를 만들 수 있고,
그것이 점수를 깎아 등급을 떨어뜨리면 원인 추적이 불가능해진다.

### 혜택 (`resolveEntitlements`)

배분 표는 `00_SPEC/11_CAPACITY_TIERS.md` §3 "사용자 축 배분" 이 소유한다.
규칙 4개:

1. 등급은 용량을 **늘리지 않고 배분한다.** 어떤 등급도 티어 표 값을 넘지 못한다
2. 파일 1개 최대 용량은 등급으로 나누지 않는다 (기술적 한계이지 혜택이 아니다)
3. 제작 권한 없는 역할은 배분이 **0** — `canUpload: false` 와 한도 0을 함께
   돌려준다. 둘을 구분하지 않으면 권한 검사를 빠뜨린 경로가 한도만 보고 통과한다
4. `PARTNER` 는 하한을 보장받고 `ADMIN` 은 배분 대상이 아니다

정산 자격은 `PARTNER` **이면서** `GOLD` 이상. 계약(역할)과 실적(등급)이 둘 다
있어야 한다. `ADMIN` 은 운영 계정이므로 정산 대상이 아니다.

---

## 4. 만든 것

| 파일 | 책임 |
|---|---|
| `packages/core/src/rules/roles.ts` | `ActorRole` · `ROLE_RANK` · `ROLE_LADDER` · `resolveActorRole()` · 역할 분류 헬퍼 · `GRANTABLE_ROLES` |
| `packages/core/src/rules/member-tier.ts` | `TIER_WEIGHTS` · `TIER_CATEGORY_MAX` · `TIER_THRESHOLDS` · `computeTierPoints()` · `evaluateTier()` |
| `packages/core/src/rules/entitlements.ts` | `TIER_ALLOWANCE` · `resolveEntitlements()` — 한도 계산의 **유일 지점** |
| `packages/core/src/rules/permission.ts` | `can()` 재작성 (22동작) · `guestActor()` · `actorFromAccount()` |
| `apps/web/src/auth/actor.ts` | `actorFromSession()` — 웹 계층의 유일 통로 |
| `prisma/schema.prisma` | `UserRole` 6값 · `MemberTier` · `User.tier/tierPoints/tierEvaluatedAt/roleGrantedAt/roleGrantedBy` · `RoleGrant` |

회수한 위반
- `MainNav.tsx` → `can(actorFromSession(session), 'series.create')`
- `delete-comment.ts` → `can(..., 'comment.delete', { ownerId: comment.userId })`
- `episode-state.ts` → `isModeratorRole()` 헬퍼

---

## 5. 마이그레이션

`prisma/migrations/20260827010000_t16_role_tiers/`

- `ALTER TYPE "UserRole" ADD VALUE 'MEMBER' / 'PARTNER'` — PostgreSQL 16 이므로
  트랜잭션 안에서 가능. 같은 트랜잭션에서 새 값을 **사용**하지 않는다
- 기존 행의 `role` 은 그대로. `MEMBER` 는 유도, `PARTNER` 는 명시 부여만
- 등급 백필: 저장된 카운터(팔로워·회차·조회수·계정연령)만으로 보수적 산정.
  가중치가 `TIER_WEIGHTS` 와 **같아야 한다** — 한쪽만 바꾸면 배치가 처음 돌기
  전까지 등급이 어긋난다
- `DROP` · `DELETE` **0건**

---

## 6. 게이트 결과

| 게이트 | 결과 |
|---|---|
| `lint` · `typecheck` · `depcruise` · `format:check` | 통과 |
| `permission.test.ts` | 323개 통과 (7역할 × 22동작 × 2소유 전조합) |
| `roles.test.ts` · `member-tier.test.ts` | 68개 통과 |
| `contract:*` (prisma 제외 8종) | 통과 |
| `contract:prisma` | `prisma validate` 직접 통과. 테스트 스크립트는 `pnpm` 미설치로 실행 불가 |

---

## 7. 등급 노출 (UI)

등급이 저장만 되고 보이지 않으면 혜택 체계가 사용자에게 존재하지 않는다.
배지를 붙인 자리와 그 규칙:

| 화면 | 자리 | 모양 |
|---|---|---|
| 우상단 프로필 트리거 | 이름 옆 | 점 (폭이 좁다) |
| 우상단 계정 메뉴 (펼침) | 이메일 아래 | 라벨 배지 + 인증 마크 |
| 작품 카드 (`EpisodeCard`) | 크리에이터 이름 옆 | 점 |
| 재생 화면 작가 블록 | 이름 옆 | 라벨 배지 |
| 재생 화면 추천 카드 | 이름 옆 | 점 |
| 작가 디렉터리 카드 | 제목 **밖** | 라벨 배지 |
| 프로필 헤더 | `@handle · FILMMAKER` 줄 | 라벨 배지 + 인증 마크 |
| 댓글 작성자 | 이름 옆 | 라벨 배지 |
| 대댓글 작성자 | 이름 옆 | 점 (들여쓰기로 좁다) |

### 결정 5개

**등급 색은 전용 토큰이다.** `warning`(호박) · `success`(초록) 를 재사용하면
상태 색을 조정할 때 골드·다이아 배지가 조용히 따라 변한다. 등급은 상태가
아니다. `tier.{silver,gold,platinum,diamond}` × `{base, subtle}` 를 두 테마에
추가했고, `tier-badge.test.tsx` 가 **상태 색과 값이 같지 않은지**까지 검사한다.

**대비를 먼저 계산하고 색을 골랐다.** subtle 표면은 `fg.primary` 와 4.5:1,
base(테두리·점)는 모든 표면과 3:1 이상이다. 두 테마 × 4등급 전수 검사가
테스트에 있다. (10_NFR §10)

**색만으로 등급을 구분하지 않는다.** `compact` 모드(점)에서도 `aria-label` ·
`title` 에 "골드 등급" 이 남는다. 색각 이상 사용자에게 색은 정보가 아니다.

**배지는 제목 안에 넣지 않는다.** `<h3>` 안에 넣으면 제목의 접근성 이름이
"두 번째 작가골드" 가 된다 — 스크린리더에게 제목이 사람 이름이 아니게 된다.
그래서 `UserBadges`(배지만)와 `UserTierLine`(이름+배지)을 나눴고, 제목 옆에는
`UserBadges` 를 둔다. 이 결함은 `CreatorDirectory.test.tsx` 가 잡았다.

**BRONZE 는 배지가 없다.** 전원이 배지를 달면 배지가 신호가 아니다.
`TierBadge` 가 `null` 을 렌더하고, `UserBadges` 는 인증도 없으면 빈 래퍼조차
만들지 않는다 — 빈 `<span>` 이 `gap` 을 벌려 이름 뒤에 공백이 남기 때문이다.

### 데이터 배선

배지를 그리려면 등급이 응답에 실려야 한다. **`PublicUserSummary` 한 타입에**
`tier` · `isVerified` 를 넣고 피드·검색·댓글·크레딧이 전부 그것을 쓰게 했다.
예전에는 `feed.schema.ts` 의 `CreatorSchema` 와 `comment.schema.ts` 의
`CommentUserSchema` 가 같은 필드를 따로 선언해서, 한쪽만 고치면 "댓글에는
배지가 뜨는데 피드에는 안 뜨는" 상태가 됐다.

- `packages/core/src/schemas/user.schema.ts` — `PublicUserSchema` 신설, 위 둘이 참조
- `feed.repo` · `search.repo` raw SQL 에 `creator.tier` · `creator.verified_at`
- `social.repo` 에 `COMMENT_AUTHOR_SELECT` 상수 — 본문과 대댓글이 같은 목록을 쓴다
- `SessionUser` 에 `tier` · `isVerified` (우상단 프로필용, 권한 판정에는 안 쓴다)
- 피드 Redis 캐시의 `creatorTier` 는 **선택 필드**다. 배포 직후 TTL 동안 등급
  없이 직렬화된 옛 항목이 남으므로, 필수로 두면 그 시간만큼 피드가 깨진다.
  폴백은 `BRONZE`(배지 없음)라 없는 배지를 그리지 않는다.

### 픽스처 공용화

`User`·`Series`·`Episode`·`SessionUser` 가 40필드를 넘어, 필드 하나 추가에
무관한 테스트 20~40곳이 동시에 깨졌다. 두 곳으로 모았다.

- `packages/core/src/test-support/entities.ts` — 순수 엔티티. `apps/worker` 도
  써야 하고 `no-app-to-app` 이 앱 간 import 를 막으므로 패키지에 둔다.
  제품 배럴이 아니라 `@aidream/core/test-support` 서브패스로 내보내, 제품
  코드가 픽스처를 import 하는 경로를 없앤다.
- `apps/web/src/test-support/session-fixtures.ts` — `SessionUser`·`RouteSession`

---

## 8. 남은 일

- [ ] `user.setRole` API 를 `RoleGrant` 기록과 함께 트랜잭션으로 묶기
- [ ] `tier.reevaluate` 배치 잡 (`packages/queue`) — 활동 집계 → `evaluateTier()`
- [ ] 업로드 경로를 `resolveEntitlements()` 로 전환 (현재 `CAPACITY_TIERS` 직접 사용)
- [ ] 관리자 UI 역할 선택기를 `GRANTABLE_ROLES` 로 렌더
- [ ] 프로필에 등급 배지 표시 (`UserProfile.badge` 는 이미 내려온다)
- [ ] `PARTNER` 승격 심사 흐름 — `CreatorApplication` 과 연결할지 결정
- [ ] `05_API_CONTRACT.md` 에 `role` · `tier` · `badge` 응답 반영 후 openapi 재생성
