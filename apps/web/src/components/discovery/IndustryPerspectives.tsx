'use client'

import { ExternalLink, Pause, Play } from 'lucide-react'
import Image from 'next/image'
import { useState, type ReactNode } from 'react'

interface Perspective {
  readonly category: string
  readonly image: string
  readonly name: string
  readonly role: string
  readonly summary: string
  readonly source: string
  readonly sourceLabel: string
}

const perspectives: readonly Perspective[] = [
  {
    category: 'DIRECTOR · TECHNOLOGY',
    image: '/brand/profiles/james-cameron.jpg',
    name: 'James Cameron',
    role: '영화감독 · Lightstorm 회장',
    summary:
      '생성형 AI와 CGI의 결합을 다음 물결로 보며, 창작자가 이전에는 상상하기 어려웠던 방식으로 이야기를 전할 가능성에 주목했습니다.',
    source:
      'https://stability.ai/news-updates/james-cameron-joins-stability-ai-board-of-directors',
    sourceLabel: 'Stability AI · 2024',
  },
  {
    category: 'FILMMAKER · EXPERIMENT',
    image: '/brand/profiles/paul-trillo.jpg',
    name: 'Paul Trillo',
    role: '영화감독 · ArtClass',
    summary:
      '시간과 예산, 허가의 제약에서 한발 벗어나 더 대담하게 구상하고 실험할 수 있다는 점을 AI 영상의 가장 큰 가능성으로 봤습니다.',
    source: 'https://openai.com/index/sora-first-impressions/',
    sourceLabel: 'OpenAI · 2024',
  },
  {
    category: 'STUDIO · INVESTMENT',
    image: '/brand/profiles/michael-burns.jpg',
    name: 'Michael Burns',
    role: 'Lionsgate 부회장',
    summary:
      'AI를 단순한 비용 절감 수단이 아니라 스토리텔링 역량을 넓히는 창작 파트너로 평가했습니다. Lionsgate는 2026년 Runway 지분 투자와 공동 IP 개발도 발표했습니다.',
    source:
      'https://runway.com/news/company-news/runway-and-lionsgate-expand-partnership',
    sourceLabel: 'Runway × Lionsgate · 2026',
  },
  {
    category: 'AI SHORT FILM',
    image: '/brand/profiles/walter-woodman.jpg',
    name: 'Walter Woodman · shy kids',
    role: '영화감독 · Air Head',
    summary:
      '현실을 닮게 만드는 능력보다 완전히 초현실적인 장면을 구현하고, 한때 불가능하다고 여긴 이야기를 확장하는 힘에 더 주목했습니다.',
    source: 'https://openai.com/index/sora-first-impressions/',
    sourceLabel: 'OpenAI · 2024',
  },
  {
    category: 'CREATIVE WORKFLOW',
    image: '/brand/profiles/nik-kleverov.webp',
    name: 'Nik Kleverov',
    role: 'Native Foreign 공동창업자 · 크리에이티브 디렉터',
    summary:
      '브랜드 영상의 콘셉트를 빠르게 시각화하고 반복 개선하면서, 예산의 한계가 창작 서사의 범위를 전부 결정하지 않게 된다고 평가했습니다.',
    source: 'https://openai.com/index/sora-first-impressions/',
    sourceLabel: 'OpenAI · 2024',
  },
  {
    category: 'STUDIO · PRODUCTION',
    image: '/brand/profiles/cristobal-valenzuela.jpeg',
    name: 'Cristóbal Valenzuela',
    role: 'Runway 공동창업자 · 공동 CEO',
    summary:
      'AI를 창작자의 작업 흐름을 보강하고 새로운 방식으로 이야기를 현실화하는 매체로 설명하며, 스튜디오와의 제작 협업 가능성을 강조했습니다.',
    source:
      'https://investors.lionsgate.com/news-events/news/news-details/2024/Runway-Partners-with-Lionsgate-in-First-of-its-Kind-AI-Collaboration/default.aspx',
    sourceLabel: 'Lionsgate · 2024',
  },
]

const columns = [
  perspectives.slice(0, 2),
  perspectives.slice(2, 4),
  perspectives.slice(4, 6),
] as const

function PerspectiveCard({ item }: { readonly item: Perspective }): ReactNode {
  return (
    <article className="guest-perspective-card">
      <span className="guest-perspective-category">{item.category}</span>
      <p>{item.summary}</p>
      <div className="guest-perspective-person">
        <Image src={item.image} alt="" width={40} height={40} />
        <div>
          <strong>{item.name}</strong>
          <small>{item.role}</small>
        </div>
      </div>
      <a href={item.source} target="_blank" rel="noreferrer">
        {item.sourceLabel}
        <ExternalLink size={12} aria-hidden="true" />
        <span className="sr-only"> 원문 새 창에서 열기</span>
      </a>
    </article>
  )
}

export function IndustryPerspectives(): ReactNode {
  const [paused, setPaused] = useState(false)

  return (
    <section
      className="guest-perspectives"
      aria-labelledby="guest-perspectives-title"
      data-paused={paused ? 'true' : 'false'}
    >
      <div className="guest-section-heading">
        <p>GLOBAL PERSPECTIVES ON AI CINEMA</p>
        <h2 id="guest-perspectives-title">
          세계의 창작자들은 AI 영화를 이렇게 보고 있습니다.
        </h2>
        <p>
          감독과 창작자, 글로벌 스튜디오가 공개적으로 밝힌 관점을 통해 AI
          드라마와 영화의 가능성을 살펴보세요.
        </p>
      </div>

      <div className="guest-perspective-toolbar">
        <p>
          <span aria-hidden="true">●</span> 아래 내용은 ilog 추천사가 아닌 공개
          발언과 공식 발표의 한국어 요약입니다.
        </p>
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => {
            setPaused((current) => !current)
          }}
        >
          {paused ? (
            <Play size={14} aria-hidden="true" />
          ) : (
            <Pause size={14} aria-hidden="true" />
          )}
          {paused ? '흐름 재생' : '잠시 멈춤'}
        </button>
      </div>

      <div className="guest-perspective-window">
        <div className="guest-perspective-columns">
          {columns.map((column, columnIndex) => (
            <div className="guest-perspective-column" key={columnIndex}>
              <div className="guest-perspective-track">
                <div className="guest-perspective-set">
                  {column.map((item) => (
                    <PerspectiveCard item={item} key={item.name} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
