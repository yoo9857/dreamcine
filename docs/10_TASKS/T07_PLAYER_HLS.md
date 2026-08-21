# T07 — 플레이어: hls.js · 이어보기 · 조회수

## 진행 상태
- [ ] S1 Spec 확인
- [ ] S2 Skeleton
- [ ] S3 구현

---

## 1. 목적

변환된 HLS 를 모든 지원 브라우저에서 재생하고, 이어보기·화질선택·조회수 집계를 붙인다.
이 태스크가 끝나면 **업로드 → 재생** 의 핵심 루프가 완성된다 (M3 마일스톤).

## 2. 참조 스펙

- `../00_SPEC/06_MEDIA_PIPELINE.md` §5 재생
- `../00_SPEC/05_API_CONTRACT.md` §5 (`playback`, `progress`)
- `../00_SPEC/08_UIUX_SPEC.md` §5 플레이어 요구사항, §3 상태
- `../00_SPEC/07_AUTH_SECURITY.md` §4 (비공개 콘텐츠 처리), §6 CSP
- `../00_SPEC/10_NFR.md` §1 (TTFF), §9 브라우저, §10 접근성

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/core/src/rules/age-gate.ts` | 연령등급 접근 판정 (순수) | S2→S3 |
| `apps/web/src/services/episode/get-playback.ts` | 재생정보 발급 유스케이스 | S2→S3 |
| `apps/web/src/services/episode/save-progress.ts` | 이어보기 저장 | S2→S3 |
| `apps/web/src/services/episode/count-view.ts` | 조회수 (중복 방지) | S2→S3 |
| `apps/web/app/api/episodes/[id]/playback/route.ts` | GET | S3 |
| `apps/web/app/api/episodes/[id]/progress/route.ts` | POST | S3 |
| `apps/web/src/components/player/HlsPlayer.tsx` | ★ 재생 엔진 컴포넌트 | S2→S3 |
| `apps/web/src/components/player/PlayerControls.tsx` | 컨트롤 UI (순수 표현) | S2→S3 |
| `apps/web/src/components/player/QualityMenu.tsx` | 화질 선택 | S3 |
| `apps/web/src/components/player/SeekPreview.tsx` | 스프라이트 프리뷰 | S3 |
| `apps/web/src/components/player/NextEpisodeCard.tsx` | 다음화 카드 | S3 |
| `apps/web/src/components/AgeGate.tsx` | 연령 확인 인터스티셜 | S3 |
| `apps/web/src/hooks/use-player.ts` | 플레이어 상태 관리 | S2→S3 |
| `apps/web/src/hooks/use-watch-progress.ts` | 진행률 전송 (스로틀 + beacon) | S2→S3 |
| `apps/web/app/(main)/watch/[episodeId]/page.tsx` | 재생 화면 | S3 |
| `apps/web/e2e/playback.e2e.ts` | US-03, US-04 | S3 |

## 4. S2 Skeleton

```ts
// packages/core/src/rules/age-gate.ts
export interface AgeGateInput {
  rating: AgeRating
  viewer: { isAuthenticated: boolean; birthYear?: number } | null
  currentYear: number
}
export type AgeGateResult =
  | { allowed: true }
  | { allowed: false; reason: 'AUTH_REQUIRED' | 'AGE_RESTRICTED' | 'CONFIRM_REQUIRED' }

export function checkAgeGate(input: AgeGateInput): AgeGateResult {
  throw new NotImplementedError('T07:checkAgeGate')
}
```

```ts
// apps/web/src/components/player/HlsPlayer.tsx
export interface HlsPlayerProps {
  masterUrl: string
  posterUrl?: string
  startAtSec: number
  durationSec: number
  spriteVttUrl?: string
  autoPlay?: boolean
  onProgress: (positionSec: number) => void
  onWatchedSeconds: (total: number) => void   // 조회수 판정용 누적 시청 시간
  onEnded: () => void
  onError: (code: string) => void
}
export function HlsPlayer(props: HlsPlayerProps): JSX.Element {
  throw new NotImplementedError('T07:HlsPlayer')
}
```

```ts
// apps/web/src/hooks/use-player.ts
export interface PlayerState {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error'
  positionSec: number
  bufferedSec: number
  volume: number
  muted: boolean
  playbackRate: number
  levels: Array<{ index: number; height: number; bitrate: number }>
  currentLevel: number       // -1 = 자동
  isFullscreen: boolean
  errorCode: string | null
}
```

## 5. S3 구현 순서

### 서버 측

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T07:checkAgeGate` | 등급별 판정. `A19` 는 인증 + 생년 확인, `A15`/`A12` 는 확인 클릭 |
| 2 | `T07:getPlayback` | 아래 순서 |
| 3 | `T07:saveProgress` | upsert. 15초 미만 간격 호출은 429 |
| 4 | `T07:countView` | Redis 중복 방지 키 + 버퍼 증분 |

#### `getPlayback` 순서

```
1. 에피소드 조회 (deletedAt null)          → E_EPISODE_NOT_FOUND
2. status !== 'PUBLISHED'
     소유자/모더레이터면 통과 (미리보기)
     아니면                                 → E_EPISODE_NOT_PUBLISHED (404, 403 아님)
3. 차단 관계 확인                            → E_SOCIAL_BLOCKED
4. checkAgeGate()                          → E_PERM_AGE_RESTRICTED
5. asset.status !== 'READY'                → E_ASSET_NOT_READY
6. WatchProgress 조회 → startAtSec 결정
     조건: 로그인 && position > 0 && duration - position > 30
7. masterUrl(assetId), posterUrl 조립 (packages/storage/cdn)
8. 200 응답
```

**2번에서 403 이 아니라 404 를 쓰는 이유**: 403 은 "존재하지만 못 본다" 를 알려주어
비공개 에피소드의 존재를 노출한다. 404 로 통일한다.

#### `countView` 로직

```
키: view:{episodeId}:{userId ?? ipHash}:{YYYYMMDD}
1. SET key 1 NX EX 86400
2. 결과가 OK (신규) 일 때만:
     INCR viewbuf:{episodeId}          ← Redis 버퍼
     (Postgres 는 counter.flush 잡이 1분마다 반영)
3. 이미 존재하면 아무것도 하지 않음
```

호출 조건: 클라이언트가 **누적 30초 시청** 후 1회만 호출.
(재생 시작만으로 카운트하면 스크롤 자동재생이 조회수를 오염시킨다)

### 클라이언트 측

| # | 마커 | 내용 |
|---|---|---|
| 5 | `T07:usePlayer` | 상태 관리 + 미디어 이벤트 바인딩 |
| 6 | `T07:HlsPlayer` | Safari 분기 + hls.js 초기화 + 에러 복구 |
| 7 | `T07:PlayerControls` | 컨트롤 UI + 키보드 |
| 8 | `T07:QualityMenu` | 레벨 목록 + 자동/수동 |
| 9 | `T07:SeekPreview` | VTT 파싱 + 스프라이트 좌표 |
| 10 | `T07:useWatchProgress` | 스로틀 15초 + `sendBeacon` |
| 11 | `T07:NextEpisodeCard` | 종료 10초 전 노출 |
| 12 | `T07:AgeGate` | 확인 인터스티셜 |

### hls.js 초기화 규칙

```ts
// 1) Safari(네이티브 HLS) 우선 판정
const canNative = video.canPlayType('application/vnd.apple.mpegurl') !== ''
if (canNative) { video.src = masterUrl; return }    // hls.js 사용 안 함

// 2) 그 외: hls.js
if (!Hls.isSupported()) → onError('E_PLAYER_UNSUPPORTED')

const hls = new Hls({
  startLevel: -1,                 // 자동 추정
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  backBufferLength: 30,           // 지나간 버퍼 해제 (메모리)
  enableWorker: true,
  lowLatencyMode: false,          // VOD
  fragLoadingMaxRetry: 4,
  manifestLoadingMaxRetry: 3,
})
```

**`next/dynamic` 으로 동적 import 한다** (`ssr: false`).
hls.js 는 크기가 커서 초기 번들에 넣으면 피드 LCP 목표를 못 지킨다.

### hls.js 에러 복구 (필수)

```
ERROR 이벤트 → data.fatal 여부로 분기

fatal === false            → 무시 (라이브러리가 자체 회복)
fatal && NETWORK_ERROR     → hls.startLoad()  재시도 (최대 3회)
fatal && MEDIA_ERROR       → hls.recoverMediaError()  (최대 2회)
그 외 fatal                → hls.destroy() + onError(코드)

★ 재시도 횟수를 세지 않으면 무한 루프에 빠져 브라우저가 멈춘다.
```

### 진행률 전송

| 시점 | 방법 |
|---|---|
| 재생 중 15초마다 | `fetch` POST |
| 일시정지 | 즉시 `fetch` POST |
| 페이지 이탈 (`visibilitychange` hidden, `pagehide`) | **`navigator.sendBeacon`** |
| 종료 | `completed: true` 로 전송 |

`beforeunload` 에서 `fetch` 는 취소된다. `sendBeacon` 만 신뢰할 수 있다.

### 키보드 (접근성 필수)

| 키 | 동작 |
|---|---|
| `Space` / `K` | 재생/일시정지 |
| `←` / `→` | 10초 뒤/앞 |
| `J` / `L` | 10초 뒤/앞 |
| `↑` / `↓` | 볼륨 ±10% |
| `M` | 음소거 토글 |
| `F` | 전체화면 |
| `0`~`9` | 0~90% 지점 이동 |
| `,` / `.` | 재생속도 |

**입력 필드(댓글)에 포커스가 있을 때는 단축키를 무시한다.**

## 6. 예외처리

| 상황 | 에러코드 | 처리 |
|---|---|---|
| 에피소드 없음 | `E_EPISODE_NOT_FOUND` | 404 페이지 |
| 비공개 (남의 것) | `E_EPISODE_NOT_PUBLISHED` | 404 페이지 (존재 노출 금지) |
| 변환 미완료 | `E_ASSET_NOT_READY` | "변환 중입니다" + 진행률 + 자동 새로고침 |
| 변환 실패 | `E_ASSET_NOT_READY` | 소유자에게만 실패 원인 표시 |
| 연령 미달 | `E_PERM_AGE_RESTRICTED` | 안내 화면 (재생 UI 노출 금지) |
| 연령 확인 필요 | — | `AgeGate` 인터스티셜 → 확인 후 재생 |
| 차단 관계 | `E_SOCIAL_BLOCKED` | 404 페이지 |
| hls.js 미지원 브라우저 | — | "지원하지 않는 브라우저" + 권장 목록 |
| 매니페스트 404 | — | "영상을 불러올 수 없습니다" + 재시도. **error 로그 + 알럿** (자산 불일치 신호) |
| 세그먼트 404 | — | hls.js 가 다음 세그먼트로 진행. 3회 이상이면 오류 표시 |
| 네트워크 불안정 | — | 버퍼링 표시. 자동 재시도 (최대 3회) |
| 미디어 디코딩 오류 | — | `recoverMediaError()` 2회 → 실패 시 오류 표시 |
| 자동재생 차단 | — | 음소거로 재생 + "소리 켜기" 버튼 |
| 진행률 저장 실패 | — | **조용히 무시.** 재생을 방해하지 않는다. debug 로그만 |
| 진행률 429 | — | 조용히 무시 (다음 주기에 전송) |
| 조회수 증가 실패 | — | 조용히 무시. 재생 우선 |
| 전체화면 API 거부 | — | 무시 (일부 iOS) |

**설계 원칙**: 재생 부수 기능(진행률, 조회수)의 실패는 **절대 재생을 막지 않는다.**
사용자가 보러 온 것은 영상이다.

## 7. 테스트

| 케이스 | 방식 |
|---|---|
| `checkAgeGate` — 등급 × 로그인 × 연령 전조합 | 단위 |
| `getPlayback` 정상 → masterUrl 형식 | 통합 |
| 비공개 에피소드 → 404 (403 아님) | 통합 ★ |
| 소유자는 비공개 에피소드 재생정보 획득 | 통합 |
| `READY` 아닌 자산 → `E_ASSET_NOT_READY` | 통합 |
| 이어보기 — `duration - position <= 30` 이면 `startAtSec = 0` | 통합 |
| `saveProgress` upsert 동작 | 통합 |
| `saveProgress` 15초 미만 재호출 → 429 | 통합 |
| `countView` — 같은 사용자 같은 날 2회 → 1 증가 | 통합 ★ |
| `countView` — 날짜 변경 후 → 다시 증가 | 통합 |
| `usePlayer` 상태 전이 | 컴포넌트 |
| Safari 판정 시 hls.js 미사용 | 컴포넌트 (`canPlayType` 모킹) |
| hls.js 네트워크 fatal → 3회 재시도 후 포기 | 컴포넌트 |
| 키보드 단축키 전부 | 컴포넌트 |
| 입력 필드 포커스 시 단축키 무시 | 컴포넌트 |
| 진행률이 `sendBeacon` 으로 전송 | 컴포넌트 (spy) |
| 재생 → 이어보기 → 위치 복원 | E2E (US-04) |
| 업로드 → 변환 → 재생 | E2E (US-03) |
| 플레이어 전체 조작 키보드만으로 가능 | E2E (접근성) |
| axe-core 위반 0 (재생 화면) | E2E |

## 8. 완료 조건 (DoD)

- [ ] `pnpm gate` 통과
- [ ] 잔존 `NotImplementedError('T07:...')` = 0
- [ ] `playback.e2e.ts` (US-03, US-04) 통과
- [ ] **실제 브라우저 4종**에서 재생 확인 (Chrome, Safari, Firefox, iOS Safari — 수동)
- [ ] Safari 에서 hls.js 가 로드되지 않음 확인 (네트워크 탭)
- [ ] 화질 수동 전환이 끊김 없이 동작 (키프레임 정렬 검증 — T06 결과 확인)
- [ ] TTFF ≤ 2.0s (로컬 CDN 기준 측정)
- [ ] hls.js 가 초기 번들에 포함되지 않음 (`@next/bundle-analyzer` 확인)
- [ ] CSP 위반 콘솔 에러 0건
- [ ] 조회수 중복 방지 실제 확인 (같은 영상 2회 시청 → 1 증가)
- [ ] 진행률 저장을 강제 실패시켜도 재생이 계속됨 (수동)
