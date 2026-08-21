# INDEX — 문서 맵 & 실행 순서

> CODEX는 **항상 여기서 시작**한다.
> 규칙은 `HARNESS.md`, 계약은 `00_SPEC/`, 작업은 `10_TASKS/`, 운영은 `20_OPS/`.

---

## 0. 읽는 순서 (최초 1회)

1. `HARNESS.md` — SSS 하네스 규율 **(필수, 매 세션)**
2. `GLOSSARY.md` — 용어·명명 규칙
3. `00_SPEC/00_PRODUCT.md` — 무엇을 만드는가
4. `00_SPEC/01_ARCHITECTURE.md` — 어떤 모양인가
5. `00_SPEC/02_REPO_LAYOUT.md` — 어디에 두는가
6. `00_SPEC/03_TECH_STACK.md` — 무엇으로 만드는가
7. `00_SPEC/11_CAPACITY_TIERS.md` — **현재 서버가 무엇을 감당하는가 (현재 `T0`)**

> **현재 티어는 `T0`** — dreamcinema (Linode jp-osa, 1 vCPU / 2 GB / 50 GB).
> 업로드 2GB·20분 상한, 래더 720p/360p 2단, 워커 동시성 1.
> 사양 의존 숫자를 코드에 박지 말고 `Capacity` 객체를 참조한다.

그 다음부터는 **태스크 문서가 필요한 스펙만 지목**한다. 전체를 다시 읽지 않는다.

---

## 1. 문서 트리

```
docs/
├─ INDEX.md                     ← 지금 이 문서
├─ HARNESS.md                   ← SSS 하네스 규율 (최상위 규칙)
├─ GLOSSARY.md                  ← 용어/명명 사전
├─ _ISSUES.md                   ← 스펙 결함 신고함 (CODEX가 쓰는 유일한 스펙 관련 파일)
│
├─ 00_SPEC/                     ← 불변 계약. CODEX 수정 금지.
│  ├─ 00_PRODUCT.md             제품 정의 · 범위 · 비범위 · 사용자 스토리
│  ├─ 01_ARCHITECTURE.md        시스템 아키텍처 · 데이터 흐름 · 배치도
│  ├─ 02_REPO_LAYOUT.md         모노레포 폴더 구조 전체 트리 (파일 배치 근거)
│  ├─ 03_TECH_STACK.md          기술스택 · 버전 고정 · 허용 라이브러리 화이트리스트
│  ├─ 04_DOMAIN_MODEL.md        도메인 모델 · Prisma 스키마 계약 · 인덱스 전략
│  ├─ 05_API_CONTRACT.md        REST 계약 · 요청/응답 스키마 · 페이지네이션 · 버저닝
│  ├─ 06_MEDIA_PIPELINE.md      업로드 → 트랜스코드 → HLS → Object Storage → CDN
│  ├─ 07_AUTH_SECURITY.md       인증 · 권한 · 서명 URL · 레이트리밋 · 위협모델
│  ├─ 08_UIUX_SPEC.md           라우트 맵 · 화면 계약 · 컴포넌트 목록 · 디자인 토큰
│  ├─ 09_ERROR_CATALOG.md       에러코드 SSOT (여기 없는 코드 사용 금지)
│  ├─ 10_NFR.md                 성능 · SLO · 제품 불변 한도 · 비용 가드레일
│  └─ 11_CAPACITY_TIERS.md      ★ 서버 사양별 프로필 (사양 의존 숫자의 SSOT)
│
├─ 10_TASKS/                    ← 단위 작업지시서. T00 → T13 순서.
│  ├─ T00_BOOTSTRAP.md          모노레포 골격 · 게이트 스크립트 · 하네스 설치
│  ├─ T01_INFRA_DOCKER.md       docker compose · Caddy · 환경변수 · 로컬 개발환경
│  ├─ T02_DB_PRISMA.md          Prisma 스키마 · 마이그레이션 · 시드 · 리포지토리 계층
│  ├─ T03_AUTH.md               Auth.js · 세션 · 역할 · 미들웨어 · 계정 라이프사이클
│  ├─ T04_STORAGE_S3.md         Object Storage 어댑터 · 버킷 규칙 · 서명 URL
│  ├─ T05_UPLOAD.md             멀티파트 업로드 · 검증 · 업로드 세션 · 재개
│  ├─ T06_TRANSCODE_WORKER.md   BullMQ 워커 · ffmpeg · HLS 래더 · 썸네일 · 멱등성
│  ├─ T07_PLAYER_HLS.md         hls.js 플레이어 · 자동화질 · 이어보기 · 조회수
│  ├─ T08_SERIES_EPISODE.md     시리즈/에피소드/시즌 · 공개예약 · 정렬
│  ├─ T09_FEED_RANKING.md       피드 · 랭킹 점수 · 커서 페이지네이션 · 검색/태그
│  ├─ T10_SOCIAL_GRAPH.md       팔로우 · 좋아요 · 댓글 · 알림 · 카운터 정합성
│  ├─ T11_OBSERVABILITY.md      구조적 로깅 · 메트릭 · 트레이싱 · 알럿 · 헬스체크
│  ├─ T12_MODERATION.md         신고 · 심사큐 · 차단 · 저작권 · 연령등급
│  ├─ T13_PWA_PHASE2.md         PWA 마감 + Expo 앱 전환 대비 (API 안정화 계약)
│  └─ T14_DESIGN_SYSTEM.md      디자인 토큰 · 프리미티브 21개 · 테마 (T07 앞)
│
└─ 20_OPS/                      ← 운영 · 예외 · 유지보수
   ├─ O01_DEPLOY.md             Akamai VPS 배포 · 무중단 전환 · 롤백
   ├─ O02_EXCEPTION_POLICY.md   예외처리 표준 (전 코드 공통 규약)
   ├─ O03_MAINTENANCE.md        유지보수 런북 · 정기점검 · 의존성 갱신
   ├─ O04_BACKUP_DR.md          백업 · 복구 훈련 · RPO/RTO
   ├─ O05_INCIDENT.md           장애 대응 절차 · 심각도 등급 · 포스트모템
   ├─ O06_TESTING_QA.md         테스트 전략 · 커버리지 기준 · 픽스처 정책
   └─ O07_ONBOARDING.md         신규 인원/에이전트 온보딩 30분 코스
```

---

## 2. 실행 순서와 의존 관계

> **T14 (디자인 시스템)** 는 문서가 나중에 추가되었을 뿐 실행 위치는 **T07 앞**이다.
> T07·T09·T10·T12 의 화면이 그 산출물을 소비한다.

```
T00 BOOTSTRAP  (하네스 먼저 깐다 — 이게 없으면 아무것도 시작 못 함)
   │
   ├─▶ T01 INFRA_DOCKER ──┐
   │                       │
   └─▶ T02 DB_PRISMA ──────┼──▶ T03 AUTH
                           │        │
                           └──▶ T04 STORAGE_S3
                                    │
                                    ▼
                                 T05 UPLOAD ──▶ T06 TRANSCODE ──▶ T07 PLAYER
                                                                     ▲
                                                     T14 DESIGN_SYSTEM┘
                                                     │
                                                     ▼
                                              T08 SERIES/EPISODE
                                                     │
                                    ┌────────────────┴────────────────┐
                                    ▼                                 ▼
                              T09 FEED/RANKING                 T10 SOCIAL_GRAPH
                                    └────────────────┬────────────────┘
                                                     ▼
                                              T11 OBSERVABILITY
                                                     ▼
                                              T12 MODERATION
                                                     ▼
                                              T13 PWA / Phase2
```

### 병렬 가능 조합 (여러 CODEX 세션을 동시에 돌릴 때만)

| 동시 실행 가능 | 이유 |
|---|---|
| T01 + T02 | 인프라와 스키마는 서로 안 겹침 |
| T09 + T10 | 피드와 소셜그래프는 읽기/쓰기 경로가 분리됨 |
| T11 은 아무 때나 | 관측은 횡단 관심사, 다만 T06 이후가 효율적 |

**T05 → T06 → T07 은 절대 병렬 금지** (미디어 파이프라인은 단일 순서 사슬)

---

## 3. 전체 진행표

> 이 표는 각 `T*.md` 상단 체크박스를 집계한 결과다. **사람이 손으로 고치지 않는다.**
> `pnpm sss:status` 가 이 표를 갱신한다.

| # | 태스크 | S1 Spec | S2 Skeleton | S3 구현 | 잔존 NIE |
|---|---|---|---|---|---|
| T00 | BOOTSTRAP | ✅ | ✅ | ✅ | — |
| T01 | INFRA_DOCKER | ✅ | ✅ | ✅ | — |
| T02 | DB_PRISMA | ✅ | ✅ | ✅ | — |
| T03 | AUTH | ✅ | ✅ | ✅ | — |
| T04 | STORAGE_S3 | ⬜ | ⬜ | ⬜ | — |
| T05 | UPLOAD | ⬜ | ⬜ | ⬜ | — |
| T06 | TRANSCODE_WORKER | ⬜ | ⬜ | ⬜ | — |
| T07 | PLAYER_HLS | ⬜ | ⬜ | ⬜ | — |
| T08 | SERIES_EPISODE | ⬜ | ⬜ | ⬜ | — |
| T09 | FEED_RANKING | ⬜ | ⬜ | ⬜ | — |
| T10 | SOCIAL_GRAPH | ⬜ | ⬜ | ⬜ | — |
| T11 | OBSERVABILITY | ⬜ | ⬜ | ⬜ | — |
| T12 | MODERATION | ⬜ | ⬜ | ⬜ | — |
| T13 | PWA_PHASE2 | ⬜ | ⬜ | ⬜ | — |
| T14 | DESIGN_SYSTEM | ✅ | ⬜ | ⬜ | — |

범례: ⬜ 미착수 · 🟡 진행중 · ✅ 게이트 통과 · 🔴 게이트 실패(정지)

---

## 4. 마일스톤

| 마일스톤 | 포함 태스크 | 완료 판정 |
|---|---|---|
| **M1 골격** | T00 ~ T02 | `pnpm gate` 통과 + 빈 앱이 뜨고 DB 연결됨 |
| **M2 계정** | T03 | 회원가입·로그인·로그아웃 E2E 통과 |
| **M3 파이프라인** | T04 ~ T07 | 영상 1개 업로드 → HLS 재생까지 E2E 통과 |
| **M4 서비스** | T08 ~ T10 | 시리즈 게시 → 피드 노출 → 팔로우/댓글 E2E 통과 |
| **M5 운영** | T11 ~ T12 | 알럿 발화 확인 + 신고→차단 흐름 통과 |
| **M6 출시** | T13 + 20_OPS 전체 | 프로덕션 배포 + 복구 훈련 1회 성공 |

---

## 5. 태스크 문서 표준 서식

모든 `T*.md` 는 **동일한 8개 섹션**을 가진다. CODEX는 이 서식을 신뢰한다.

```md
# T{NN} — {제목}

## 진행 상태          ← 체크박스 3개 (S1/S2/S3)
## 1. 목적            ← 이 태스크가 끝나면 무엇이 가능해지는가 (1~3줄)
## 2. 참조 스펙        ← 읽어야 할 00_SPEC 파일 목록. 이 밖은 읽지 않는다.
## 3. 산출물 파일      ← S1에서 확정할 파일 경로 표 (경로 / 책임 / 단계)
## 4. S2 Skeleton     ← 만들 타입·시그니처. 코드 블록으로 명시.
## 5. S3 구현 순서     ← NotImplementedError 마커별 구현 순서 + 알고리즘
## 6. 예외처리         ← 발생 가능 예외 → 에러코드 → 처리 방식 표
## 7. 테스트           ← 반드시 통과해야 하는 케이스 목록
## 8. 완료 조건(DoD)   ← 게이트 + 잔존 NIE 0 + 추가 조건
```
