# 2026-08-27 가입·동의·연령 제한 인수인계

## 현재 상태

T15 메타데이터, T16 역할·등급, 가입 프로필·이메일 시스템 변경이 같은 로컬 작업 묶음에
있다. T17에서 남아 있던 정책 문서, 동의 철회, 마케팅 수신거부, 저장 생년월일 A19
판정을 연결했다. OAuth는 제품 결정에 따라 도입하지 않았다.

## 운영 배포 결과

- 최신 웹 이미지 SHA: `fbacf6bb912eafae8e4c061e991b3e3c7575efcd`
- 가입 화면을 계정 → 프로필 → 이용 설정의 3단계로 전환했다. 마지막 단계는 이용 목적,
  국가, 필수 약관·개인정보 동의, 선택 마케팅 동의 순서다.
- 가입 이메일 입력은 한 줄만 사용한다. `example.com`·`example.net`·`example.org` 같은
  문서 예시 전용 주소는 API 스키마에서도 거부한다.
- 인증 화면은 ilog 스타일의 로딩·성공·오류 상태를 사용한다. 인증 성공 시 현재 탭과 원래
  가입 탭이 로그인 화면으로 자동 이동하며, 만료 링크는 인증 화면 안에서 재발송한다.
- Fast lane 정책: 출시 후보 고정 전까지 전체 CI를 일반 배포의 선행 조건으로 기다리지
  않는다. 관련 테스트·정적 검사 → push → 서버 반영 → 운영 스모크를 기본으로 하며,
  세부 안전 경계는 `20_OPS/O01_DEPLOY.md` §1-0을 따른다.
- 웹 이미지 SHA: `3b09e21fa11c02884f6e9dd02c127aadb3284660`
- 워커 이미지 SHA: `1b8ca3a1b8030a04418be8aa4bf935aff693f6cb`
- 운영 설정은 웹 SHA에 포함된 `noeviction`·worker condition 수정본 사용
- 이미지 게시 run: `33048336639` 성공
- 신규 Prisma 마이그레이션 3개 적용, 전체 완료 10개, 실패 0개
- 외부 `/`, `/signup`, `/terms`, `/privacy`, `/unsubscribe`, `/api/health`,
  `/api/ready` 모두 200
- readiness: DB·Redis·스토리지·큐·메일 모두 `ok`
- 웹·워커·스케줄러·PostgreSQL·Redis healthy, 재시작 0회
- SMTP는 `smtp.resend.com` 대체 TLS 포트 2465에서 실제 인증 성공
- Redis는 BullMQ 큐 데이터 보호를 위해 `noeviction` 적용
- 미인증 Credentials 로그인과 기존 미인증 세션을 모두 차단했다. 공개 Auth 공급자는
  `credentials` 하나이며 Google 등 OAuth는 환경변수가 있어도 활성화되지 않는다.
- 잘못 생성된 미인증 계정 2개와 해당 토큰을 삭제했다. 삭제 직전 복구 덤프는
  `/opt/dreamcine/backups/predelete-unverified-20260827.dump`이며 검증·모드 600 상태다.
- 배포 전 DB 덤프: `/opt/dreamcine/backups/predeploy-6720969.dump`, 모드 600,
  `pg_restore --list` 검증 완료

Linux 전체 gate run `33047557689`는 빌드·정적·계약 검사와 테스트 자체는 통과했으나
신규 DB 저장소 코드로 패키지 커버리지가 66.95%가 되어 70% 기준에서 종료됐다. 해당
경로의 실제 PostgreSQL 통합 테스트는 후속 커밋에 추가했다. 전체 gate 재실행은 사용자
결정에 따라 후속 CI 정리로 남긴다.

로컬 검증:

- `gate:static` 통과: lint, typecheck, dependency-cruiser, Playwright 28개 수집, format
- `gate:contract` 9종 통과, Prisma drift 0
- 비컨테이너 Vitest 1,715개 통과, 137개 skip
- 관련 표적 테스트 19개 및 player 5개 통과
- 로컬 전체 실패 11 suite는 Docker/Testcontainers 런타임 부재 때문
- Next 빌드는 페이지 42개 생성·타입 검사를 마친 뒤 Windows symlink `EPERM`으로 종료
  (Linux CI를 최종 빌드 근거로 사용)

## 배포 순서

현재 개발 기간에는 `20_OPS/O01_DEPLOY.md` §1-0 Fast lane을 우선한다. 아래 순서는
출시 후보 고정 후 사용하는 정식 배포 순서다.

1. 전체 변경을 하나의 정확한 SHA로 커밋해 `main`에 push한다.
2. 출시 후보 단계에서는 GitHub Actions gate와 `image` 잡이 모두 성공했는지 확인한다.
3. 운영이 현재 정상이고 백업이 유효한지 O01 §3-0 순서로 확인한다.
4. 수동 `deploy.yml`을 해당 SHA, `deploy_worker=true`로 실행한다.
5. 배포 스크립트가 다음 마이그레이션을 `prisma migrate deploy`로 먼저 적용하는지 확인한다.
   - `20260827000000_t15_metadata_upgrade`
   - `20260827010000_t16_role_tiers`
   - `20260827020000_signup_profile`
6. 외부 `/api/health`, `/api/ready`와 웹·워커·스케줄러 healthy를 확인한다.
7. `/signup`, `/terms`, `/privacy`, 로그인 후 `/account#consents`를 스모크한다.
8. 테스트 계정으로 마케팅 철회 후 DB 최신 `MARKETING` 행이 `granted=false`,
   `revoked_at` 설정 상태인지 확인한다. A19는 저장 생년월일 계정으로 성인/미성년을
   각각 확인한다.

## 다음 작업자에게 남은 일

- CI와 운영 배포 실행 번호·최종 SHA를 이 문서와 `docs/HANDOFF.md` 최상단에 기록한다.
- 실제 사업자 정보, 수탁사, 국외 이전, 보유기간, 관할법을 반영한 정책 문서를 법률
  검토 후 새 버전으로 고정한다. 버전을 바꾸면 기존 동의를 자동 승계하지 않는다.
- 필수 동의 철회는 현재 개인정보 담당자 이메일 접수다. `UserDeletionRequest`를 이용한
  로그인 내 탈퇴 요청, 30일 유예, 취소, 물리 파기 worker는 별도 작업으로 구현한다.
- 마케팅 캠페인은 반드시 `getMarketingRecipients()`와 `sendMarketingEventMail()`을 쓴다.
  미리보기 전용 `sendEventMailPreviewOnly()`를 운영 코드에서 호출하지 않는다.
- `.env`, SMTP 자격증명, SSH 키, 실제 사용자 개인정보를 문서·로그·커밋에 남기지 않는다.
- 일간 원격 암호화 백업 timer는 아직 설치되지 않았다. 현재 배포 전 로컬 DB 덤프만
  있으므로 `O04_BACKUP_DR.md`의 Object Storage 백업 자동화를 별도 운영 작업으로 완료한다.
