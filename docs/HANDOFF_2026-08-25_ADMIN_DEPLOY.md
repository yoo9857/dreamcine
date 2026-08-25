# 2026-08-25 운영 배포·ADMIN 계정 인수인계

## 현재 결론

- 운영 주소: `https://ilog.info`
- 운영 배포 커밋: `2334758da90d69555ec2a9730977b501a926e6d2`
- 웹, 워커, 스케줄러가 위 SHA 이미지로 실행 중이며 모두 `healthy` 확인 완료
- `/api/health` 200, `/api/ready` 200 확인 완료
- ADMIN 계정 생성 및 실제 Credentials 로그인/세션 쿠키 발급 확인 완료
- 로컬 `main`과 `origin/main`은 작업 코드 커밋 `2334758`까지 일치한 상태에서 이 인수인계 문서를 추가함

## ADMIN 계정

| 항목 | 값 |
|---|---|
| 이메일 | `devoh@signpost.kr` |
| 핸들 | `devoh` |
| 역할 | `ADMIN` (현재 스키마의 최고 권한) |
| 상태 | `ACTIVE` |
| 이메일 인증 | 완료 |
| 로그인 검증 | HTTP 200, 세션 쿠키 발급 확인 |

임시 비밀번호는 저장소나 이 문서에 기록하지 않았다. 사용자에게 현재 대화에서만 전달한다.
사용자는 첫 로그인 직후 비밀번호를 변경해야 한다.

## 이번 운영 장애와 수정

증상:

- `aidream-worker-1`, `aidream-scheduler-1`이 재시작 루프
- 로그: `@prisma/client did not initialize yet`

원인:

- `infra/docker/worker.Dockerfile`의 빌드 단계에서는 Prisma Client를 생성했지만,
  런타임 단계가 생성 전 `deps` 스테이지의 `/app/node_modules`를 복사함

수정:

- 런타임이 생성 완료된 `build` 스테이지의 `/app/node_modules`를 복사하도록 변경
- 커밋: `2334758` (`T06/S3: ship generated Prisma client`)

검증:

- 커밋 훅: lint, typecheck, dependency-cruiser, Prettier 통과
- 전체 CI gate 및 E2E 22개 통과
- 웹·워커 이미지 빌드/게시 성공
- 재배포 후 웹·워커·스케줄러 모두 `healthy`
- 배포 후 최근 로그의 Prisma 초기화 오류 0건

## 실행 기록

- 수정 CI: https://github.com/yoo9857/dreamcine/actions/runs/32800088035
- 최종 배포: https://github.com/yoo9857/dreamcine/actions/runs/32800844455
- 최종 배포 결과: Deploy 성공, 외부 검증 성공

## 다음 에이전트 작업지시

1. 시작 즉시 `git fetch origin main` 후 로컬과 `origin/main` 일치 여부를 확인한다.
2. 운영 확인이 필요하면 `deploy@172.233.81.32`에 기존 배포 키로 접속하되 환경변수 값과 비밀정보를 출력하지 않는다.
3. `docker ps`에서 `aidream-web-1`, `aidream-worker-1`, `aidream-scheduler-1`이 계속 `healthy`인지 확인한다.
4. 이메일 미수신 문제는 아직 근본 해결하지 않았다. SMTP 관련 변수는 값이 아닌 설정 유무만 확인하고, 웹 로그의 메일 발송 실패 원인을 진단한다.
5. ADMIN 계정의 임시 비밀번호 변경 여부를 사용자에게 확인한다. 비밀번호를 문서나 커밋에 기록하지 않는다.
6. 이후 제품 개발은 `docs/HARNESS.md`, `docs/_EXECUTION_ORDER.md`, 해당 작업지시서의 S1→S2→S3 순서를 따른다.

## 주의사항

- 애플리케이션에는 `SUPER_ADMIN` enum이 없으며 최고 역할은 `ADMIN`이다.
- 문서 전용 커밋에는 컨테이너 이미지가 생성되지 않는다. 배포할 SHA에 실제 GHCR 웹/워커 이미지가 있는지 먼저 확인한다.
- 배포 시 워커 이미지를 생성하지 않은 SHA에 `deploy_worker=true`를 주면 사전 확인에서 실패한다.
