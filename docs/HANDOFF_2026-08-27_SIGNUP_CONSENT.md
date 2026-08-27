# 2026-08-27 가입·동의·연령 제한 인수인계

## 현재 상태

T15 메타데이터, T16 역할·등급, 가입 프로필·이메일 시스템 변경이 같은 로컬 작업 묶음에
있다. T17에서 남아 있던 정책 문서, 동의 철회, 마케팅 수신거부, 저장 생년월일 A19
판정을 연결했다. OAuth는 제품 결정에 따라 도입하지 않았다.

로컬 검증:

- `gate:static` 통과: lint, typecheck, dependency-cruiser, Playwright 28개 수집, format
- `gate:contract` 9종 통과, Prisma drift 0
- 비컨테이너 Vitest 1,715개 통과, 137개 skip
- 관련 표적 테스트 19개 및 player 5개 통과
- 로컬 전체 실패 11 suite는 Docker/Testcontainers 런타임 부재 때문
- Next 빌드는 페이지 42개 생성·타입 검사를 마친 뒤 Windows symlink `EPERM`으로 종료
  (Linux CI를 최종 빌드 근거로 사용)

## 배포 순서

1. 전체 변경을 하나의 정확한 SHA로 커밋해 `main`에 push한다.
2. GitHub Actions gate와 `image` 잡이 모두 성공했는지 확인한다.
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
