# 12. Global Expansion Contract

## 1. Status

ilog의 요금제 UI와 가입 진입점은 **global-ready** 구조를 사용한다. 이는 전 세계에서
즉시 판매 중이라는 뜻이 아니다. 현재 사용자에게 노출하도록 구성되고 QA된 조합은
다음 세 가지다.

| Variant | Public route | Language | Billing market | Currency |
| --- | --- | --- | --- | --- |
| `ko-KR` | `/ads-plan` | Korean | South Korea | KRW |
| `en-KR` | `/kr-en/ads-plan` | English | South Korea | KRW |
| `en-US` | `/en-us/ads-plan` | English | United States | USD |

새 국가는 아래 출시 계약을 모두 통과한 후 `PLAN_VARIANTS`에 등록해야 한다. 등록되지
않은 국가는 UI 선택기에 표시하거나 결제를 허용하지 않는다.

## 2. Non-negotiable architecture

- **Language is not market.** 영어 사용자가 반드시 미국 구매자인 것은 아니다.
- **Market owns price.** 가격은 실시간 환율로 자동 환산하지 않고 시장별로 승인한다.
- **Currency follows billing country.** 브라우저 언어만으로 통화를 바꾸지 않는다.
- **Geolocation is a suggestion.** IP 기반 국가는 선택을 추천할 수 있지만 강제하지 않는다.
- **The public URL is stable.** 각 언어·시장 조합은 canonical URL과 hreflang을 가진다.
- **Only configured variants are selectable.** 번역만 존재하는 미출시 국가는 노출하지 않는다.
- **Checkout revalidates the market.** 클라이언트 쿼리의 가격을 신뢰하지 않고 서버의
  상품·가격 ID와 결제 국가를 다시 확인한다.
- **Entitlements are market-independent.** 요금제 권한과 표시 가격은 별도 모델로 관리한다.

## 3. Source of truth

`apps/web/src/config/plan-markets.ts`가 공개 경로, 언어, 결제 국가, 통화, 가격, 세금
표시 방식을 소유한다. 카피 파일에는 시장 가격을 하드코딩하지 않는다.

국가 추가 시 필요한 최소 데이터:

1. BCP 47 언어 태그와 ISO 3166-1 결제 국가
2. ISO 4217 통화와 소수 자릿수
3. 승인된 월 가격 및 세금 포함/별도 표시 방식
4. canonical 경로와 hreflang
5. 현지 결제 상품/가격 ID
6. 이용약관, 개인정보 처리방침, 환불·해지 문구 버전
7. 콘텐츠 권리와 연령 등급 정책
8. 지원 결제수단과 고객지원 채널

## 4. Launch gates

다음 항목 중 하나라도 준비되지 않으면 해당 시장은 `PLAN_VARIANTS`에 등록하지 않는다.

- Legal: 현지 약관, 개인정보, 쿠키 동의, 소비자 보호 및 세금 검토
- Payments: 현지 통화 청구, 세금 계산, 영수증, 환불, 실패 복구, 강력한 고객 인증
- Content: 지역별 라이선스, 광고 인벤토리, 연령 등급, 키즈 프로필 정책
- Privacy: 데이터 보관 지역, 삭제/열람 요청, 동의 이력, 미성년자 처리
- Operations: 현지 시간대 고객지원, 장애 공지, 환율이 아닌 시장 가격 승인 절차
- Product: 번역 QA, 긴 문자열, RTL 후보, 키보드·스크린리더, 저속 네트워크
- Growth: 가격 실험 ID, 노출/가입/결제/유지 이벤트, 국가별 퍼널 대시보드
- SEO: canonical, hreflang, 구조화 데이터, 지역별 sitemap, 공유 메타 이미지

## 5. Pricing policy

- 가격은 minor-unit 안전성을 보장하는 결제 공급자 상품 ID와 매핑한다.
- UI의 가격은 안내이며 checkout 서버가 최종 금액·통화·세금을 결정한다.
- 국가별 구매력, 결제 수수료, 세금, 콘텐츠 원가, 광고 수익, 이탈률을 함께 검토한다.
- A/B 가격 실험은 기존 가입자의 가격을 조용히 변경하지 않으며 실험군을 기록한다.
- 미국 `$4.99`는 초기 획득 실험 기준가이며 CAC, LTV, 30/90일 유지율로 재평가한다.

## 6. Required analytics events

- `plan_page_viewed`: variant, region, language, experiment
- `region_selector_changed`: from, to
- `plan_cta_clicked`: placement, price, currency
- `signup_started`: variant, source
- `checkout_started`, `checkout_completed`, `checkout_failed`
- `subscription_renewed`, `subscription_cancelled`, `refund_completed`

이벤트에는 이메일, 이름, 전체 IP 같은 직접 식별자를 넣지 않는다.

## 7. Design requirements

- 320px부터 1600px 이상까지 레이아웃이 깨지지 않아야 한다.
- 번역 문자열이 35% 길어져도 CTA와 가격 카드가 겹치지 않아야 한다.
- 통화 기호와 가격은 locale-aware formatter를 사용한다.
- RTL 도입 시 DOM 순서를 바꾸지 않고 논리적 CSS 속성을 우선한다.
- 지역 선택기는 현재 시장을 명확히 표시하고 선택 결과를 예측 가능하게 유지한다.
- 세금 별도 시장은 가격 근처에 `Taxes may apply`와 같은 검토된 문구를 표시한다.

## 8. Known work before the next country

- 결제 공급자 product/price 카탈로그와 서버 검증 연결
- 국가별 법적 문서 버전 저장 및 동의 원장
- GeoIP 기반 **추천 전용** 지역 프롬프트
- 지역별 콘텐츠 이용 가능성/광고 정책 API
- ICU MessageFormat 또는 동등한 복수형·성별·날짜 번역 계층
- 번역 관리 시스템과 현지 원어민 승인 워크플로
- 지역별 sitemap 및 가격 구조화 데이터 생성
