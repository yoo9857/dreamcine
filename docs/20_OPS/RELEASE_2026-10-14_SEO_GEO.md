# ilog SEO · GEO · OG release — 2026-10-14

승인 슬로건: **창작은 자유롭게. 감상은 즐겁게.** ImageGen 전용 원화와 기존 ilog 로고를 CLI로 합성했다. 로고는 잘리지 않도록 전체 원본을 사용한다. 탈락 시안·이전 슬로건·변형 생성 옵션은 삭제했다.

## 최종 산출물

- 실제 OG: `apps/web/app/opengraph-image.png`, 1200×630, 296,443 bytes.
- SHA-256: `4b698c4d662d1117971deac1e81b45280b9ddd4450d72cfabdb2920ece7c2ea3`.
- 공유 URL: `/opengraph-image.png?v=4b698c4d662d`. CLI가 내용에 따라 캐시 버전을 갱신한다.
- 원화·서체·라이선스·생성 프롬프트: `apps/web/scripts/assets/og/`.
- 재생성: `corepack pnpm --filter @aidream/web og:generate`.
- 최종 마스터·320px 미리보기: `output/og/`.
- 측정 원본: `output/quality/ilog-seo.report.html` 및 `.json`.

## 개선

| 영역 | 결과 |
| --- | --- |
| 홈·브랜드 | 홈을 회원용 로딩 경계에서 분리해 JS 없이도 소개·FAQ·공개 링크를 읽을 수 있다. 승인 슬로건을 홈과 OG에 일치시켰다. |
| 공개 메타데이터 | 홈·작품·크리에이터·소개·모집 페이지의 canonical·OG·X 카드·브랜드 데이터를 공통 모듈에서 관리한다. |
| URL·색인 정책 | APP_URL과 내부 경로를 검증한다. 외부 canonical을 거부하고 인증·개인·검색·미리보기 화면 및 리다이렉트에 noindex를 제공한다. |
| 사이트맵 | 요청 시 생성하고 성공한 공개 목록만 구간별 1시간 캐시한다. 장애 대체 응답은 캐시 밖에서 만든다. 빌드 시 DB가 없어도 빈 목록이 배포물에 고정되지 않는다. |
| 공개 상태 | 초안·숨김·예약·비공개 작품과 비공개·삭제된 부모 시리즈를 메타데이터와 JSON-LD에서 제외한다. |
| 시리즈·영상 | 공개된 회차만 구조화 데이터에 포함한다. 실제 썸네일·공개일만 사용하며 존재하지 않는 embed URL과 공식 심의기관으로 오인될 등급 접두사를 제거했다. |
| 정보 정확성 | 번역 본문이 없는 hreflang, 가짜 lastModified, 중복 canonical URL을 제거했다. |
| OG 응답 | 정적 PNG를 제공한다. 요청 시 외부 API·폰트 다운로드·이미지 렌더링이 필요 없다. 파일·manifest·alt text 일치와 URL 버전을 검사한다. |

## 검증

- 관련 단위 검사 **52개 통과**: 공개 상태, DB 장애 복구, 사이트맵, JSON-LD 이스케이프, OG 해시·버전 일치.
- SEO E2E **5개 통과**: 서버 HTML, robots, private redirect, 실제 OG PNG의 치수·해시, 390/1440px JS 없는 화면.
- Lighthouse 12.6.1 로컬 홈 **SEO 100/100**. 첫 실행은 개발 서버의 robots 첫 컴파일 지연으로 92점이었고, 응답 확인 후 최종 측정에서 100점을 확인했다.
- TypeScript와 변경 범위 ESLint 통과. 전체 정적 검사는 SEO 변경만 담은 릴리스 체크아웃에서 수행한다.
- Windows standalone 패키징은 심볼릭 링크 권한으로 실패했다. 코드 컴파일·타입 검사·정적 페이지 생성은 통과했으며 지정 Node 22/Linux CI에서 배포 패키지를 생성한다.
- 로컬 환경은 Node 24.16.0이다. 전체 DB 통합·전체 E2E·부하 검사를 수행했다는 뜻은 아니다.

함께 작업 중인 워커·미디어·DB 성능 변경은 이번 릴리스에 포함하지 않는다. 이 변경 자체에는 새 DB 스키마·인증 권한·앱 의존성 변경이 없다.

## 운영·유지보수

- DB 일부 장애에서는 정상 사이트맵 구간과 정적 경로를 제공하고 구간명만 warn 로그로 남긴다. 원본 예외·연결 문자열을 로그에 싣지 않는다.
- 구간 한도는 에피소드 20,000 / 시리즈 5,000 / 크리에이터 5,000 / 태그 500이다. 도달 시 경고하고 분할 사이트맵으로 확장한다.
- CLI가 텍스트 안전 여백·1200×630 치수·600 KB 용량을 검사한다. 잘못된 manifest나 이미지 버전은 테스트에서 실패한다.
- 웹만 배포하고 워커·스케줄러는 재시작하지 않는다. readiness, OG 해시·메타태그, robots·사이트맵을 운영에서 확인한다.
- Search Console·Bing Webmaster Tools·네이버 서치어드바이저의 소유권과 사이트맵 제출은 실제 소유 계정에서 확인해야 한다. 등록 완료나 검색 순위를 주장하지 않는다.
- 탈락 이미지와 임시 원화 준비 파일은 삭제했다. 자동 승인 검토가 `.tmp/seo-tools`의 재귀 삭제를 정책상 차단해 해당 분석 도구 폴더만 로컬에 남는다. Git·배포물에 포함하지 않는다.

SEO 점수는 검색 순위·AI 답변 인용률·디자인 점수를 보장하지 않는다. 구현 근거: [Next.js 15 connection](https://nextjs.org/docs/15/app/api-reference/functions/connection), [Next.js 15 Data Cache](https://nextjs.org/docs/15/app/api-reference/functions/unstable_cache), [Google 사이트맵](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Google AI 검색](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
