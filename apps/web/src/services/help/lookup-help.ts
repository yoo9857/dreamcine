import { lookupHelpCatalog } from '@aidream/db'

import { getLogger } from '@/src/lib/logger'
import {
  HIGGSFIELD_FILMS,
  higgsfieldWatchPath,
  formatFilmDuration,
} from '@/src/content/higgsfield'
import type { HelpAnswer, HelpChatInput } from './answer-help'
import { matchServiceHelpEntry } from '@/src/content/help-intent'

export function catalogLookupMessage(input: HelpChatInput): string {
  if (!/^(?:그|이|해당)\s?(?:작가|작품|영화|영상|거)/.test(input.message))
    return input.message
  for (const turn of [...(input.history ?? [])].reverse()) {
    if (turn.role !== 'user') continue
    const subject = catalogQuestion(turn.content)
    if (subject !== null) return `“${subject}” ${input.message}`
  }
  return input.message
}

export function answerPartnerQuestion(message: string): HelpAnswer | null {
  const film = HIGGSFIELD_FILMS.find((item) =>
    message.toLowerCase().includes(item.title.toLowerCase()),
  )
  if (film === undefined) return null
  return {
    answer: `${film.title}\n원작 크레딧: ${film.credit}\n상영시간: ${formatFilmDuration(film.durationSec)}\n소개: ${film.logline}\nHiggsfield 출품작 소개이며, 원작 링크는 재생 화면에서 확인할 수 있습니다.`,
    href: higgsfieldWatchPath(film.slug),
    linkLabel: `${film.title} 보기`,
    source: 'guide',
  }
}

export function catalogQuestion(message: string): string | null {
  if (matchServiceHelpEntry(message) !== null) return null
  if (
    !/작품|영상|영화|드라마|작가|감독|크리에이터|["“‘']|^@/.test(message) &&
    /[?]|알려|어떻게|방법|해주세요|시세/.test(message)
  )
    return null
  if (
    /@\S+\.\S+|\d{3}[- ]?\d{3,4}[- ]?\d{4}|비밀번호|인증|접수|지원서|결제|환불/.test(
      message,
    )
  )
    return null
  const quoted = /["“‘']([^"”’']{2,80})["”’']/.exec(message)?.[1]
  const query = (
    quoted ??
    message
      .replace(
        /(?:작가|감독|크리에이터|작품|영상|영화|드라마)(?:님|의|은|는|이|가|을|를)?/g,
        ' ',
      )
      .replace(
        /(?:누가|누구|어떤|어디서|어디|무슨|있나요|있어요|인가요|예요|에요|알려\s?줘|알려주세요|소개해\s?줘|소개|추천해\s?줘|추천|만들었|만든|찾아\s?줘|찾아주세요|보여\s?줘|보고\s?싶|볼\s?수|줄거리|내용|에 대해|대해서|대한)/g,
        ' ',
      )
      .replace(/[?!.,@]/g, ' ')
      .replace(
        /(?:^|\s)(?:야|요|줘|나요|주세요|목록|다른|의|은|는)(?=\s|$)/g,
        ' ',
      )
  )
    .trim()
    .replace(/(?:은|는|을|를|의)$/, '')
    .trim()
    .replace(/\s+/g, ' ')
  if (
    query.length < 2 ||
    query.length > 80 ||
    /^(?:ilog|아이로그|어떻게|방법|목록|최신|인기|모든|전체|해주세요)$/i.test(
      query,
    )
  )
    return null
  return query
}

export async function lookupHelpQuestion(
  message: string,
  viewerId?: string,
  lookup = lookupHelpCatalog,
): Promise<HelpAnswer | null> {
  const query = catalogQuestion(message)
  if (query === null) return null
  try {
    const catalog = await lookup(query, viewerId)
    const candidates = [
      ...catalog.works.map((work) => ({
        href: `/series/${encodeURIComponent(work.id)}`,
        label: work.title,
      })),
      ...catalog.creators.map((creator) => ({
        href: `/u/${encodeURIComponent(creator.handle)}`,
        label: `${creator.displayName} 작가`,
      })),
      ...catalog.works.map((work) => ({
        href: `/u/${encodeURIComponent(work.owner.handle)}`,
        label: `${work.owner.displayName} 작가`,
      })),
    ]
    const links = candidates
      .filter(
        (link, index) =>
          candidates.findIndex((candidate) => candidate.href === link.href) ===
          index,
      )
      .slice(0, 6)
    if (links.length === 0)
      return {
        answer: `“${query}”에 해당하는 공개 작품·작가를 찾지 못했어요. 정확한 작품 제목이나 작가 이름을 알려 주세요. 비공개 정보는 안내하지 않습니다.`,
        href: '/search',
        linkLabel: '직접 검색하기',
        source: 'catalog',
      }
    const lines = [
      `“${query}”로 찾은 공개 정보입니다. 여러 결과가 있으면 아래에서 선택해 주세요.`,
      ...catalog.works.map(
        (work) =>
          `작품: ${work.title}\n등록 작가: ${work.owner.displayName} (@${work.owner.handle})${work.synopsis === null ? '' : `\n소개: ${work.synopsis.slice(0, 180)}`}`,
      ),
      ...catalog.creators.map(
        (creator) =>
          `작가: ${creator.displayName} (@${creator.handle})${creator.bio === null ? '' : `\n소개: ${creator.bio.slice(0, 120)}`}`,
      ),
    ]
    return {
      answer: lines.join('\n\n').slice(0, 1800),
      href: null,
      linkLabel: null,
      links,
      source: 'catalog',
    }
  } catch (error: unknown) {
    getLogger().warn(
      { reason: error instanceof Error ? error.name : 'unknown' },
      'help catalog lookup unavailable',
    )
    return {
      answer:
        '지금 작품·작가 정보를 조회하지 못했어요. 잠시 후 다시 질문하거나 검색 화면을 이용해 주세요.',
      href: '/search',
      linkLabel: '검색하기',
      source: 'guide',
    }
  }
}
