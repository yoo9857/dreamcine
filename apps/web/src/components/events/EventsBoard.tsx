'use client'

import { useMemo, useState, type ReactNode } from 'react'

type Category = '전체' | '공모전' | '이벤트' | '워크숍'
interface EventItem {
  id: string
  category: Exclude<Category, '전체'>
  title: string
  description: string
  organizer: string
  deadline: string
  dday: string
  accent: string
  image?: string
}

const EVENTS: readonly EventItem[] = [
  {
    id: '1',
    category: '공모전',
    title: 'AI 미디어 창작자 모집',
    description: '당신의 스토리가 세상을 움직이는 콘텐츠가 됩니다.',
    organizer: 'iLog × CinePixo',
    deadline: '2026. 10. 18',
    dday: 'D-51',
    accent: 'var(--event-coral)',
    image: '/brand/event.png',
  },
  {
    id: '2',
    category: '공모전',
    title: '60초 세로영상 챌린지',
    description: '짧고 강렬한 한 장면을 세로 화면에 담아보세요.',
    organizer: 'iLog Shorts',
    deadline: '2026. 09. 30',
    dday: 'D-33',
    accent: 'var(--event-violet)',
  },
  {
    id: '3',
    category: '이벤트',
    title: '나의 첫 시리즈, 첫 공개',
    description: '새 시리즈를 공개하고 관객들의 응원을 받아보세요.',
    organizer: 'iLog',
    deadline: '2026. 09. 12',
    dday: 'D-15',
    accent: 'var(--event-orange)',
  },
  {
    id: '4',
    category: '워크숍',
    title: '스토리텔링 랩 : 장면을 쓰는 법',
    description: '현업 크리에이터와 한 장면의 시작과 끝을 설계합니다.',
    organizer: 'iLog Creator Lab',
    deadline: '2026. 09. 06',
    dday: '마감 임박',
    accent: 'var(--event-cyan)',
  },
  {
    id: '5',
    category: '이벤트',
    title: '크리에이터 커넥트 : 부산',
    description: '만들고 있는 이야기를 들고 와 서로의 다음 장면을 만나보세요.',
    organizer: 'iLog Community',
    deadline: '2026. 09. 20',
    dday: 'D-23',
    accent: 'var(--event-green)',
  },
]

export function EventsBoard(): ReactNode {
  const [category, setCategory] = useState<Category>('전체')
  const featured = EVENTS[0]
  if (!featured) return null
  const visible = useMemo(() => {
    const filtered =
      category === '전체'
        ? EVENTS.slice(1)
        : EVENTS.filter(
            (event) => event.category === category && event.id !== featured.id,
          )
    return [...filtered].sort((a, b) => b.deadline.localeCompare(a.deadline))
  }, [category, featured.id])
  return (
    <section className="events-board events-board-modern">
      <div className="events-marquee" aria-label="영상 미디어 AI 제휴 브랜드">
        <div className="events-marquee-track">
          {[
            ['ChatGPT', 'openai'],
            ['Claude', 'anthropic'],
            ['Midjourney', 'midjourney'],
            ['Gemini', 'googlegemini'],
            ['Seedance', 'bytedance'],
            ['Higgsfield', 'higgsfield'],
            ['Runway', 'runway'],
            ['Pika', 'pika'],
            ['ChatGPT', 'openai'],
            ['Claude', 'anthropic'],
            ['Midjourney', 'midjourney'],
            ['Gemini', 'googlegemini'],
            ['Seedance', 'bytedance'],
            ['Higgsfield', 'higgsfield'],
            ['Runway', 'runway'],
            ['Pika', 'pika'],
          ].map(([brand], index) => (
            <span
              className="events-brand"
              key={`${String(brand)}-${String(index)}`}
            >
              <b aria-hidden="true">
                {String(brand).slice(0, 2).toUpperCase()}
              </b>
              {String(brand)}
            </span>
          ))}
        </div>
      </div>
      <article
        className="events-feature-modern"
        style={{ '--event-accent': featured.accent } as React.CSSProperties}
      >
        <div className="events-feature-modern-image">
          <img src={featured.image ?? ''} alt="AI 미디어 창작자 모집 공모전" />
        </div>
        <div className="events-feature-modern-copy">
          <div className="event-card-top">
            <span className="event-category">{featured.category}</span>
            <span className="event-deadline">{featured.dday}</span>
          </div>
          <p className="events-feature-kicker">CO-HOSTED BY ILOG × CINEPIXO</p>
          <h2>{featured.title}</h2>
          <p>{featured.description}</p>
          <div className="events-card-line">
            <span>{featured.deadline} 마감</span>
            <span>{featured.organizer}</span>
          </div>
          <a href="/creator-apply">
            지금 지원하기 <span aria-hidden="true">↗</span>
          </a>
        </div>
      </article>
      <div className="events-list-head events-modern-list-head">
        <div>
          <p className="events-eyebrow">OPEN CALLS &amp; MORE</p>
          <h2>지금 참여할 수 있어요</h2>
        </div>
        <div className="events-tabs" role="tablist" aria-label="이벤트 종류">
          {(['전체', '공모전', '이벤트', '워크숍'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={category === item}
              className={category === item ? 'is-active' : ''}
              onClick={() => {
                setCategory(item)
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="events-grid events-modern-grid">
        {visible.map((event) => (
          <article
            className="event-card event-card-modern"
            key={event.id}
            style={{ '--event-accent': event.accent } as React.CSSProperties}
          >
            <div className="event-card-top">
              <span className="event-category">{event.category}</span>
              <span className="event-deadline">{event.dday}</span>
            </div>
            <div className="event-art">
              <span>
                {event.category === '공모전'
                  ? '✦'
                  : event.category === '워크숍'
                    ? '◌'
                    : '＋'}
              </span>
            </div>
            <h3>{event.title}</h3>
            <p>{event.description}</p>
            <div className="event-card-meta">
              <span>{event.organizer}</span>
              <strong>{event.deadline}</strong>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
