# GLOSSARY — 용어 · 명명 규칙 사전

> 용어가 흔들리면 코드가 흔들린다. 여기 없는 새 용어를 발명하지 말 것.
> 새 용어가 필요하면 `_ISSUES.md` 에 제안하고 승인 후 여기에 등재한다.

---

## 1. 도메인 용어

| 용어 | 코드 식별자 | 정의 |
|---|---|---|
| 작품 / 시리즈 | `Series` | AI 드라마 한 작품. 에피소드의 컨테이너. |
| 시즌 | `Season` | 시리즈 내 묶음. 시즌 없는 시리즈도 허용(기본 시즌 1). |
| 에피소드 | `Episode` | 재생 단위. 영상 자산 1개를 가리킨다. |
| 영상 자산 | `VideoAsset` | 원본 파일 + 트랜스코드 결과물(HLS)의 집합. |
| 렌디션 | `Rendition` | 특정 화질의 트랜스코드 결과 (예: 720p). |
| 업로드 세션 | `UploadSession` | 멀티파트 업로드의 진행 상태를 담는 레코드. |
| 크리에이터 | `Creator` | 작품을 올리는 사용자 역할. `User.role = CREATOR` |
| 시청자 | `Viewer` | 기본 사용자 역할. `User.role = VIEWER` |
| 피드 | `Feed` | 시청자에게 노출되는 에피소드 목록. |
| 랭킹 점수 | `rankScore` | 피드 정렬용 수치. 산식은 `10_TASKS/T09_FEED_RANKING.md` §4. |
| 시청 기록 | `WatchProgress` | 사용자별 에피소드 재생 위치(초). |
| 신고 | `Report` | 사용자가 콘텐츠/계정을 문제 제기한 레코드. |
| 심사 | `Moderation` | 신고를 처리하는 운영 행위. |
| 연령등급 | `AgeRating` | `ALL` / `A12` / `A15` / `A19` |

## 2. 아키텍처 용어

| 용어 | 뜻 |
|---|---|
| **하네스(harness)** | 궤도 이탈을 기계적으로 막는 검사 장치. `HARNESS.md` 참조. |
| **게이트(gate)** | 다음 단계 진입을 허가하는 단일 명령. `pnpm gate*` |
| **SSS** | Spec → Skeleton → Stub. 이 프로젝트의 유일한 구현 절차. |
| **NIE** | `NotImplementedError`. S2가 남긴 구현 대기 마커. |
| **SSOT** | Single Source of Truth. 각 사실의 유일한 출처 문서/파일. |
| **계약(contract)** | 스펙 문서에 적힌, 코드가 반드시 지켜야 하는 형태. |
| **드리프트(drift)** | 스펙과 코드가 몰래 벌어진 상태. 계약 하네스가 잡는다. |
| **엣지(edge)** | Akamai CDN. 원본 서버 앞단 캐시 계층. |
| **오리진(origin)** | Object Storage 또는 VPS. CDN이 당겨가는 원본. |

## 3. 명명 규칙

### 파일 · 폴더

| 대상 | 규칙 | 예시 |
|---|---|---|
| 폴더 | kebab-case | `upload-session/` |
| React 컴포넌트 파일 | PascalCase | `EpisodeCard.tsx` |
| 그 외 TS 파일 | kebab-case | `create-upload-session.ts` |
| 테스트 | 대상과 같은 이름 + `.test.ts` | `create-upload-session.test.ts` |
| E2E | `*.e2e.ts` | `upload-flow.e2e.ts` |
| Next.js 라우트 | Next 규약 그대로 | `app/(main)/series/[id]/page.tsx` |
| 스펙 문서 | `NN_UPPER_SNAKE.md` | `06_MEDIA_PIPELINE.md` |
| 태스크 문서 | `T{NN}_UPPER_SNAKE.md` | `T06_TRANSCODE_WORKER.md` |

### 코드 식별자

| 대상 | 규칙 | 예시 |
|---|---|---|
| 타입 · 인터페이스 | PascalCase, 접두사 없음 (`I` 금지) | `UploadSession` |
| zod 스키마 | `{Name}Schema` | `CreateEpisodeSchema` |
| DTO 타입 | `{Name}Input` / `{Name}Output` | `CreateEpisodeInput` |
| 함수 | camelCase, 동사로 시작 | `createUploadSession()` |
| 리포지토리 메서드 | `find*` / `list*` / `create*` / `update*` / `delete*` | `listEpisodesBySeries()` |
| 불리언 | `is` / `has` / `can` 접두 | `isPublished`, `canPublish` |
| 상수 | UPPER_SNAKE | `MAX_UPLOAD_BYTES` |
| 환경변수 | UPPER_SNAKE, 도메인 접두 | `S3_BUCKET_ORIGINALS` |
| 에러코드 | `E_` + UPPER_SNAKE | `E_UPLOAD_TOO_LARGE` |
| 큐 잡 이름 | `{도메인}.{동작}` | `video.transcode` |
| 메트릭 이름 | `aidream_{도메인}_{측정}_{단위}` | `aidream_transcode_duration_seconds` |
| DB 테이블 | Prisma 모델 PascalCase → 실제 테이블 snake_case (`@@map`) | `UploadSession` → `upload_session` |
| DB 컬럼 | camelCase 필드 → snake_case (`@map`) | `createdAt` → `created_at` |

### Git

| 대상 | 규칙 | 예시 |
|---|---|---|
| 브랜치 | `t{NN}/{s단계}-{요약}` | `t06/s2-transcode-skeleton` |
| 커밋 | `T{NN}/S{n}: {요약}` | `T06/S2: transcode worker skeleton` |
| 태그 | `m{마일스톤}-{날짜}` | `m3-20260901` |

## 4. 상태 열거형 (고정값 — 임의 추가 금지)

```ts
// packages/core/src/enums.ts
export const UploadStatus = ['CREATED','UPLOADING','UPLOADED','FAILED','ABORTED'] as const
export const AssetStatus  = ['PENDING','PROBING','TRANSCODING','READY','FAILED'] as const
export const EpisodeStatus= ['DRAFT','SCHEDULED','PUBLISHED','HIDDEN','REMOVED'] as const
export const UserRole     = ['VIEWER','CREATOR','MODERATOR','ADMIN'] as const
export const ReportStatus = ['OPEN','REVIEWING','ACTIONED','REJECTED'] as const
export const AgeRating    = ['ALL','A12','A15','A19'] as const
```

상태 전이 규칙은 `00_SPEC/04_DOMAIN_MODEL.md` §상태기계 에 있다.

## 5. 금지 용어 (혼동 유발)

| 쓰지 말 것 | 대신 |
|---|---|
| video / movie / clip 혼용 | `Episode` (재생단위) 또는 `VideoAsset` (파일) 로 구분 |
| post | `Episode` 또는 `Series` |
| user 의 다른 표현 (member, account) | `User` |
| thumbnail / poster 혼용 | `posterUrl` (작품 대표) / `thumbUrl` (에피소드 미리보기) |
| like / heart / fav 혼용 | `Like` |
| 한글 식별자 | 영문만 |
