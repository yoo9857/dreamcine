'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react'
import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react'

import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'
import { CinematicHeroMotion } from '@/src/components/motion/CinematicHeroMotion'

import styles from './about-ilog.module.css'

const heroRailA = [
  { src: '/brand/profiles/james-cameron.jpg', label: 'FILMMAKER' },
  { src: '/brand/posters/memory.png', label: 'AI DRAMA' },
  { src: '/brand/profiles/paul-trillo.jpg', label: 'DIRECTOR' },
] as const

const heroRailB = [
  { src: '/brand/posters/city.png', label: 'NEW WORLD' },
  { src: '/brand/profiles/nik-kleverov.webp', label: 'CREATIVE' },
  { src: '/brand/posters/moon-letter.png', label: 'STORY' },
] as const

const perspectives = [
  {
    src: '/brand/profiles/james-cameron.jpg',
    name: 'JAMES CAMERON',
    role: 'FILMMAKER · EXPERIMENT',
    line: '제약에서 한발 벗어나 더 대담하게 구상하고 실험하는 가능성.',
  },
  {
    src: '/brand/profiles/paul-trillo.jpg',
    name: 'PAUL TRILLO',
    role: 'DIRECTOR · TECHNOLOGY',
    line: '도구의 새로움보다 이전에는 불가능했던 장면과 서사의 확장.',
  },
  {
    src: '/brand/profiles/cristobal-valenzuela.jpeg',
    name: 'CRISTÓBAL VALENZUELA',
    role: 'STUDIO · PRODUCTION',
    line: 'AI를 창작자의 흐름을 보강하고 이야기를 현실화하는 매체로.',
  },
] as const

const works = [
  {
    src: '/brand/posters/memory.png',
    number: '01',
    title: '기억의 온도',
    genre: 'AI DRAMA',
    className: styles.workTall,
  },
  {
    src: '/brand/posters/city.png',
    number: '02',
    title: '도시의 잔상',
    genre: 'SCI-FI',
    className: styles.workWide,
  },
  {
    src: '/brand/posters/moon-letter.png',
    number: '03',
    title: '달에게 쓴 편지',
    genre: 'FANTASY',
    className: styles.workOffset,
  },
] as const

function PortraitRail({
  items,
  reverse = false,
}: {
  items: typeof heroRailA | typeof heroRailB
  reverse?: boolean
}) {
  return (
    <div className={styles.railWindow}>
      <div className={reverse ? styles.railReverse : styles.rail}>
        {[...items, ...items].map((item, index) => (
          <figure key={`${item.src}-${String(index)}`}>
            <Image
              src={item.src}
              alt=""
              fill
              sizes="(max-width: 720px) 34vw, 15vw"
            />
            <figcaption>{item.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

function Marquee() {
  const words = ['WATCH', 'CREATE', 'CONNECT', 'STAY CURIOUS']
  return (
    <div className={styles.marquee} aria-hidden="true">
      <div>
        {[...words, ...words].map((word, index) => (
          <span key={`${word}-${String(index)}`}>
            {word}
            <i />
          </span>
        ))}
      </div>
    </div>
  )
}

export function AboutIlogExperience() {
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('[data-about-reveal]')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach((item) => {
        item.setAttribute('data-visible', 'true')
      })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-visible', 'true')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    )
    items.forEach((item) => {
      observer.observe(item)
    })
    return () => {
      observer.disconnect()
    }
  }, [])

  function moveHero(event: PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    event.currentTarget.style.setProperty('--pointer-x', x.toFixed(3))
    event.currentTarget.style.setProperty('--pointer-y', y.toFixed(3))
  }

  return (
    <main className={styles.page} id="about-ilog-page">
      <style>{`body:has(#about-ilog-page) .aidream-theme-control { display: none; }`}</style>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="ilog 홈">
          <LeftBrandLogo priority />
        </Link>
        <nav aria-label="About 페이지">
          <a href="#about">ABOUT</a>
          <a href="#perspectives">PEOPLE</a>
          <a href="#works">WORKS</a>
          <Link href="/creator-apply">CREATOR CALL</Link>
        </nav>
        <Link href="/creator-apply" className={styles.headerCta}>
          JOIN US <ArrowUpRight size={15} />
        </Link>
      </header>

      <section
        ref={heroRef}
        className={styles.hero}
        data-cinematic-hero
        onPointerMove={moveHero}
        onPointerLeave={() => {
          heroRef.current?.style.setProperty('--pointer-x', '0')
          heroRef.current?.style.setProperty('--pointer-y', '0')
        }}
        aria-labelledby="about-hero-title"
      >
        <CinematicHeroMotion
          chapter="01 / MANIFESTO"
          label="PEOPLE MAKE STORIES"
          tone="silver"
        />
        <div className={styles.stars} aria-hidden="true" />
        <div className={styles.heroRails} aria-hidden="true">
          <PortraitRail items={heroRailA} />
          <PortraitRail items={heroRailB} reverse />
        </div>
        <div className={styles.heroCopy}>
          <p>ILOG · WATCH · CREATE · CONNECT</p>
          <h1 id="about-hero-title">
            STORIES
            <br />
            <span>NEED PEOPLE.</span>
          </h1>
          <p className={styles.heroLead}>
            이야기는 기술만으로 완성되지 않습니다. 발견하는 사람, 만드는 사람,
            마음에 남은 장면을 건네는 사람이 만날 때 비로소 다음 이야기가
            시작됩니다.
          </p>
          <div className={styles.heroActions}>
            <Link href="/creator-apply">
              크리에이터로 함께하기 <ArrowRight size={17} />
            </Link>
            <a href="#about">
              <ArrowDown size={16} /> 우리의 이야기
            </a>
          </div>
        </div>
        <span className={styles.coordinates}>
          SEOUL · 37.5665° N / 126.9780° E
        </span>
      </section>

      <div className={styles.surface}>
        <section
          className={styles.intro}
          id="about"
          aria-labelledby="about-title"
          data-about-reveal
        >
          <div className={styles.indexTitle}>
            <span>[001]</span>
            <h2 id="about-title">ABOUT</h2>
          </div>
          <div className={styles.introCopy}>
            <p>
              우리는 <em>보는 사람과 만드는 사람</em> 사이의 거리를 줄여, 좋은
              이야기가 한 번의 재생으로 끝나지 않는 환경을 만듭니다.
            </p>
            <div>
              <p>
                ilog는 AI 드라마와 AI 영화를 발견하고 감상하고 공개하는 흐름을
                하나의 공간으로 연결합니다.
              </p>
              <p>
                작품은 반응을 만나 다음 에피소드가 되고, 관객은 취향을 통해
                새로운 창작자를 발견합니다.
              </p>
            </div>
          </div>
        </section>

        <Marquee />

        <section
          className={styles.people}
          id="perspectives"
          aria-labelledby="people-title"
          data-about-reveal
        >
          <div className={styles.sectionHead}>
            <span>[002] PEOPLE / PERSPECTIVES</span>
            <h2 id="people-title">새로운 매체를 바라보는 시선.</h2>
            <p>
              ilog가 주목하는 것은 도구의 유행이 아니라, 창작자가 더 멀리 상상할
              수 있게 된 변화입니다.
            </p>
          </div>
          <div className={styles.peopleBoard}>
            <span className={styles.axisX}>X / 1920</span>
            <span className={styles.axisY}>Y / STORY</span>
            {perspectives.map((person, index) => (
              <article
                className={styles.personCard}
                key={person.name}
                style={{ '--order': index } as CSSProperties}
              >
                <div className={styles.personImage}>
                  <Image
                    src={person.src}
                    alt={person.name}
                    fill
                    sizes="(max-width: 720px) 70vw, 23vw"
                  />
                  <span>0{index + 1}</span>
                </div>
                <div className={styles.personInfo}>
                  <p>{person.role}</p>
                  <h3>{person.name}</h3>
                  <blockquote>“{person.line}”</blockquote>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.disclaimer}>
            인물은 ilog 참여자가 아닌, AI 영상에 관한 공개 발언을 소개하는 업계
            인사입니다.
          </p>
        </section>

        <Marquee />

        <section
          className={styles.works}
          id="works"
          aria-labelledby="works-title"
          data-about-reveal
        >
          <div className={styles.worksIntro}>
            <span>[003]</span>
            <h2 id="works-title">WORKS</h2>
            <p>
              아이디어가 장면이 되고, 장면이 세계가 되는 과정을 프레임으로
              기록합니다.
            </p>
          </div>
          <div className={styles.workBoard}>
            <span className={styles.cropMark}>+</span>
            {works.map((work, index) => (
              <article
                className={[styles.workCard, work.className]
                  .filter(Boolean)
                  .join(' ')}
                key={work.title}
                data-about-reveal
                style={{ '--order': index } as CSSProperties}
              >
                <div>
                  <Image
                    src={work.src}
                    alt={`${work.title} 작품 이미지`}
                    fill
                    sizes="(max-width: 720px) 88vw, 46vw"
                  />
                  <span>{work.number}</span>
                </div>
                <footer>
                  <p>{work.genre} · ILOG PREVIEW</p>
                  <h3>{work.title}</h3>
                </footer>
              </article>
            ))}
          </div>
        </section>

        <section
          className={styles.flow}
          aria-labelledby="flow-title"
          data-about-reveal
        >
          <div>
            <span>[004] ONE CONTINUOUS FLOW</span>
            <h2 id="flow-title">발견에서 공개까지.</h2>
          </div>
          <ol>
            <li>
              <span>01</span>
              <h3>DISCOVER</h3>
              <p>취향에 맞는 새로운 이야기와 창작자를 만납니다.</p>
            </li>
            <li>
              <span>02</span>
              <h3>REACT</h3>
              <p>좋아요와 리뷰로 마음에 남은 장면을 이어갑니다.</p>
            </li>
            <li>
              <span>03</span>
              <h3>CREATE</h3>
              <p>나만의 작품을 공개하고 다음 관객을 만납니다.</p>
            </li>
          </ol>
        </section>

        <section className={styles.finalCta} data-about-reveal>
          <p>ILOG CREATOR CALL · 2026</p>
          <h2>
            아직 없는 이야기를
            <br />
            당신의 장면으로.
          </h2>
          <Link href="/creator-apply">
            크리에이터 모집 보기 <ArrowUpRight />
          </Link>
        </section>

        <footer className={styles.footer}>
          <Link href="/" aria-label="ilog 홈">
            <LeftBrandLogo />
          </Link>
          <p>© 2026 ILOG. STORIES NEED PEOPLE.</p>
          <div>
            <Link href="/">HOME</Link>
            <Link href="/creator-apply">CREATOR CALL</Link>
          </div>
        </footer>
      </div>
    </main>
  )
}
