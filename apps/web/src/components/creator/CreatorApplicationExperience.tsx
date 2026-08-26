'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  Clapperboard,
  Film,
  PenTool,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEffect, useState, type SyntheticEvent } from 'react'

import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'

import styles from './creator-application.module.css'

const tracks = [
  {
    value: 'DIRECTOR',
    number: '01',
    label: 'DIRECTOR',
    title: '연출 · 감독',
    description: '장면의 리듬과 세계의 톤을 설계하고 팀을 이끌어요.',
    icon: Clapperboard,
    image: '/brand/posters/memory.png',
  },
  {
    value: 'WRITER',
    number: '02',
    label: 'WRITER',
    title: '작가 · 스토리',
    description: '짧은 아이디어를 오래 남을 인물과 서사로 발전시켜요.',
    icon: PenTool,
    image: '/brand/posters/moon-letter.png',
  },
  {
    value: 'AI_VISUAL',
    number: '03',
    label: 'AI VISUAL',
    title: 'AI 비주얼 아티스트',
    description: '새로운 도구로 이전에 없던 이미지와 움직임을 만들어요.',
    icon: Sparkles,
    image: '/brand/posters/city.png',
  },
  {
    value: 'PRODUCER',
    number: '04',
    label: 'PRODUCER',
    title: '프로듀서 · 사운드',
    description: '좋은 작품이 완성되고 관객을 만나도록 제작을 연결해요.',
    icon: Film,
    image: '/brand/posters/last-frame.png',
  },
] as const

const process = [
  ['01', '지원서 접수', '포트폴리오와 만들고 싶은 이야기를 들려주세요.'],
  ['02', '작품 리뷰', '형식보다 관점, 완성도보다 성장 가능성을 함께 봅니다.'],
  [
    '03',
    '온라인 미팅',
    '서로의 작업 방식과 ilog에서의 다음 장면을 이야기합니다.',
  ],
  ['04', '프로젝트 매칭', '선정된 크리에이터에게 맞는 제작 트랙을 제안합니다.'],
] as const

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string }

function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight
      setProgress(height <= 0 ? 0 : window.scrollY / height)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className={styles.progressTrack} aria-hidden="true">
      <span style={{ transform: `scaleX(${String(progress)})` }} />
    </div>
  )
}

export function CreatorApplicationExperience() {
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: 'idle',
  })
  const [pitchLength, setPitchLength] = useState(0)

  function field(form: FormData, name: string): string {
    const value = form.get(name)
    return typeof value === 'string' ? value : ''
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitState({ status: 'submitting' })
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const body = {
      displayName: field(form, 'displayName'),
      email: field(form, 'email'),
      track: field(form, 'track'),
      portfolioUrl: field(form, 'portfolioUrl'),
      socialUrl: field(form, 'socialUrl'),
      experience: field(form, 'experience'),
      pitch: field(form, 'pitch'),
      privacyConsent: form.get('privacyConsent') === 'on',
      companyWebsite: field(form, 'companyWebsite'),
    }

    try {
      const response = await fetch('/api/creator-applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = (await response.json()) as {
        id?: string
        error?: { message?: string }
      }
      if (!response.ok || payload.id === undefined) {
        throw new Error(
          payload.error?.message ?? '신청서를 접수하지 못했습니다.',
        )
      }
      setSubmitState({ status: 'success', id: payload.id })
      formElement.reset()
      setPitchLength(0)
    } catch (error: unknown) {
      setSubmitState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : '잠시 후 다시 시도해 주세요.',
      })
    }
  }

  return (
    <main className={styles.page} id="creator-application-page">
      <style>{`body:has(#creator-application-page) .aidream-theme-control { display: none; }`}</style>
      <ScrollProgress />
      <header className={styles.header}>
        <Link href="/" aria-label="ilog 홈" className={styles.logo}>
          <LeftBrandLogo priority />
        </Link>
        <nav aria-label="크리에이터 모집 페이지">
          <a href="#tracks">모집 분야</a>
          <a href="#process">진행 방식</a>
          <a href="#apply">지원하기</a>
        </nav>
        <a href="#apply" className={styles.headerCta}>
          APPLY <ArrowUpRight size={16} />
        </a>
      </header>

      <section
        className={styles.hero}
        id="top"
        aria-labelledby="creator-call-title"
      >
        <div className={styles.heroMeta}>
          <span>ILOG CREATOR CALL</span>
          <span>2026 · FOUNDING CLASS</span>
        </div>
        <div className={styles.heroContent}>
          <p className={styles.kicker}>AI CINEMA · OPEN CALL</p>
          <h1 id="creator-call-title">
            CREATE WHAT
            <br />
            <span>COMES NEXT.</span>
          </h1>
          <p className={styles.heroLead}>
            기술을 잘 다루는 사람보다, 아직 본 적 없는 이야기를 끝까지 만들고
            싶은 사람을 기다립니다.
          </p>
          <div className={styles.heroActions}>
            <a href="#apply" className={styles.primaryButton}>
              크리에이터 지원하기 <ArrowRight size={18} />
            </a>
            <a href="#tracks" className={styles.textButton}>
              <ArrowDown size={17} /> 모집 분야 살펴보기
            </a>
          </div>
        </div>
        <a
          href="#tracks"
          className={styles.scrollCue}
          aria-label="다음 섹션으로 이동"
        >
          <span /> SCROLL TO DISCOVER
        </a>
      </section>

      <div className={styles.contentSurface}>
        <section
          className={styles.tracks}
          id="tracks"
          aria-labelledby="tracks-title"
        >
          <div className={styles.sectionHeading}>
            <span>[001] OPEN TRACKS</span>
            <h2 id="tracks-title">당신의 자리는 어디인가요?</h2>
            <p>
              한 가지 역할에 갇히지 않아도 됩니다. 지금 가장 잘 보여줄 수 있는
              트랙을 선택하세요.
            </p>
          </div>
          <div className={styles.trackGrid}>
            {tracks.map(
              ({ number, label, title, description, icon: Icon, image }) => (
                <article className={styles.trackCard} key={label}>
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 92vw, 25vw"
                  />
                  <div className={styles.trackShade} />
                  <div className={styles.trackTopline}>
                    <span>{number}</span>
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <div className={styles.trackCopy}>
                    <p>{label}</p>
                    <h3>{title}</h3>
                    <span>{description}</span>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>

        <section
          className={styles.process}
          id="process"
          aria-labelledby="process-title"
        >
          <div className={styles.processIntro}>
            <span>[002] PROCESS</span>
            <h2 id="process-title">복잡한 관문보다 깊은 대화.</h2>
            <p>
              접수 후 영업일 기준 14일 안에 다음 단계 대상자에게 개별
              연락드립니다.
            </p>
          </div>
          <ol className={styles.processList}>
            {process.map(([number, title, description]) => (
              <li key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
                <ArrowUpRight aria-hidden="true" />
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.criteria} aria-labelledby="criteria-title">
          <div>
            <Users size={24} strokeWidth={1.5} />
            <span>WHO WE LOOK FOR</span>
          </div>
          <h2 id="criteria-title">완벽한 이력보다 분명한 시선.</h2>
          <ul>
            <li>
              <Check /> AI 영상 도구를 작품의 언어로 실험하는 사람
            </li>
            <li>
              <Check /> 짧은 장면을 넘어 서사와 캐릭터를 발전시키고 싶은 사람
            </li>
            <li>
              <Check /> 피드백을 나누고 다른 분야의 창작자와 협업할 수 있는 사람
            </li>
            <li>
              <Check /> 국적·경력·학력과 관계없이 공개할 포트폴리오가 있는 사람
            </li>
          </ul>
        </section>

        <section
          className={styles.applySection}
          id="apply"
          aria-labelledby="apply-title"
        >
          <div className={styles.applyIntro}>
            <span>[003] APPLICATION</span>
            <h2 id="apply-title">당신의 다음 장면을 보여주세요.</h2>
            <p>
              링크 하나와 솔직한 설명이면 충분합니다. 제출한 내용은 이번
              크리에이터 모집 검토에만 사용합니다.
            </p>
            <div className={styles.applyNote}>
              <CircleCheck size={20} />
              <span>
                <strong>상시 접수 · 순차 검토</strong>
                같은 이메일로 다시 제출하면 최신 내용으로 안전하게 갱신됩니다.
              </span>
            </div>
          </div>

          {submitState.status === 'success' ? (
            <div className={styles.successPanel} role="status">
              <div>
                <CircleCheck size={36} />
              </div>
              <p>APPLICATION RECEIVED</p>
              <h3>지원서가 도착했습니다.</h3>
              <span>접수 번호</span>
              <code>{submitState.id}</code>
              <p>
                검토 후 다음 단계 대상자에게 입력한 이메일로 연락드리겠습니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitState({ status: 'idle' })
                }}
              >
                다른 지원서 작성하기 <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form
              className={styles.form}
              onSubmit={(event) => {
                void submit(event)
              }}
            >
              <label className={styles.honeypot} aria-hidden="true">
                회사 웹사이트
                <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
              </label>
              <div className={styles.formRow}>
                <label>
                  <span>이름 또는 활동명 *</span>
                  <input
                    name="displayName"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </label>
                <label>
                  <span>연락받을 이메일 *</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                  />
                </label>
              </div>

              <fieldset className={styles.trackOptions}>
                <legend>가장 가까운 모집 분야 *</legend>
                {tracks.map(({ value, label, title, icon: Icon }, index) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="track"
                      value={value}
                      required
                      defaultChecked={index === 0}
                    />
                    <span>
                      <Icon size={18} />
                      <small>{label}</small>
                      <strong>{title}</strong>
                    </span>
                  </label>
                ))}
                <label>
                  <input type="radio" name="track" value="OTHER" required />
                  <span>
                    <Sparkles size={18} />
                    <small>MULTI ROLE</small>
                    <strong>그 외 · 복합 분야</strong>
                  </span>
                </label>
              </fieldset>

              <label className={styles.fullField}>
                <span>대표 포트폴리오 URL *</span>
                <input
                  name="portfolioUrl"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  required
                  maxLength={500}
                />
              </label>
              <label className={styles.fullField}>
                <span>
                  추가 채널 URL <em>선택</em>
                </span>
                <input
                  name="socialUrl"
                  type="url"
                  inputMode="url"
                  placeholder="YouTube, Vimeo, Instagram 등"
                  maxLength={500}
                />
              </label>
              <label className={styles.fullField}>
                <span>
                  주요 경험과 사용 도구 <em>선택</em>
                </span>
                <textarea
                  name="experience"
                  rows={4}
                  maxLength={1200}
                  placeholder="작업 경험, 협업 방식, 익숙한 도구를 간단히 적어주세요."
                />
              </label>
              <label className={styles.fullField}>
                <span>ilog에서 만들고 싶은 이야기 *</span>
                <textarea
                  name="pitch"
                  rows={7}
                  required
                  minLength={40}
                  maxLength={2000}
                  onChange={(event) => {
                    setPitchLength(event.currentTarget.value.length)
                  }}
                  placeholder="어떤 인물과 세계를 만들고 싶은지, 왜 지금 이 이야기인지 들려주세요. (40자 이상)"
                />
                <small className={styles.count}>
                  {pitchLength.toLocaleString()} / 2,000
                </small>
              </label>

              <label className={styles.consent}>
                <input name="privacyConsent" type="checkbox" required />
                <span>
                  지원 검토를 위해 이름, 이메일, 포트폴리오와 작성 내용을
                  수집·이용하는 데 동의합니다. 삭제를 원하면 privacy@ilog.kr로
                  요청할 수 있습니다. <strong>(필수)</strong>
                </span>
              </label>

              {submitState.status === 'error' ? (
                <p className={styles.formError} role="alert">
                  {submitState.message}
                </p>
              ) : null}

              <button
                className={styles.submitButton}
                type="submit"
                disabled={submitState.status === 'submitting'}
              >
                <span>
                  {submitState.status === 'submitting'
                    ? '접수하는 중...'
                    : '지원서 제출하기'}
                </span>
                <ArrowUpRight size={20} />
              </button>
            </form>
          )}
        </section>

        <footer className={styles.footer}>
          <Link href="/" aria-label="ilog 홈">
            <LeftBrandLogo />
          </Link>
          <p>NEW VOICES. NEW WORLDS. STORIES THAT STAY.</p>
          <div>
            <a href="mailto:support@ilog.kr">문의</a>
            <a href="#top">맨 위로 ↑</a>
          </div>
          <small>© 2026 ilog. All rights reserved.</small>
        </footer>
      </div>
    </main>
  )
}
