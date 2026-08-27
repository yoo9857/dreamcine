import type { ReactNode } from 'react'

import type { JsonLdDocument } from '@/src/lib/seo/json-ld'

/**
 * 구조화 데이터를 `<script type="application/ld+json">` 으로 심는다.
 *
 * `<` 를 유니코드 이스케이프하는 이유: JSON 문자열 안의 `</script>` 는
 * 브라우저가 스크립트 종료로 읽는다. 크리에이터가 제목이나 설명에 넣은
 * 문자열이 그대로 태그를 닫으면 이후 마크업이 스크립트 밖으로 새어나온다.
 * `JSON.stringify` 는 이것을 막아주지 않는다.
 */
export function JsonLd({
  document,
}: {
  readonly document: JsonLdDocument
}): ReactNode {
  const json = JSON.stringify(document).replaceAll('<', '\\u003c')
  return (
    <script
      type="application/ld+json"
      // 위에서 `<` 를 제거했으므로 태그가 닫힐 수 없다.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
