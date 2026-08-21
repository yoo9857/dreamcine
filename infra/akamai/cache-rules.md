# Akamai 캐시 규칙

이 파일과 `cache-rules.json`은 `docs/00_SPEC/01_ARCHITECTURE.md` §6의
불변 캐시 계약이다. Property Manager에서 규칙 순서를 아래와 같이 유지한다.

| 우선순위 | 경로               | Cache-Control                                     | 비고                     |
| -------: | ------------------ | ------------------------------------------------- | ------------------------ |
|        1 | `/api/**`          | `no-store`                                        | 인증·동적 응답 캐시 금지 |
|        2 | `/hls/**`          | `public, max-age=31536000, immutable`             | assetId URL 재사용 금지  |
|        3 | `/thumbs/**`       | `public, max-age=31536000, immutable`             | assetId URL 재사용 금지  |
|        4 | `/_next/static/**` | `public, max-age=31536000, immutable`             | 빌드 해시 기반           |
|        5 | 공개 시리즈 페이지 | `public, s-maxage=60, stale-while-revalidate=300` | 앱 응답 헤더 존중        |
|        6 | 그 외 SSR 페이지   | `private, no-cache`                               | 공유 캐시 금지           |

오리진은 Linode Object Storage `jp-osa`의 HLS·썸네일 버킷으로 지정하고,
원본 버킷 `aidream-originals`는 CDN 오리진에 연결하지 않는다. 적용 전후에
Property Manager 버전과 활성화 네트워크를 기록하고 `curl -I`로 헤더를 검증한다.
