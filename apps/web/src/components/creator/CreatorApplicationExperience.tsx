'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleCheck,
  Clapperboard,
  Film,
  PenTool,
  Sparkles,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type SyntheticEvent,
} from 'react'

import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'
import {
  PrismaHero,
  PrismaNavigation,
  WordsPullUpMultiStyle,
  type PrismaNavItem,
} from '@/components/ui/prisma-hero'

import styles from './creator-application.module.css'

const tracks = [
  {
    value: 'DIRECTOR',
    title: '연출 · 감독',
    description: '장면의 리듬과 작품의 방향을 설계하고 제작을 이끌어요.',
    icon: Clapperboard,
  },
  {
    value: 'WRITER',
    title: '작가 · 스토리',
    description: '아이디어를 인물, 세계관, 시나리오로 발전시켜요.',
    icon: PenTool,
  },
  {
    value: 'AI_VISUAL',
    title: 'AI 비주얼 아티스트',
    description: 'AI 도구로 작품에 필요한 이미지와 영상을 만들어요.',
    icon: Sparkles,
  },
  {
    value: 'PRODUCER',
    title: '프로듀서 · 사운드',
    description: '제작을 연결하거나 작품의 소리를 만들어요.',
    icon: Film,
  },
  {
    value: 'OTHER',
    title: '그 외 · 복합 분야',
    description: '여러 역할을 함께 하거나 새로운 분야를 실험해요.',
    icon: Sparkles,
  },
] as const
const steps = [
  {
    title: '어떻게 불러드릴까요?',
    label: '기본 정보',
    description: '이름과 연락받을 이메일을 알려주세요.',
  },
  {
    title: '어떤 역할로 함께할까요?',
    label: '지원 분야',
    description: '가장 가까운 분야를 하나 선택해 주세요.',
  },
  {
    title: '당신의 작품을 보여주세요.',
    label: '작품 링크',
    description: '대표 작품을 볼 수 있는 링크 하나면 충분해요.',
  },
  {
    title: '다음 이야기가 궁금해요.',
    label: '만들고 싶은 이야기',
    description: '주인공, 배경, 만들고 싶은 장면을 편하게 적어주세요.',
  },
  {
    title: '조금 더 소개하고 싶다면.',
    label: '추가 소개',
    description: '선택 항목이에요. 작성하지 않아도 지원할 수 있어요.',
  },
  {
    title: '마지막으로 확인해 주세요.',
    label: '확인·제출',
    description: '연락처와 작품 링크를 확인한 뒤 제출해 주세요.',
  },
] as const
const applicationProcess = [
  ['01', '지원서 접수', '작품 링크와 만들고 싶은 이야기를 보내주세요.'],
  ['02', '작품 검토', '작품에 담긴 관점과 성장 가능성을 살펴봅니다.'],
  ['03', '온라인 미팅', '다음 단계 대상자와 협업 방향을 이야기합니다.'],
  ['04', '프로젝트 매칭', '선정된 크리에이터에게 맞는 제작 트랙을 제안합니다.'],
] as const
const faqs = [
  [
    '경력이 많지 않아도 지원할 수 있나요?',
    '국적·경력·학력 제한은 없습니다. 공개할 포트폴리오와 만들고 싶은 이야기가 있다면 지원해 주세요. 작품의 관점과 성장 가능성도 함께 봅니다.',
  ],
  [
    '포트폴리오는 어떻게 제출하나요?',
    'YouTube, Vimeo, 개인 웹사이트 등 작품을 볼 수 있는 링크 하나를 넣어주세요. 파일 첨부는 필요하지 않습니다. 비공개 링크는 열람 권한을 확인해 주세요.',
  ],
  [
    '지원 내용을 수정할 수 있나요?',
    '같은 이메일로 지원서를 다시 제출하면 최신 내용으로 갱신됩니다. 수정한 이름, 작품 링크, 소개 내용을 다시 보내주세요.',
  ],
  [
    '지원하면 바로 프로젝트에 참여하나요?',
    '접수 후 작품 검토와 온라인 미팅을 거칩니다. 선정된 크리에이터에게 제작 트랙을 제안하며, 접수만으로 참여가 확정되지는 않습니다.',
  ],
] as const
type Screen =
  | 'top'
  | 'about'
  | 'apply'
  | 'status'
  | 'benefits'
  | 'tracks'
  | 'process'
  | 'faq'
interface Receipt {
  id: string
  receivedAt: string
}
const receiptKey = 'ilog-creator-application-receipt'
function readReceipt(): Receipt | null {
  try {
    const raw = sessionStorage.getItem(receiptKey)
    const value: unknown = raw ? JSON.parse(raw) : null
    if (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'string' &&
      'receivedAt' in value &&
      typeof value.receivedAt === 'string'
    )
      return { id: value.id, receivedAt: value.receivedAt }
    return null
  } catch {
    return null
  }
}
type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; id: string }
  | { status: 'error'; message: string }
interface Application {
  displayName: string
  email: string
  track: string
  portfolioUrl: string
  socialUrl: string
  experience: string
  pitch: string
  privacyConsent: boolean
  companyWebsite: string
}

export function CreatorApplicationExperience() {
  const [screen, setScreen] = useState<Screen>('top')
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState(0)
  const [selectedTrack, setSelectedTrack] = useState('')
  const [pitchLength, setPitchLength] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: 'idle',
  })
  const [review, setReview] = useState<Application | null>(null)
  const [faqIndex, setFaqIndex] = useState(0)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const pageRef = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef<string | null>(null)
  const previous = useRef({ screen, step })

  useEffect(() => {
    const hashScreen = () => {
      const hash = window.location.hash.slice(1)
      if (
        [
          'top',
          'about',
          'apply',
          'status',
          'benefits',
          'tracks',
          'process',
          'faq',
        ].includes(hash)
      )
        setScreen(hash as Screen)
    }
    const resize = () => {
      pageRef.current?.style.setProperty(
        '--creator-viewport',
        `${String(window.visualViewport?.height ?? window.innerHeight)}px`,
      )
    }
    hashScreen()
    setReady(true)
    setReceipt(readReceipt())
    resize()
    window.addEventListener('hashchange', hashScreen)
    window.visualViewport?.addEventListener('resize', resize)
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('hashchange', hashScreen)
      window.visualViewport?.removeEventListener('resize', resize)
      window.removeEventListener('resize', resize)
    }
  }, [])
  useEffect(() => {
    if (!receipt) return
    try {
      sessionStorage.setItem(receiptKey, JSON.stringify(receipt))
    } catch {
      return
    }
  }, [receipt])

  function focusField(name: string) {
    const target = formRef.current?.elements.namedItem(name)
    if (target instanceof RadioNodeList)
      target[0]?.focus({ preventScroll: true })
    else if (target instanceof HTMLElement)
      target.focus({ preventScroll: true })
  }
  useEffect(() => {
    if (previous.current.screen === screen && previous.current.step === step)
      return
    previous.current = { screen, step }
    if (screen !== 'apply') return
    if (pendingFocus.current) {
      focusField(pendingFocus.current)
      pendingFocus.current = null
    } else titleRef.current?.focus({ preventScroll: true })
  }, [screen, step])
  useEffect(() => {
    if (submitState.status === 'success')
      successRef.current?.focus({ preventScroll: true })
  }, [submitState.status])

  function navigate(event: MouseEvent<HTMLAnchorElement>, next: Screen) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    window.history.replaceState(null, '', `#${next}`)
    setScreen(next)
  }
  function readForm(formElement: HTMLFormElement): Application {
    const data = new FormData(formElement)
    const field = (name: string) => {
      const value = data.get(name)
      return typeof value === 'string' ? value.trim() : ''
    }
    return {
      displayName: field('displayName'),
      email: field('email'),
      track: field('track'),
      portfolioUrl: field('portfolioUrl'),
      socialUrl: field('socialUrl'),
      experience: field('experience'),
      pitch: field('pitch'),
      privacyConsent: data.get('privacyConsent') === 'on',
      companyWebsite: field('companyWebsite'),
    }
  }
  function errorFor(name: string) {
    return fieldErrors[name] ? (
      <small className={styles.fieldError} id={`${name}-error`}>
        {fieldErrors[name]}
      </small>
    ) : null
  }
  function invalidProps(name: string, hint?: string) {
    return {
      'aria-invalid': Boolean(fieldErrors[name]),
      'aria-describedby':
        [hint, fieldErrors[name] ? `${name}-error` : undefined]
          .filter(Boolean)
          .join(' ') || undefined,
    }
  }
  function validate(form: HTMLFormElement, all = false) {
    const body = readForm(form)
    const errors: Record<string, string> = {}
    if (all || step === 0) {
      if (body.displayName.length < 2)
        errors.displayName = '이름은 2자 이상 입력해 주세요.'
      if (
        !body.email ||
        !(form.elements.namedItem('email') as HTMLInputElement).validity.valid
      )
        errors.email = '이메일 주소를 정확히 입력해 주세요.'
    }
    if ((all || step === 1) && !body.track)
      errors.track = '지원할 분야를 하나 선택해 주세요.'
    if (all || step === 2) {
      if (
        !body.portfolioUrl ||
        !(form.elements.namedItem('portfolioUrl') as HTMLInputElement).validity
          .valid ||
        !/^https?:\/\//iu.test(body.portfolioUrl)
      )
        errors.portfolioUrl =
          'https:// 또는 http://로 시작하는 작품 링크를 입력해 주세요.'
    }
    if ((all || step === 3) && body.pitch.length < 40)
      errors.pitch = `앞뒤 공백을 제외하고 40자 이상 적어주세요. 현재 ${String(body.pitch.length)}자예요.`
    if (all || step === 4) {
      if (
        body.socialUrl &&
        (!(form.elements.namedItem('socialUrl') as HTMLInputElement).validity
          .valid ||
          !/^https?:\/\//iu.test(body.socialUrl))
      )
        errors.socialUrl =
          'https:// 또는 http://로 시작하는 채널 링크를 입력해 주세요.'
    }
    if ((all || step === 5) && !body.privacyConsent)
      errors.privacyConsent = '개인정보 수집·이용에 동의해 주세요.'
    setFieldErrors(errors)
    const first = Object.keys(errors)[0]
    if (!first) return true
    const errorStep = ['displayName', 'email'].includes(first)
      ? 0
      : first === 'track'
        ? 1
        : first === 'portfolioUrl'
          ? 2
          : first === 'pitch'
            ? 3
            : first === 'socialUrl'
              ? 4
              : 5
    if (errorStep === step) focusField(first)
    else {
      pendingFocus.current = first
      setStep(errorStep)
    }
    return false
  }
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitState.status === 'submitting') return
    const form = event.currentTarget
    if (step < steps.length - 1) {
      if (validate(form)) {
        setReview(readForm(form))
        setStep(step + 1)
      }
      return
    }
    if (!validate(form, true)) return
    setSubmitState({ status: 'submitting' })
    try {
      const response = await fetch('/api/creator-applications', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(readForm(form)),
      })
      const payload = (await response.json()) as { id?: string }
      if (!response.ok || !payload.id) {
        setSubmitState({
          status: 'error',
          message:
            response.status === 429
              ? '오늘 접수 횟수를 초과했습니다. 내일 다시 시도해 주세요.'
              : '접수하지 못했습니다. 작성 내용은 유지되니 다시 시도해 주세요.',
        })
        return
      }
      setSubmitState({ status: 'success', id: payload.id })
      setReceipt({ id: payload.id, receivedAt: new Date().toISOString() })
    } catch {
      setSubmitState({
        status: 'error',
        message: '연결을 확인하고 다시 시도해 주세요. 작성 내용은 유지됩니다.',
      })
    }
  }
  function reset() {
    setStep(0)
    setSelectedTrack('')
    setPitchLength(0)
    setReview(null)
    setFieldErrors({})
    setSubmitState({ status: 'idle' })
  }
  const stage = steps[step] ?? steps[0]
  const navigation: readonly PrismaNavItem[] = (
    [
      ['about', '우리들은?'],
      ['apply', '지원서 신청'],
      ['status', '접수현황'],
      ['faq', 'Q&A'],
      ['benefits', '혜택'],
    ] as const
  ).map(([value, label]) => ({
    label,
    href: `#${value}`,
    active: screen === value,
    onClick: (event) => {
      navigate(event, value)
    },
  }))

  return (
    <main
      className={styles.page}
      id="creator-application-page"
      ref={pageRef}
      data-ready={ready}
    >
      <PrismaHero
        videoSrc="/brand/creator/ilog-cinematic-loop.mp4"
        posterSrc="/brand/creator/ilog-cinematic-poster.jpg"
        backgroundOnly={screen !== 'top'}
        contentReady={ready}
        showNavigation={false}
        className={styles.pageBackground ?? ''}
        onAction={(event) => {
          navigate(event, 'apply')
        }}
      />
      <header className={styles.header}>
        <Link href="/" aria-label="ilog 홈" className={styles.logo}>
          <LeftBrandLogo priority />
        </Link>
        <PrismaNavigation items={navigation} />
      </header>
      <div className={styles.workspace} data-screen={screen}>
        <section
          className={styles.application}
          hidden={screen !== 'apply'}
          aria-label="크리에이터 지원서"
        >
          <aside className={styles.applyIntro}>
            <p className={styles.eyebrow}>ILOG · CREATOR APPLICATION</p>
            <h2>
              새로운 시선이
              <br />
              <span>다음 장면이 됩니다.</span>
            </h2>
            <p>
              한 번에 한 단계씩.
              <br />
              당신의 작품과 이야기에 집중하세요.
            </p>
            <ol className={styles.sideSteps}>
              {steps.map(({ label }, index) => (
                <li
                  key={label}
                  aria-current={step === index ? 'step' : undefined}
                  data-complete={step > index}
                >
                  <span>
                    {step > index ? (
                      <Check size={13} />
                    ) : (
                      `0${String(index + 1)}`
                    )}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
            <p className={styles.applyNote}>
              같은 이메일로 다시 제출하면
              <br />
              최신 내용으로 갱신됩니다.
            </p>
          </aside>
          {submitState.status === 'success' ? (
            <div
              className={styles.successPanel}
              id="apply"
              ref={successRef}
              role="status"
              tabIndex={-1}
            >
              <CircleCheck size={48} />
              <p className={styles.eyebrow}>APPLICATION RECEIVED</p>
              <h3>지원서가 접수됐어요.</h3>
              <p>
                영업일 기준 14일 이내에 다음 단계 대상자에게 입력한 이메일로
                연락드립니다.
              </p>
              <span>접수 번호</span>
              <code>{submitState.id}</code>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={reset}
              >
                다른 지원서 작성하기 <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form
              id="apply"
              className={styles.form}
              ref={formRef}
              noValidate
              onSubmit={(event) => {
                void submit(event)
              }}
              aria-labelledby="form-step-title"
              aria-busy={submitState.status === 'submitting'}
            >
              <div className={styles.formMeta}>
                <span>크리에이터 지원서</span>
                <span>
                  {step + 1} <i>/ {steps.length}</i>
                </span>
              </div>
              <div
                className={styles.progress}
                aria-label={`${String(step + 1)} / ${String(steps.length)}단계`}
              >
                {steps.map(({ label }, index) => (
                  <span key={label} data-active={index <= step} />
                ))}
              </div>
              <div className={styles.formHeading}>
                <h3 id="form-step-title" tabIndex={-1} ref={titleRef}>
                  {stage.title}
                </h3>
                <p>{stage.description}</p>
              </div>
              <fieldset
                className={styles.formFields}
                disabled={submitState.status === 'submitting'}
              >
                <legend className={styles.srOnly}>크리에이터 지원 정보</legend>
                <label className={styles.honeypot} aria-hidden="true">
                  회사 웹사이트
                  <input
                    name="companyWebsite"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
                <div className={styles.stage} hidden={step !== 0}>
                  <label>
                    <span>
                      이름 또는 활동명 <b>*</b>
                    </span>
                    <input
                      name="displayName"
                      autoComplete="name"
                      placeholder="2자 이상 입력해 주세요"
                      required
                      minLength={2}
                      maxLength={80}
                      {...invalidProps('displayName')}
                    />
                    {errorFor('displayName')}
                  </label>
                  <label>
                    <span>
                      연락받을 이메일 <b>*</b>
                    </span>
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      maxLength={254}
                      {...invalidProps('email')}
                    />
                    {errorFor('email')}
                  </label>
                </div>
                <fieldset
                  className={styles.trackOptions}
                  hidden={step !== 1}
                  {...invalidProps('track')}
                >
                  <legend className={styles.srOnly}>지원 분야 *</legend>
                  <div className={styles.optionGrid}>
                    {tracks.map(({ value, title, description, icon: Icon }) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="track"
                          value={value}
                          required
                          checked={selectedTrack === value}
                          onChange={() => {
                            setSelectedTrack(value)
                          }}
                          {...invalidProps('track')}
                        />
                        <span>
                          <Icon size={21} />
                          <span>
                            <strong>{title}</strong>
                            <small>{description}</small>
                          </span>
                          <Check className={styles.optionCheck} size={16} />
                        </span>
                      </label>
                    ))}
                  </div>
                  {errorFor('track')}
                </fieldset>
                <div className={styles.stage} hidden={step !== 2}>
                  <label>
                    <span>
                      대표 작품·포트폴리오 링크 <b>*</b>
                    </span>
                    <input
                      name="portfolioUrl"
                      type="url"
                      inputMode="url"
                      placeholder="https://www.youtube.com/watch?v=…"
                      required
                      maxLength={500}
                      {...invalidProps('portfolioUrl', 'portfolio-hint')}
                    />
                    {errorFor('portfolioUrl')}
                  </label>
                  <div className={styles.linkGuide} id="portfolio-hint">
                    <CircleCheck size={18} />
                    <div>
                      <strong>YouTube · Vimeo · 개인 웹사이트 등</strong>
                      <p>
                        작품을 볼 수 있는 링크를 넣어주세요.
                        <br />
                        비공개 링크는 열람 권한을 확인해 주세요.
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className={`${styles.stage ?? ''} ${styles.writingStage ?? ''}`}
                  hidden={step !== 3}
                >
                  <label>
                    <span>
                      ilog에서 만들고 싶은 이야기 <b>*</b>
                    </span>
                    <textarea
                      name="pitch"
                      rows={5}
                      required
                      minLength={40}
                      maxLength={2000}
                      placeholder="예: 기억을 사고파는 도시를 배경으로, 잃어버린 과거를 찾는 주인공의 이야기를 만들고 싶어요."
                      onChange={(event) => {
                        setPitchLength(event.currentTarget.value.trim().length)
                      }}
                      {...invalidProps('pitch', 'pitch-hint')}
                    />
                    <div className={styles.pitchHelp}>
                      <small id="pitch-hint">40~2,000자</small>
                      <small>{pitchLength.toLocaleString()} / 2,000자</small>
                    </div>
                    {errorFor('pitch')}
                  </label>
                </div>
                <div
                  className={styles.stage}
                  data-stage="optional"
                  hidden={step !== 4}
                >
                  <label>
                    <span>
                      추가 채널 링크 <em>선택</em>
                    </span>
                    <input
                      name="socialUrl"
                      type="url"
                      inputMode="url"
                      placeholder="https://www.instagram.com/…"
                      maxLength={500}
                      {...invalidProps('socialUrl')}
                    />
                    {errorFor('socialUrl')}
                  </label>
                  <label>
                    <span>
                      주요 경험과 사용 도구 <em>선택</em>
                    </span>
                    <textarea
                      name="experience"
                      rows={3}
                      maxLength={1200}
                      placeholder="작업 경험, 협업 방식, 익숙한 도구를 간단히 적어주세요."
                    />
                  </label>
                </div>
                <div className={styles.stage} hidden={step !== 5}>
                  {review ? (
                    <dl className={styles.review}>
                      <div>
                        <dt>지원자</dt>
                        <dd>
                          <span>{review.displayName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setStep(0)
                            }}
                            aria-label="이름과 이메일 수정"
                          >
                            수정
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt>이메일</dt>
                        <dd title={review.email}>{review.email}</dd>
                      </div>
                      <div>
                        <dt>지원 분야</dt>
                        <dd>
                          <span>
                            {
                              tracks.find(({ value }) => value === review.track)
                                ?.title
                            }
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setStep(1)
                            }}
                            aria-label="지원 분야 수정"
                          >
                            수정
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt>작품 링크</dt>
                        <dd>
                          <span title={review.portfolioUrl}>
                            {review.portfolioUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setStep(2)
                            }}
                            aria-label="작품 링크 수정"
                          >
                            수정
                          </button>
                        </dd>
                      </div>
                      <div>
                        <dt>이야기</dt>
                        <dd>
                          <span>
                            {review.pitch.length.toLocaleString()}자 작성
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setStep(3)
                            }}
                            aria-label="작성한 이야기 확인 및 수정"
                          >
                            확인
                          </button>
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                  <label className={styles.consent}>
                    <input
                      name="privacyConsent"
                      type="checkbox"
                      required
                      {...invalidProps('privacyConsent', 'consent-hint')}
                    />
                    <span>개인정보 수집·이용에 동의합니다. (필수)</span>
                  </label>
                  <p className={styles.privacyNote} id="consent-hint">
                    이름, 이메일, 작품과 작성 내용을 지원 검토에 사용합니다.
                    삭제 요청:{' '}
                    <a href="mailto:privacy@ilog.kr">privacy@ilog.kr</a>
                  </p>
                  {errorFor('privacyConsent')}
                  {submitState.status === 'error' ? (
                    <p className={styles.formError} role="alert">
                      {submitState.message}
                    </p>
                  ) : null}
                </div>
              </fieldset>
              <div className={styles.formActions}>
                {step > 0 ? (
                  <button
                    className={styles.backButton}
                    type="button"
                    disabled={submitState.status === 'submitting'}
                    onClick={() => {
                      setStep(step - 1)
                    }}
                  >
                    <ArrowLeft size={16} /> 이전
                  </button>
                ) : (
                  <a
                    href="#top"
                    className={styles.backButton}
                    onClick={(event) => {
                      navigate(event, 'top')
                    }}
                  >
                    <ArrowLeft size={16} /> 안내
                  </a>
                )}
                <button
                  className={styles.submitButton}
                  type="submit"
                  disabled={submitState.status === 'submitting'}
                >
                  {submitState.status === 'submitting'
                    ? '접수 중…'
                    : step === 4
                      ? '다음 단계 · 선택 항목'
                      : step < 5
                        ? '다음 단계'
                        : '지원서 제출하기'}
                  <ArrowRight size={17} />
                </button>
              </div>
              <p className={styles.submitNote}>
                {step < 5
                  ? '단계를 이동해도 작성한 내용은 유지됩니다.'
                  : '제출 후 접수 완료와 접수 번호를 확인할 수 있어요.'}
              </p>
            </form>
          )}
        </section>

        <section
          className={styles.guide}
          hidden={
            ![
              'about',
              'status',
              'benefits',
              'tracks',
              'process',
              'faq',
            ].includes(screen)
          }
          aria-label="크리에이터 모집 안내"
        >
          <nav
            className={styles.guideTabs}
            hidden={['status', 'benefits', 'faq'].includes(screen)}
            aria-label="모집 안내 항목"
          >
            {(
              [
                ['about', '우리들은?'],
                ['tracks', '모집 분야'],
                ['process', '지원 절차'],
              ] as const
            ).map(([value, label]) => (
              <a
                key={value}
                href={`#${value}`}
                aria-current={screen === value ? 'page' : undefined}
                onClick={(event) => {
                  navigate(event, value)
                }}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className={styles.guideContent}>
            <section hidden={screen !== 'about'} aria-labelledby="about-title">
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>WE ARE ILOG</p>
                <h2 id="about-title">새로운 도구로, 오래 남을 이야기.</h2>
                <p>
                  ilog는 AI 영화와 드라마를 만들고, 창작자와 관객을 연결하는
                  영상 플랫폼입니다.
                </p>
              </div>
              <div className={styles.aboutStatement}>
                <WordsPullUpMultiStyle
                  segments={[
                    { text: '당신의 시선이' },
                    {
                      text: '다음 장면이 됩니다.',
                      className: styles.redText ?? '',
                    },
                  ]}
                />
              </div>
              <div className={styles.aboutFacts}>
                <div>
                  <span>누구와</span>
                  <p>감독 · 작가 · AI 비주얼 아티스트 · 프로듀서</p>
                </div>
                <div>
                  <span>무엇을</span>
                  <p>AI 영화와 드라마, 인물과 세계를 함께 만듭니다.</p>
                </div>
                <div>
                  <span>어떻게</span>
                  <p>작품 검토와 온라인 미팅을 거쳐 제작 방향을 찾습니다.</p>
                </div>
              </div>
              <p className={styles.guideNote}>
                공개할 포트폴리오가 있다면 국적·경력·학력과 관계없이 지원할 수
                있어요.
              </p>
            </section>
            <section
              hidden={screen !== 'status'}
              aria-labelledby="status-title"
            >
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>APPLICATION RECEIPT</p>
                <h2 id="status-title">접수현황</h2>
                <p>이 탭에서 제출한 최근 지원서의 접수 내역입니다.</p>
              </div>
              <div className={styles.receiptPanel}>
                <CircleCheck size={36} />
                <h3>
                  {receipt
                    ? '지원서 접수가 완료됐어요.'
                    : '아직 접수한 지원서가 없어요.'}
                </h3>
                {receipt ? (
                  <>
                    <dl>
                      <div>
                        <dt>접수 상태</dt>
                        <dd>접수 완료</dd>
                      </div>
                      <div>
                        <dt>접수 번호</dt>
                        <dd>
                          <code>{receipt.id}</code>
                        </dd>
                      </div>
                      <div>
                        <dt>접수일</dt>
                        <dd>
                          {new Date(receipt.receivedAt).toLocaleDateString(
                            'ko-KR',
                          )}
                        </dd>
                      </div>
                    </dl>
                    <p>
                      영업일 기준 14일 안에 다음 단계 대상자에게 이메일로
                      안내합니다. 심사 결과는 이메일을 확인해 주세요.
                    </p>
                  </>
                ) : (
                  <p>
                    지원서를 제출하면 접수 번호가 여기에 표시됩니다.
                    <br />
                    작품 링크와 만들고 싶은 이야기를 준비해 주세요.
                  </p>
                )}
              </div>
            </section>
            <section
              hidden={screen !== 'benefits'}
              aria-labelledby="benefits-title"
            >
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>CREATE TOGETHER</p>
                <h2 id="benefits-title">ilog에서 함께할 기회</h2>
                <p>작품 검토와 미팅 후, 함께할 제작 방향을 정합니다.</p>
              </div>
              <div className={styles.benefitGrid}>
                <article>
                  <Clapperboard size={26} />
                  <h3>프로젝트 매칭</h3>
                  <p>선정된 크리에이터에게 맞는 제작 트랙을 제안합니다.</p>
                </article>
                <article>
                  <PenTool size={26} />
                  <h3>작품에 대한 대화</h3>
                  <p>온라인 미팅에서 작업 방식과 다음 이야기를 나눕니다.</p>
                </article>
                <article>
                  <Sparkles size={26} />
                  <h3>다양한 분야의 협업</h3>
                  <p>연출, 스토리, 비주얼, 사운드의 시선이 함께 만납니다.</p>
                </article>
              </div>
              <p className={styles.guideNote}>
                프로젝트별 참여 조건과 진행 방식은 미팅에서 확인합니다.
              </p>
            </section>

            <section
              hidden={screen !== 'tracks'}
              aria-labelledby="tracks-title"
            >
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>FIND YOUR ROLE</p>
                <h2 id="tracks-title">어떤 역할로 함께하고 싶나요?</h2>
                <p>경력보다 작품에 담긴 시선과 협업 의지를 봅니다.</p>
              </div>
              <div className={styles.trackGrid}>
                {tracks.map(({ value, title, description, icon: Icon }) => (
                  <a
                    className={styles.trackCard}
                    key={value}
                    href="#apply"
                    onClick={(event) => {
                      setSelectedTrack(value)
                      setStep(0)
                      navigate(event, 'apply')
                    }}
                  >
                    <Icon size={23} />
                    <div>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                    <ArrowUpRight size={16} />
                  </a>
                ))}
              </div>
            </section>
            <section
              hidden={screen !== 'process'}
              aria-labelledby="process-title"
            >
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>YOUR NEXT STEPS</p>
                <h2 id="process-title">제출하면 이렇게 진행돼요.</h2>
                <p>
                  영업일 기준 14일 안에 다음 단계 대상자에게 이메일로
                  연락드립니다.
                </p>
              </div>
              <ol className={styles.processList}>
                {applicationProcess.map(([number, title, description]) => (
                  <li key={number}>
                    <span>{number}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section hidden={screen !== 'faq'} aria-labelledby="faq-title">
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>BEFORE YOU APPLY</p>
                <h2 id="faq-title">지원 전 궁금한 점</h2>
              </div>
              <div className={styles.faqList}>
                {faqs.map(([question, answer], index) => (
                  <div key={question}>
                    <button
                      type="button"
                      aria-expanded={faqIndex === index}
                      aria-controls={`faq-answer-${String(index)}`}
                      onClick={() => {
                        setFaqIndex(index)
                      }}
                    >
                      {question}
                      <span>{faqIndex === index ? '−' : '+'}</span>
                    </button>
                    <p
                      id={`faq-answer-${String(index)}`}
                      hidden={faqIndex !== index}
                    >
                      {answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className={styles.guideActions}>
            <a href="mailto:support@ilog.kr" className={styles.textButton}>
              모집 문의 <ArrowUpRight size={15} />
            </a>
            <a
              href="#apply"
              className={styles.primaryButton}
              onClick={(event) => {
                navigate(event, 'apply')
              }}
            >
              지원서 작성하기 <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </div>
      <footer className={styles.footer}>
        <span>ILOG · NEW VOICES, NEW WORLDS.</span>
        <a href="mailto:support@ilog.kr">
          모집 문의 <ArrowUpRight size={12} />
        </a>
      </footer>
    </main>
  )
}
