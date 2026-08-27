# T15 — 회원 정보 · 콘텐츠 메타데이터 확장

> 근거: `_ISSUES.md` `[ISS-019]` (2026-08-27 소유자 승인)
> 선행: T02(DB) · T08(시리즈/에피소드) · T09(피드/검색) · T14(디자인)
> 목표: YouTube급 유통에 필요한 회원 정보와 콘텐츠 메타데이터를 갖추고,
> 공유·색인 표면을 서버가 실제로 내보내게 한다.

---

## 1. 무엇이 없었는가

`prisma/schema.prisma` 496행을 전량 검토한 결과, **이미 스펙에 존재하는 기능조차
근거 데이터가 없었다.**

| 증상 | 없던 것 |
|---|---|
| `AgeRating.A19` 게이트가 자기신고에만 의존 | `User.birthDate` |
| `UserStatus.SUSPENDED` 인데 사유가 안 남음 | `User.suspendReason` · `suspendedUntil` |
| PIPA 열람·철회 요청에 응답 불가 | `UserConsent` |
| AI 고지를 조회·필터할 수 없음 | `Episode.aiModels` · `aiTools` · `aiHumanRole` |
| hreflang·canonical 을 만들 원천이 없음 | `locale` · `canonicalPath` · `*Translation` |
| 접근성·다국어 유통 불가 | `SubtitleTrack` |
| 장르 탐색축이 자유 태그뿐 | `Category` |
| 링크 공유 미공개 상태가 없음 | `Visibility.UNLISTED` |
| 시청자가 작품을 담을 수 없음 | `Playlist` · `PlaylistItem` |
| 검색이 LIKE 스캔 | `searchVector` (tsvector) |
| `watch`·`series` 링크가 회색 카드로 공유됨 | `generateMetadata` 부재 |
| 검색엔진에 사이트 구조를 못 알림 | `sitemap.ts` · `robots.ts` · JSON-LD |

---

## 2. 확장 내용

### 블록 A — 회원 정보 (`User` + 5개 신규 모델)

`User` 에 34개 필드 추가. 묶음별 근거:

| 묶음 | 필드 | 왜 |
|---|---|---|
| 채널 프로필 | `bannerKey` `channelDescription(5000)` `channelKeywords[]` `trailerEpisodeId` `profileVisibility` `hideFollowerCount` `verifiedAt` | `bio`(500자)로는 채널 소개가 안 된다. 구독자 수 숨김은 YouTube 등가 기능 |
| 지역·언어 | `country(ISO 3166-1)` `locale(BCP 47)` `timezone` | `12_GLOBAL_EXPANSION` §2 "Language is not market" |
| 본인확인 | `birthDate` `phone` `phoneVerifiedAt` | **A19 게이트의 유일한 법적 근거** |
| 업로드 기본값 | `defaultAgeRating` `defaultLanguage` `defaultLicense` | 매 업로드마다 다시 고르지 않게 |
| 집계 | `followingCount` `episodeCount` `totalViews` | 프로필 통계가 매 요청 COUNT 였다 |
| 운영·유입 | `lastLoginAt` `lastSeenAt` `loginCount` `signupIpHash` `signupUserAgent` `signupReferrer` `utm*` | IP 는 **원본 대신 해시**로 저장 (PIPA) |
| 제재 | `suspendedUntil` `suspendReason` | SUSPENDED 상태의 근거 |

신규 모델
- `UserLink` — 채널 외부 링크
- `UserConsent` — 약관·개인정보·마케팅 동의 이력 (`kind` × `version` 유니크)
- `NotificationPreference` — 알림 채널별 수신 설정
- `AuthAuditLog` — 로그인·비밀번호 변경 감사. IP 는 해시만
- `UserDeletionRequest` — 탈퇴 유예. `scheduledPurgeAt` 이후 물리 파기

### 블록 B — 콘텐츠 메타데이터 (`Series`/`Episode` + 8개 신규 모델)

`Episode` 에 25개, `Series` 에 18개 필드 추가.

| 묶음 | 필드 |
|---|---|
| 가시성·재생 | `visibility` `durationSec` `language` `categoryId` `keywords[]` `allowEmbed` `allowDownload` `recordedAt` |
| 공유 메타태그 | `metaTitle(70)` `metaDescription(160)` `ogImageKey` `canonicalPath` |
| 정책·권리 | `madeForKids` `license` `contentWarnings[]` `regionsAllowed[]` `regionsBlocked[]` |
| AI 고지 | `aiModels[]` `aiTools[]` `aiHumanRole` `aiGeneratedPct` |
| 분석 | `shareCount` `impressionCount` `avgWatchSec` |
| 검색 | `searchVector` (tsvector, 트리거 유지) |

신규 모델
- `Category` — 장르. 운영이 소유하는 고정 축 (15개 시드)
- `Chapter` — 챕터/타임스탬프. JSON-LD `Clip` 의 원천
- `Credit` — 감독·작가·성우·음악. 시리즈 또는 회차 단위
- `SubtitleTrack` — 자막·캡션
- `EpisodeTranslation` · `SeriesTranslation` — hreflang 원천
- `Playlist` · `PlaylistItem` — 시청자 재생목록

### 블록 C — 서버 메타태그 표면

| 파일 | 책임 |
|---|---|
| `apps/web/src/lib/site-url.ts` | `APP_URL` 정규화의 **유일 지점**. canonical·hreflang·sitemap·OG 가 같은 출처를 쓰게 한다 |
| `apps/web/src/lib/seo/json-ld.ts` | `VideoObject` `BreadcrumbList` `ProfilePage` `ItemList` 빌더 + ISO 8601 duration |
| `apps/web/src/lib/seo/episode-metadata.ts` | 회차 `Metadata` + JSON-LD 조립 |
| `apps/web/src/lib/seo/series-metadata.ts` | 시리즈 `Metadata` + `TVSeries` JSON-LD |
| `apps/web/src/components/seo/JsonLd.tsx` | `<script type="application/ld+json">`. `<` 를 이스케이프 |
| `apps/web/app/sitemap.ts` | 정적 경로 + 회차·시리즈·크리에이터·태그. 1시간 캐시 |
| `apps/web/app/robots.ts` | `/api/` `/studio/` `/admin/` `/search` `/embed/` `/verify` `/password/` 차단 |
| `packages/db/src/repositories/metadata.repo.ts` | `findEpisodeMetaView()` 단일 조회 + sitemap 목록 |

`generateMetadata` 추가: `watch/[episodeId]` `series/[seriesId]` `tags/[tag]`
`u/[handle]`(실데이터로 교체). 정적 메타데이터: `browse` `works` `creators`
`search` `following`.

---

## 3. 결정과 근거

**`UNLISTED` 는 sitemap 에 넣지 않는다.** 링크를 아는 사람만 보는 상태인데
sitemap 에 넣으면 그 전제가 깨진다. 지역 차단(`regionsBlocked`)이 걸린 작품은
포함한다 — 차단은 요청 시점에 판단할 일이다.

**색인 정책은 `PUBLISHED` + `PUBLIC` 만.** 예약·초안·숨김·비공개 링크가 검색에
한 번 새면 되돌릴 수 없다. `A19` 는 색인하되 `rating: adult` 메타를 붙인다 —
성인 등급을 숨기는 것이 아니라 필터가 걸리게 하는 것이 옳다.

**메타데이터 실패가 페이지 실패가 되지 않는다.** CDN·DB 조회가 실패하면
`try/catch` 로 삼키고 최소 메타로 떨어진다. `sitemap.ts` 는 DB 가 죽어도 정적
경로를 내보낸다 — sitemap 500 은 크롤러가 재시도를 줄이는 신호로 읽는다.

**한국어 검색은 tsvector 만으로 안 된다.** PostgreSQL 기본 사전에 한국어가 없어
`simple` 설정은 형태소를 자르지 못한다. 그래서 tsvector(GIN) + `pg_trgm`
트라이그램(부분 일치) 두 축을 함께 만든다.

**`JsonLd` 는 `<` 를 유니코드 이스케이프한다.** 크리에이터가 제목에 넣은
`</script>` 가 그대로 태그를 닫으면 이후 마크업이 스크립트 밖으로 새어나온다.
`JSON.stringify` 는 이것을 막아주지 않는다.

**메타 뷰는 키를 넘기고 URL 은 웹 계층이 만든다.** `EpisodeMetaView.thumbKey` 는
이름 그대로 키다. URL 조립은 `packages/storage/src/cdn.ts` 단일 진입점의 몫이며,
`06_MEDIA_PIPELINE` §5 의 `CDN_SINGLE_POINT` 린트가 이를 강제한다.

**테스트 픽스처를 공용화했다.** `User`/`Series`/`Episode` 가 40필드를 넘어,
테스트가 전체 리터럴을 손으로 적으면 필드 하나 추가에 무관한 테스트 수십 개가
동시에 깨진다. `apps/web/src/test-support/entity-fixtures.ts` 의 기본값은
**DB 기본값과 같아야 한다.**

---

## 4. 마이그레이션

`prisma/migrations/20260827000000_t15_metadata_upgrade/`

- 전 필드 nullable 또는 default → **기존 행 무중단**
- `DROP` · `DELETE` · `TRUNCATE` **0건**
- NOT NULL without default **0건**
- 수동 구간: `pg_trgm` 확장, tsvector 트리거 2개 + 백필, GIN 인덱스 11개,
  `Category` 15행 시드(`ON CONFLICT DO NOTHING`)

---

## 5. 게이트 결과

| 게이트 | 결과 |
|---|---|
| `lint` | 통과 |
| `typecheck` | 통과 |
| `depcruise` | 통과 (위반 0) |
| `format:check` | 통과 |
| `contract:openapi` `errors` `limits` `deps` `capacity` `proxy` `tokens` `observability` | 통과 |
| `contract:prisma` | `prisma validate` 직접 실행으로 통과 확인. `pnpm` 미설치 환경에서는 테스트 스크립트가 실행 불가 |
| `vitest` | 단위·컴포넌트 전부 통과. 통합 테스트는 Postgres 필요 |

---

## 6. 남은 일

- [ ] `05_API_CONTRACT.md` 에 신규 필드 응답 스키마 반영 후 `openapi.json` 재생성
- [ ] 스튜디오 UI: 메타태그·챕터·자막·크레딧 편집 화면
- [ ] `tier.reevaluate` 와 별개로 `Series.totalLikes`·`User.totalViews` 집계 배치
- [x] `UserConsent` 기록 지점을 가입·약관 동의 흐름에 연결
- [ ] `SubtitleTrack` 업로드 경로(WebVTT 검증) — T05 업로드 파이프라인 확장
- [x] `AgeGate` 를 `User.birthDate` 기반으로 전환 (클라이언트 출생연도 입력 제거)
