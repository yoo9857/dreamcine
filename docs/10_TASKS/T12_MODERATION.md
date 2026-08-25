# T12 — 신고 · 심사 · 연령등급 · 저작권

## 진행 상태
- [x] S1 Spec 확인 — 2026-08-25 / ISS-017 승인 / 산출물 37개 확정
- [x] S2 Skeleton — 2026-08-25 / gate:s2 PASS / 마커 7개
- [x] S3 구현 — 2026-08-25 / CI 32842735110 PASS / 운영 배포 32843982847 PASS

---

## 1. 목적

사용자가 문제 콘텐츠를 신고하고, 모더레이터가 처리할 수 있게 한다.
UGC 영상 플랫폼에서 이것은 **선택 기능이 아니라 법적·운영적 필수**다.

## 2. 참조 스펙

- `../00_SPEC/05_API_CONTRACT.md` §8 신고/심사
- `../00_SPEC/04_DOMAIN_MODEL.md` §2 (Report), §3 상태기계
- `../00_SPEC/07_AUTH_SECURITY.md` §2 권한 매트릭스
- `../00_SPEC/00_PRODUCT.md` §6 콘텐츠 정책
- `../00_SPEC/09_ERROR_CATALOG.md` (REPORT 절)

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `prisma/schema.prisma` | 신고 우선순위·자동숨김 상태 저장 | S2→S3 |
| `prisma/migrations/20260825_t12_moderation_report_flags/migration.sql` | Report 필드·심사큐 인덱스 마이그레이션 | S2→S3 |
| `packages/core/src/entities.ts` | Report 도메인 필드 확장 | S2→S3 |
| `packages/core/src/index.ts` | 신고 스키마·자동조치 API 공개 | S2→S3 |
| `packages/core/src/schemas/report.schema.ts` | 신고 zod | S2→S3 |
| `packages/core/src/schemas/report.schema.test.ts` | 신고 입력·심사 액션 검증 | S3 |
| `packages/core/src/rules/moderation.ts` | 자동 조치 판정 (순수) | S2→S3 |
| `packages/core/src/rules/moderation.test.ts` | 자동 조치 규칙표 전수 검증 | S3 |
| `packages/core/tests/permission.test.ts` | MODERATOR·ADMIN 권한 경계 | S3 |
| `packages/db/src/mappers/report.mapper.ts` | Prisma Report 매핑 | S2→S3 |
| `packages/db/src/repositories/report.repo.ts` | 신고 집계·심사큐·조건부 일괄 처리 | S2→S3 |
| `packages/db/src/repositories/user.repo.ts` | 사용자 검색·정지 트랜잭션 | S3 |
| `packages/db/tests/moderation.integration.test.ts` | 저장·정렬·동시 처리 통합 검증 | S3 |
| `apps/web/src/services/moderation/create-report.ts` | 신고 접수 | S2→S3 |
| `apps/web/src/services/moderation/create-report.test.ts` | 접수·중복·자동숨김 검증 | S3 |
| `apps/web/src/services/moderation/review-report.ts` | 심사 조치 | S2→S3 |
| `apps/web/src/services/moderation/review-report.test.ts` | 조치·복원·권한·감사 검증 | S3 |
| `apps/web/src/services/moderation/suspend-user.ts` | 계정 정지 | S2→S3 |
| `apps/web/src/services/moderation/suspend-user.test.ts` | 세션·콘텐츠·업로드 즉시 정지 검증 | S3 |
| `apps/web/src/services/moderation/list-report-queue.ts` | 대상 정보·누적 신고 심사큐 | S2→S3 |
| `apps/web/src/services/moderation/manage-users.ts` | 관리자 사용자 검색·상태 변경 | S2→S3 |
| `apps/web/app/api/reports/route.ts` | POST | S3 |
| `apps/web/app/api/admin/reports/route.ts` | GET (심사큐) | S3 |
| `apps/web/app/api/admin/reports/[id]/action/route.ts` | POST | S3 |
| `apps/web/app/api/admin/users/route.ts` | GET | S3 |
| `apps/web/app/api/admin/users/[id]/status/route.ts` | POST | S3 |
| `apps/web/src/components/ReportDialog.tsx` | 신고 UI | S3 |
| `apps/web/src/components/report-dialog.test.tsx` | 신고 UI 검증 | S3 |
| `apps/web/src/components/moderation/ReportActions.tsx` | 심사 조치 컨트롤 | S3 |
| `apps/web/src/components/moderation/UserStatusActions.tsx` | 사용자 정지·해제 컨트롤 | S3 |
| `apps/web/app/(main)/watch/[episodeId]/page.tsx` | 본인 콘텐츠를 제외한 신고 진입점 | S3 |
| `apps/web/app/(admin)/layout.tsx` | 권한 가드 | S3 |
| `apps/web/app/(admin)/admin/reports/page.tsx` | 심사큐 화면 | S3 |
| `apps/web/app/(admin)/admin/users/page.tsx` | 사용자 관리 | S3 |
| `apps/web/e2e/moderation.e2e.ts` | US-07 | S3 |
| `openapi.json` | 신고·관리자 API 계약 | S3 |
| `docs/10_TASKS/T12_MODERATION.md` | 단계·검증 근거 기록 | S1→S3 |

## 4. S2 Skeleton

```ts
// packages/core/src/rules/moderation.ts — 순수 함수
export interface AutoActionInput {
  reportCount: number              // 해당 대상의 누적 OPEN 신고 수
  distinctReporters: number        // 서로 다른 신고자 수
  reason: ReportReason
  targetAgeHours: number           // 대상 게시 후 경과 시간
}
export type AutoAction = 'NONE' | 'PRIORITIZE' | 'AUTO_HIDE'

export function decideAutoAction(input: AutoActionInput): AutoAction {
  throw new NotImplementedError('T12:decideAutoAction')
}
```

### 자동 조치 규칙 (확정)

| 조건 | 조치 |
|---|---|
| `reason` 이 `MINOR_SAFETY` 이고 신고자 ≥ 1 | **`AUTO_HIDE`** (즉시 숨김) |
| `reason` 이 `SEXUAL` 또는 `COPYRIGHT` 이고 서로 다른 신고자 ≥ 3 | `AUTO_HIDE` |
| 서로 다른 신고자 ≥ 5 | `AUTO_HIDE` |
| 서로 다른 신고자 ≥ 2 | `PRIORITIZE` (심사큐 상단) |
| 그 외 | `NONE` |

**`MINOR_SAFETY` 를 즉시 숨기는 이유**: 아동 안전 관련 신고는 오탐의 비용보다
방치의 비용이 압도적으로 크다. 숨김은 되돌릴 수 있고, 방치는 되돌릴 수 없다.

**`distinctReporters` 를 쓰는 이유**: 한 사람이 여러 번 신고해도 1로 센다.
(DB 유니크 제약이 이미 막지만, 계정 여러 개로 하는 어뷰징을 고려해 명시적으로)

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T12:decideAutoAction` | 위 규칙표 |
| 2 | `T12:createReport` | 아래 순서 |
| 3 | `T12:reviewReport` | 조치 실행 + 이력 |
| 4 | `T12:suspendUser` | 정지 + **세션 전부 무효화** |
| 5 | `T12:listReportQueue` | 우선순위 정렬 + 대상 정보 조인 |
| 6 | `T12:reportDialog` | 사유 선택 + 상세 입력 |
| 7 | `T12:adminPages` | 심사큐/사용자 관리 화면 |

#### `createReport` 순서

```
1. 인증 확인                                    → E_AUTH_REQUIRED
2. 대상 존재 확인 (target/targetId)             → E_NOT_FOUND
3. 자기 콘텐츠/자기 자신 신고?                    → E_USER_SELF_ACTION
4. 중복 신고 (동일 신고자+대상)                   → E_REPORT_DUPLICATE
5. 레이트리밋 (일 20건)                          → E_RATE_LIMITED
6. Report INSERT (status=OPEN)
7. 누적 신고 집계 (distinctReporters)
8. decideAutoAction()
9. AUTO_HIDE → 대상 즉시 숨김 + 소유자에게 MODERATION 알림 + 운영 알럿
   PRIORITIZE → 심사큐 우선순위 플래그
10. 201
```

#### `reviewReport` 조치별 동작

| 액션 | 동작 |
|---|---|
| `HIDE_CONTENT` | 대상 `HIDDEN` 전이 + 소유자 알림 + 신고 `ACTIONED` |
| `REMOVE_CONTENT` | 대상 `REMOVED` 전이 (불가역) + 소유자 알림 + HLS 삭제 잡 + `ACTIONED` |
| `SUSPEND_USER` | 소유자 `SUSPENDED` + 세션 전부 삭제 + 그의 콘텐츠 전부 `HIDDEN` + `ACTIONED` |
| `REJECT` | 신고 `REJECTED`. 대상 변경 없음. **자동 숨김되어 있었다면 되돌린다** |

```
공통 처리:
- handledBy = 모더레이터 ID, handledAt = now, actionNote 저장
- 같은 대상의 다른 OPEN 신고들도 함께 처리 (일괄 ACTIONED/REJECTED)
  → 같은 영상에 대한 신고 10개를 10번 처리하게 만들지 않는다
- 모든 조치는 감사 로그(info)에 남긴다: { moderatorId, action, target, targetId, reportIds }
```

**`REJECT` 가 자동 숨김을 되돌리는 것이 중요하다.** 자동 숨김은 임시 조치이며,
사람이 문제없다고 판단하면 원상복구되어야 한다. 이걸 빼먹으면 오탐 신고로
정상 콘텐츠가 영구히 숨겨진다.

#### 계정 정지의 즉시성

```
suspendUser(userId):
1. User.status = 'SUSPENDED'
2. ★ Session 테이블에서 해당 userId 의 모든 세션 DELETE
   → DB 세션 전략(07 §1)이므로 다음 요청에서 즉시 로그아웃된다
3. 그의 모든 시리즈/에피소드를 HIDDEN 으로 (REMOVED 아님 — 복구 가능하게)
4. 진행 중인 업로드 세션 ABORTED
5. 알림 + 이메일 통보 (사유 포함)
```

JWT 세션이었다면 2번이 불가능했다. `07_AUTH_SECURITY.md` §1 의 DB 세션 결정이
여기서 값을 한다.

### 심사큐 정렬

```
ORDER BY
  priority_flag DESC,                        -- PRIORITIZE 된 것 먼저
  CASE reason WHEN 'MINOR_SAFETY' THEN 0
              WHEN 'SEXUAL' THEN 1
              WHEN 'COPYRIGHT' THEN 2
              ELSE 3 END,                    -- 사유 심각도
  created_at ASC                             -- 오래된 것 먼저
LIMIT $limit + 1
```

각 항목에 함께 보여줄 것: 대상 미리보기(썸네일/제목/댓글 본문),
소유자 정보, **같은 대상의 누적 신고 수**, 신고 사유 분포.

## 6. 예외처리

| 상황 | 에러코드 | 처리 |
|---|---|---|
| 미로그인 신고 | `E_AUTH_REQUIRED` | 401 → 로그인 유도 |
| 대상 없음 | `E_NOT_FOUND` | 404 |
| 자기 콘텐츠 신고 | `E_USER_SELF_ACTION` | 400 (UI 에서도 버튼 숨김) |
| 중복 신고 | `E_REPORT_DUPLICATE` | 409 + "이미 신고했습니다" |
| 일일 신고 한도 | `E_RATE_LIMITED` | 429 |
| 이미 처리된 신고 재조치 | `E_REPORT_ALREADY_RESOLVED` | 409 + 현재 상태 표시 |
| 모더레이터 권한 없음 | `E_PERM_DENIED` | 403 |
| MODERATOR 가 `REMOVE_CONTENT` 시도 | `E_PERM_DENIED` | 403 (ADMIN 전용) |
| MODERATOR 가 `SUSPEND_USER` 시도 | `E_PERM_DENIED` | 403 (ADMIN 전용) |
| 조치 대상이 이미 `REMOVED` | — | 신고만 `ACTIONED` 처리 (에러 아님) |
| 자동 숨김 실패 | — | 신고는 접수 성공. error 로그 + **알럿** (수동 개입 필요) |
| 알림 발송 실패 | — | 조치는 유지. 재시도 큐 |
| HLS 삭제 실패 | — | 삭제 잡 재시도. DB 상태는 이미 `REMOVED` |
| 정지된 사용자의 세션 삭제 실패 | — | **재시도 필수.** 실패 시 error + 알럿 (보안 이슈) |
| 동시에 두 모더레이터가 같은 신고 처리 | `E_REPORT_ALREADY_RESOLVED` | 409. 낙관적 락 (status 조건부 UPDATE) |

### 동시 처리 방어

```sql
-- 두 모더레이터가 동시에 같은 신고를 처리하는 것을 막는다
UPDATE report SET status = $newStatus, handled_by = $me, handled_at = now()
WHERE id = $id AND status IN ('OPEN', 'REVIEWING')
-- 영향 행 수가 0 이면 → E_REPORT_ALREADY_RESOLVED
```

`SELECT` 후 `UPDATE` 하는 방식은 경합에서 두 번 처리된다. 조건부 UPDATE 로 막는다.

## 7. 테스트

| 케이스 | 방식 |
|---|---|
| `decideAutoAction` — 규칙표 전 조합 | 단위 ★ |
| `decideAutoAction` — `MINOR_SAFETY` 1건 → `AUTO_HIDE` | 단위 |
| `decideAutoAction` — 같은 신고자 5회는 1로 계산 | 단위 |
| 신고 정상 접수 | 통합 |
| 중복 신고 → `E_REPORT_DUPLICATE` | 통합 |
| 자기 콘텐츠 신고 → `E_USER_SELF_ACTION` | 통합 |
| `MINOR_SAFETY` 신고 → 대상 즉시 `HIDDEN` | 통합 ★ |
| 서로 다른 신고자 5명 → 자동 숨김 | 통합 |
| `HIDE_CONTENT` → 피드에서 사라짐 | 통합 |
| `REMOVE_CONTENT` → `REMOVED` + HLS 삭제 잡 발행 | 통합 |
| `REJECT` → **자동 숨김 되돌림** | 통합 ★ |
| `SUSPEND_USER` → 세션 전부 삭제, 다음 요청 401 | 통합 ★ |
| `SUSPEND_USER` → 그의 콘텐츠 전부 숨김 | 통합 |
| 같은 대상의 OPEN 신고들이 일괄 처리됨 | 통합 ★ |
| 동시 처리 2건 → 하나만 성공 | 통합 ★ |
| MODERATOR 가 `REMOVE`/`SUSPEND` 불가 | 통합 |
| 심사큐 정렬 (우선순위 → 사유 → 시각) | 통합 |
| 조치 감사 로그 기록 | 통합 |
| 신고 → 모더레이터 숨김 → 피드 미노출 | E2E (US-07) |
| 비모더레이터가 `/admin` 접근 → 403 | E2E |

## 8. 완료 조건 (DoD)

- [x] `pnpm gate` 통과
- [x] 잔존 `NotImplementedError('T12:...')` = 0
- [x] US-07 E2E 통과
- [x] `MINOR_SAFETY` 자동 숨김 동작 확인
- [x] `REJECT` 가 자동 숨김을 되돌림 확인
- [x] 계정 정지 시 **즉시** 로그아웃 확인 (자동: 서로 다른 브라우저 컨텍스트 2개)
- [x] 동시 처리 방어 확인 (조건부 UPDATE)
- [x] 권한 경계 확인 (MODERATOR ≠ ADMIN)
- [x] 모든 조치가 감사 로그에 남음
- [x] 심사큐에서 대상 미리보기가 실제로 보임 (썸네일/본문)

### S3 검증 근거

- GitHub Actions gate/image: `32842735110` — PostgreSQL 통합, Playwright 26개,
  Lighthouse, promtool, 웹·워커 이미지 게시 통과
- 운영 배포: `32843982847` — SHA `4be0d3fddee1d41d8fd480534550ecbbcfbd7b9c`,
  마이그레이션·웹·워커·배포 내부 헬스 검사 통과
- 외부 확인: `https://ilog.info/`, `/api/health`, `/api/ready` 200;
  readiness의 DB·Redis·스토리지·큐 모두 `ok`; 비인증 `/api/admin/reports` 401
- `pnpm sss:remaining`: `TOTAL=0`
