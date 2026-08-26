# INIT — 새 계정 작업 인수인계

작성일: 2026-08-26

상태: **구현·로컬 검증 완료 / Git 푸시 대상 / 운영 미배포**

## 1. 시작 명령

```powershell
git switch main
git pull --ff-only origin main
git status --short
pnpm install --frozen-lockfile
pnpm prisma generate
```

먼저 `docs/HARNESS.md`, `docs/INDEX.md`, 이 문서를 읽는다. 비밀번호·토큰·서버 키는
문서나 커밋에 기록하지 않는다.

## 2. 반드시 보존할 로컬 파일

- 루트의 `ohhanbin_opt.mp4`는 사용자의 검수용 원본이다.
- Git 추적 대상이 아니며 **추가·이동·삭제·커밋하지 않는다.**
- 정상 인수 시 `git status --short`에는 이 파일만 `??`로 보일 수 있다.

## 3. 이번 구현 범위

- 홈(비회원·회원), About, Creator Apply, Ads Plan, 로그인, 회원가입 히어로를
  하나의 경량 cinematic motion 시스템으로 연결했다.
- 공통 시스템은 외부 런타임 없이 `requestAnimationFrame`, CSS custom property,
  `transform`/`opacity`만 사용한다.
- 각 페이지는 포인터 깊이, 스크롤 진행, 촬영 프레임, 궤도, 필름 그레인을
  고유 톤으로 사용한다.
- Creator Apply에서 CSS만 존재하고 렌더링되지 않던 포스터 레일·입자·셰이드를
  실제 마크업에 연결했다.
- Creator 스크롤 진행 표시를 React state 재렌더 대신 rAF DOM 갱신으로 바꿨다.
- `prefers-reduced-motion`, coarse/touch pointer, 노치 safe-area를 처리했다.
- 인증 확인 화면에 항상 존재하는 H1을 추가해 스크린리더 문서 구조를 보완했다.
- 캐러셀 점 버튼과 푸터·출처 링크의 실제 터치 영역을 최소 24px로 넓혔다.
- 참고한 Codrops MIT 저장소와 라이선스는 `THIRD_PARTY_NOTICES.md`에 기록했다.

핵심 파일:

- `apps/web/src/components/motion/CinematicHeroMotion.tsx`
- `apps/web/src/styles/cinematic-motion.css`
- `apps/web/app/(main)/page.tsx`
- `apps/web/src/components/about/AboutIlogExperience.tsx`
- `apps/web/src/components/creator/CreatorApplicationExperience.tsx`
- `apps/web/app/ads-plan/page.tsx`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/signup/page.tsx`

## 4. 완료된 검증

- `pnpm gate:s2`: lint, typecheck, dependency-cruiser, Playwright 27개 수집,
  Prettier 모두 통과.
- `pnpm gate:contract`: OpenAPI, Prisma drift, error catalog, limits, deps,
  capacity, proxy, tokens, observability 9종 통과.
- 관련 UI·인증 테스트 12개 통과.
- 전체 Vitest에서 1,339개 통과. 로컬 Windows에 Docker 런타임이 없어
  Testcontainers 통합 스위트 11개만 시작되지 못했다.
- Next 프로덕션 빌드는 컴파일, 타입 검사, 정적 페이지 34개 생성까지 통과했다.
  마지막 standalone 파일 복사는 Windows symlink 권한 `EPERM`으로 종료된다.
  Linux CI 이미지 빌드를 최종 근거로 사용한다.
- 번들 예산: 모든 페이지 200KB gzip 이하 통과. 새 애니메이션 의존성 없음.
- 반응형 자동 검수 총 174개 조건:
  - iPhone SE/15 Pro/15 Pro Max, Galaxy S24/Fold, iPad mini/Pro
  - 휴대폰·Fold·iPad 가로 회전
  - 13/15/17인치 노트북, FHD, UHD, DCI 4K, 200% 확대 등가 뷰포트
  - `/`, `/about`, `/creator-apply`, `/ads-plan`, `/login`, `/signup`,
    `/verify`, `/search`, `/following`
  - HTTP 실패 0, 문서 가로 overflow 0, H1 잘림 0, 콘솔 오류 0
  - reduced-motion 스크롤 변수 0 고정 및 레일 애니메이션 비활성 확인
  - 로그인 키보드 포커스 순서·포커스 링 확인

## 5. 다음 계정의 작업지시

1. `git status --short`와 `git log -1 --oneline`으로 원격 동기화를 확인한다.
2. GitHub Actions에서 이 motion 커밋의 Linux 웹 이미지 빌드가 성공했는지 확인한다.
3. 사용자가 배포를 명시적으로 요청할 때만 **정확한 커밋 SHA**로 웹을 배포한다.
   이번 변경은 웹 전용이므로 worker 재배포는 필요 없다.
4. 배포 후 아래 경로를 데스크톱·모바일·reduced-motion에서 다시 확인한다.
   `/`, `/about`, `/creator-apply`, `/ads-plan`, `/login`, `/signup`, `/verify`.
5. 각 경로에서 200, overflow 0, 콘솔/네트워크 오류 0, CTA 클릭 가능,
   키보드 포커스, Creator 레일, 포인터·스크롤 반응을 확인한다.
6. 기존 운영 영상 재생 회귀도 확인한다. 플레이어가 실제로 재생되고 HLS master,
   variant manifest, segment가 모두 200이어야 한다.
7. 배포 SHA와 운영 컨테이너 이미지 digest/SHA가 일치하는지 확인한 후 종료한다.

## 6. 현재 운영 기준과 주의점

- 이 문서 작성 직전 운영에는 `ebf24ceffb69416781e8b032aa918bbba391edd7`가
  배포되어 있으며 health/ready와 기존 HLS 재생이 정상이다.
- 이번 cinematic motion 커밋은 문서 작성 시점에는 운영에 배포하지 않았다.
- `main` push의 GitHub workflow는 exhaustive gate job을 건너뛰고 image job을
  실행하는 현재 정책이 있으므로, 로컬 `gate:s2`·`gate:contract` 결과와 Linux 이미지
  성공을 함께 확인한다.
- 공개 랜딩의 정식 경로는 `/` 하나다. About·Creator·Ads를 랜딩 복제본으로 만들지 않는다.
- 레퍼런스 코드를 그대로 복사하거나 GSAP/Motion 같은 런타임을 추가하지 않는다.
  현재의 무의존성·200KB 번들 예산·reduced-motion 계약을 유지한다.

## 7. 완료 조건

- 원격 `main`과 로컬 HEAD 일치
- CI Linux 웹 이미지 성공
- 요청 시 정확한 SHA 운영 배포 및 health/ready 200
- 공개 7개 경로의 실사이트 반응형·접근성·콘솔 검수 성공
- 운영 HLS 재생 회귀 성공
- `ohhanbin_opt.mp4`가 그대로 로컬에 있고 Git에는 포함되지 않음
