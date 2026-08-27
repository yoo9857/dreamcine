# T17 — 가입 동의·연령 제한 운영 연결

## 진행 상태

- [x] S1 Spec — 2026-08-27 / OAuth 제외·자체 가입 유지 결정 반영
- [x] S2 Skeleton — 2026-08-27 / 정책·동의·수신거부·연령 판정 경계 확정
- [ ] S3 구현 — 로컬 정적/계약/단위 게이트 통과, Linux CI·운영 배포 확인 대기

## 1. 목적

가입 때 수집한 프로필과 동의 이력이 화면 장식으로 끝나지 않게 실제 정책 문서,
철회 경로, 마케팅 발송 필터, A19 서버 판정까지 연결한다. Google 등 OAuth는 도입하지
않고 ilog 자체 이메일 가입과 가입 후 인증 링크 방식을 유지한다.

## 2. 참조 스펙

- `00_SPEC/07_AUTH_SECURITY.md`
- `00_SPEC/14_SIGNUP_PROFILE_AND_CONSENT.md`
- `10_TASKS/T03_AUTH.md`
- `10_TASKS/T07_PLAYER_HLS.md`
- `10_TASKS/T15_METADATA_UPGRADE.md`
- `20_OPS/O01_DEPLOY.md`

## 3. 산출물 파일

| 경로 | 책임 | 단계 |
|---|---|---|
| `app/terms/page.tsx`, `app/privacy/page.tsx` | 버전이 표시되는 공개 정책 문서 | S3 |
| `app/(main)/account/page.tsx` | 동의 현황·철회 화면 | S3 |
| `app/api/account/consents/route.ts` | 로그인 회원 마케팅 동의 변경 | S3 |
| `app/api/marketing/unsubscribe/route.ts` | 서명 링크 수신거부·원클릭 POST | S3 |
| `src/lib/marketing-unsubscribe.ts` | HMAC 토큰 생성·만료·검증 | S3 |
| `src/services/marketing/recipients.ts` | 현재 동의 버전 발송 후보 필터 | S3 |
| `src/lib/mail.ts` | 발송 직전 재검사·List-Unsubscribe 헤더 | S3 |
| `src/services/episode/confirm-age.ts` | 저장된 생년월일 서버 조회 | S3 |
| `packages/core/src/rules/age-gate.ts` | 만 19세 생일 기준 판정 | S3 |
| `packages/db/src/repositories/user.repo.ts` | 동의 이력·후보·발송 직전 판정 | S3 |

## 4. S2 Skeleton

```ts
getConsentPreferences(userId): Promise<ConsentPreferences>
updateMarketingConsent(input): Promise<ConsentPreferences>
getMarketingRecipients(limit): Promise<readonly MarketingRecipient[]>
sendMarketingEventMail(input): Promise<boolean>
createMarketingUnsubscribeToken(input): string
verifyMarketingUnsubscribeToken(input): string | null
checkAgeGate({ viewer.birthDate, now, confirmed }): AgeGateResult
```

## 5. S3 구현 순서

1. 정책 버전을 단일 상수로 고정하고 가입 저장·문서·발송 필터가 공유한다.
2. 계정 화면에서 마케팅 동의 변경을 `UserConsent`에 즉시 반영한다.
3. 이메일 링크는 GET 확인 화면, POST 철회로 분리하고 HMAC·만료를 검증한다.
4. 캠페인 후보와 SMTP 직전 양쪽에서 동의를 검사한다.
5. A19 API의 `birthYear` 입력을 삭제하고 DB의 `User.birthDate`만 사용한다.
6. 정적·계약·단위·Linux CI를 통과한 SHA만 마이그레이션 후 배포한다.

## 6. 예외처리

| 상황 | 처리 |
|---|---|
| 변조·만료 수신거부 토큰 | `E_VALIDATION`, 동의 변경 없음 |
| 마케팅 동의 철회 후 발송 시도 | SMTP 호출 없이 `false` 반환 |
| A19 비로그인 | `E_AUTH_REQUIRED` |
| A19 생년월일 누락·미성년 | `E_PERM_AGE_RESTRICTED` |
| 정책/동의 저장 실패 | 공통 DB 오류, UI는 기존 상태 유지 |

## 7. 테스트

- 저장 생년월일의 만 19세 생일 경계, 비로그인, 누락 검증
- A19 요청 body에 출생연도가 포함되지 않음
- 수신거부 토큰 정상·변조·다른 키·만료 검증
- 최신 동의 행 판정과 철회 시 IP 원문 미저장 검증
- 가입 프로필·동의 이력 저장 회귀
- 정적 게이트, Prisma drift, 계약 게이트, 전체 비컨테이너 테스트

## 8. 완료 조건(DoD)

- [x] OAuth 공급자 추가 없음
- [x] `/terms`, `/privacy`, `/account#consents`, `/unsubscribe` 연결
- [x] 발송 후보 필터 + 발송 직전 동의 재검사
- [x] A19 자기신고 출생연도 제거
- [x] 로컬 `gate:static`, `gate:contract` 통과
- [x] 비컨테이너 테스트 1,715개 통과 (Testcontainers 11 suite는 Docker 부재)
- [ ] GitHub Actions Linux gate·이미지 게시 통과
- [ ] `20260827000000`·`010000`·`020000` 마이그레이션 운영 적용
- [ ] 운영 `/`, `/signup`, `/terms`, `/privacy`, `/api/health`, `/api/ready` 확인
- [ ] 출시 전 실제 약관·개인정보 처리방침 법률 검토
