import { HIGGSFIELD_FILMS, higgsfieldWatchPath } from './higgsfield'

/** 준비된 안내에 없을 때 항상 같은 문장으로 고객센터를 안내한다. */
export const HELP_FALLBACK_ANSWER =
  '이 질문의 답은 준비된 안내에 없습니다. support@ilog.kr 로 보내 주시면 확인해 드립니다.'

export const HELP_SUPPORT_MAILTO = 'mailto:support@ilog.kr'

/**
 * 안내 문장과 확실히 맞는 질문이면 모델을 부르지 않는다.
 * 이 값보다 낮고 약한 점수 이상이면, 키가 있을 때만 안내문을 근거로 풀어 답한다.
 */
export const HELP_CONFIDENT_SCORE = 12
export const HELP_WEAK_SCORE = 4

export interface HelpEntry {
  readonly id: string
  readonly title: string
  readonly prompts: readonly string[]
  readonly keywords: readonly string[]
  readonly answer: string
  readonly href: string | null
  readonly linkLabel: string | null
}

function filmList(): string {
  return HIGGSFIELD_FILMS.map(
    (film) => `${film.title} (${higgsfieldWatchPath(film.slug)})`,
  ).join(', ')
}

const entries: readonly HelpEntry[] = [
  {
    id: 'password-reset',
    title: '비밀번호를 잊었어요',
    prompts: [
      '비밀번호 찾기',
      '비밀번호 재설정',
      '비밀번호를 잊',
      '비밀번호 잊',
      '비밀번호 까먹',
    ],
    keywords: [],
    answer:
      '비밀번호 재설정 화면에서 가입한 이메일로 재설정 링크를 요청해 주세요. 메일이 오지 않으면 스팸함과 입력한 이메일을 확인해 주세요. 비밀번호나 인증 코드는 상담창에 보내지 마세요.',
    href: '/password/forgot',
    linkLabel: '비밀번호 재설정',
  },
  {
    id: 'playback-error',
    title: '영상이 재생되지 않아요',
    prompts: [
      '영상 안나',
      '영상이 안',
      '재생 안',
      '재생이 안',
      '재생되지',
      '영상 오류',
      '검은 화면',
      '영상 멈',
    ],
    keywords: [],
    answer:
      '인터넷 연결을 확인하고 페이지를 새로고침해 주세요. 다른 브라우저에서도 문제가 이어지면 작품 이름, 기기와 브라우저, 오류 문구를 support@ilog.kr로 보내 주세요. 비밀번호나 개인정보는 보내지 마세요.',
    href: HELP_SUPPORT_MAILTO,
    linkLabel: '재생 문제 문의',
  },
  {
    id: 'creator-status',
    title: '지원서가 접수되었나요?',
    prompts: [
      '접수현황',
      '접수 현황',
      '접수 확인',
      '접수됐',
      '접수되었',
      '지원 결과',
      '선정 결과',
    ],
    keywords: [],
    answer:
      '이 상담창에서는 개인 지원 내역이나 선정 결과를 조회하지 않습니다. 지원 페이지의 접수현황에서 제공하는 안내를 확인하고, 개별 접수 확인은 지원에 사용한 이메일로 support@ilog.kr에 문의해 주세요.',
    href: '/creator-apply#status',
    linkLabel: '접수현황 안내',
  },
  {
    id: 'billing-help',
    title: '결제·환불은 어떻게 문의하나요?',
    prompts: ['환불', '결제 실패', '결제 오류', '이중 결제', '구독 해지'],
    keywords: [],
    answer:
      '이 상담창에서는 결제 내역을 조회하거나 환불·구독 해지를 처리할 수 없습니다. 가입 이메일과 발생한 문제를 support@ilog.kr에 문의해 주세요. 카드 번호, 비밀번호, 인증 코드는 보내지 마세요.',
    href: HELP_SUPPORT_MAILTO,
    linkLabel: '결제 관련 문의',
  },
  {
    id: 'higgsfield',
    title: 'Higgsfield 작품은 어디서 보나요?',
    prompts: ['higgsfield', '힉스필드', '힐스필드'],
    keywords: ['thread', 'borrowed wounds', 'borrowed', 'pandaproduction'],
    answer: `Higgsfield Global Film Festival 출품작은 /u/higgsfield 에서 소개합니다. 지금 볼 수 있는 작품은 ${filmList()}입니다. 이 프로필은 ilog 계정이 아니라 팔로우와 메시지를 받지 않습니다. 재생 화면에는 원작 이름과 Higgsfield 원문 링크가 있습니다.`,
    href: '/u/higgsfield',
    linkLabel: 'Higgsfield 프로필',
  },
  {
    id: 'membership',
    title: '멤버십 요금은 얼마인가요?',
    prompts: ['멤버십', '광고형', '구독 요금'],
    keywords: ['6,900', '6900', '약정'],
    answer:
      '광고형 멤버십 안내는 /ads-plan 에 있습니다. 그 페이지에는 월 6,900원, 약정 없음, 언제든 해지라고 적혀 있습니다. 광고 빈도, 화질, 동시 시청은 같은 페이지의 질문 목록에서 확인합니다.',
    href: '/ads-plan',
    linkLabel: '멤버십 안내',
  },
  {
    id: 'creator-eligibility',
    title: '경력이 없어도 지원할 수 있나요?',
    prompts: ['경력이 없어도', '학력 제한', '국적 제한'],
    keywords: ['경력', '학력', '국적'],
    answer:
      '국적·경력·학력 제한은 없습니다. 공개할 포트폴리오와 만들고 싶은 이야기가 있다면 /creator-apply 에서 지원할 수 있습니다. 작품의 관점과 성장 가능성도 함께 봅니다.',
    href: '/creator-apply',
    linkLabel: '크리에이터 지원',
  },
  {
    id: 'creator-portfolio',
    title: '포트폴리오는 어떻게 내나요?',
    prompts: ['포트폴리오', '파일 첨부', '작품 링크'],
    keywords: ['youtube', 'vimeo', '유튜브'],
    answer:
      'YouTube, Vimeo, 개인 웹사이트처럼 작품을 볼 수 있는 링크 하나를 넣으면 됩니다. 파일 첨부는 필요하지 않습니다. 비공개 링크는 열람 권한을 확인해 주세요.',
    href: '/creator-apply',
    linkLabel: '크리에이터 지원',
  },
  {
    id: 'creator-edit',
    title: '지원서를 수정할 수 있나요?',
    prompts: ['지원서 수정', '다시 제출', '같은 이메일'],
    keywords: ['지원서'],
    answer:
      '같은 이메일로 지원서를 다시 제출하면 최신 내용으로 갱신됩니다. 수정한 이름, 작품 링크, 소개를 다시 보내면 됩니다.',
    href: '/creator-apply',
    linkLabel: '크리에이터 지원',
  },
  {
    id: 'creator-selection',
    title: '지원하면 바로 참여하나요?',
    prompts: ['바로 참여', '온라인 미팅', '프로젝트 매칭'],
    keywords: ['선정'],
    answer:
      '접수만으로 참여가 확정되지는 않습니다. 작품 검토와 온라인 미팅을 거친 뒤, 선정된 크리에이터에게 제작 트랙을 제안합니다.',
    href: '/creator-apply',
    linkLabel: '크리에이터 지원',
  },
  {
    id: 'creator-apply',
    title: '크리에이터는 어떻게 지원하나요?',
    prompts: [
      '크리에이터 지원',
      '크리에이터 모집',
      '지원 방법',
      '지원 어떻게',
      '지원하고 싶',
      '지원하려',
    ],
    keywords: ['모집'],
    answer:
      '크리에이터 지원은 /creator-apply 입니다. 순서는 지원서 접수, 작품 검토, 온라인 미팅, 프로젝트 매칭입니다. 제작 권한이 없으면 메뉴의 스튜디오도 이 지원 화면으로 이동합니다.',
    href: '/creator-apply',
    linkLabel: '크리에이터 지원',
  },
  {
    id: 'studio',
    title: '작품은 어떻게 등록하나요?',
    prompts: ['작품 등록', '미디어 보관함', '영상 업로드'],
    keywords: ['스튜디오', '업로드'],
    answer:
      '제작 권한이 있는 계정은 /studio 에서 작품을 관리합니다. 작품 등록은 /studio/new, 미디어 보관함은 /studio/upload 입니다.',
    href: '/studio',
    linkLabel: '스튜디오',
  },
  {
    id: 'account',
    title: '계정은 어디서 바꾸나요?',
    prompts: ['계정 관리', '회원탈퇴', '프로필 수정'],
    keywords: ['탈퇴', '동의 관리'],
    answer:
      '로그인 후 /account 에서 프로필, 계정 정보, 동의, 회원탈퇴를 관리합니다. 작가 계정은 메시지 수신 범위도 여기서 정합니다.',
    href: '/account',
    linkLabel: '계정 관리',
  },
  {
    id: 'login',
    title: '로그인은 어디서 하나요?',
    prompts: ['로그인', '회원가입', '비밀번호'],
    keywords: ['가입'],
    answer:
      '로그인은 /login, 회원가입은 /signup 입니다. 비밀번호를 잊었다면 /password/forgot 에서 재설정합니다. 로그인한 홈은 /browse 입니다.',
    href: '/login',
    linkLabel: '로그인',
  },
  {
    id: 'search',
    title: '검색은 어디서 하나요?',
    prompts: ['검색', '전체 탐색'],
    keywords: ['찾아'],
    answer:
      '검색은 /search 입니다. 두 글자부터 작품, 회차, 사용자를 찾을 수 있습니다.',
    href: '/search',
    linkLabel: '검색',
  },
  {
    id: 'works',
    title: '작품은 어디서 보나요?',
    prompts: ['작품 목록', '숏폼', '롱폼', 'short form', 'long form'],
    keywords: ['16:9', '9:16'],
    answer:
      '작품 목록은 /works 입니다. ALL WORKS, LONG FORM, SHORT FORM으로 나뉩니다. 긴 작품은 가로 16:9, 숏폼은 세로 9:16으로 보입니다. 로그인한 홈 /browse 에도 이야기 선반이 있습니다.',
    href: '/works',
    linkLabel: '작품 보기',
  },
  {
    id: 'messages',
    title: '메시지는 어디서 보나요?',
    prompts: ['메시지', '쪽지'],
    keywords: ['dm'],
    answer:
      '메시지는 로그인한 뒤 /messages 에서 봅니다. 작가 계정의 수신 범위는 /account 의 메시지 설정에서 바꿉니다.',
    href: '/messages',
    linkLabel: '메시지',
  },
  {
    id: 'notices',
    title: '공지사항은 어디에 있나요?',
    prompts: ['공지사항', '공지'],
    keywords: [],
    answer: '공지사항은 /notices 에 있습니다.',
    href: '/notices',
    linkLabel: '공지사항',
  },
  {
    id: 'events',
    title: '이벤트는 어디에 있나요?',
    prompts: ['이벤트'],
    keywords: [],
    answer: '이벤트는 /events 에 있습니다.',
    href: '/events',
    linkLabel: '이벤트',
  },
  {
    id: 'creators',
    title: '작가는 어디서 보나요?',
    prompts: ['작가 목록', '팔로잉'],
    keywords: ['작가'],
    answer:
      '작가 목록은 /creators 입니다. 팔로잉한 작가는 로그인한 뒤 /following 에서 볼 수 있습니다.',
    href: '/creators',
    linkLabel: '작가',
  },
  {
    id: 'privacy',
    title: '개인정보는 어디에 문의하나요?',
    prompts: ['개인정보', '이용약관', '약관'],
    keywords: ['privacy'],
    answer:
      '개인정보 처리방침은 /privacy 이고, 개인정보 문의는 privacy@ilog.kr 입니다. 이용약관은 /terms 입니다.',
    href: '/privacy',
    linkLabel: '개인정보 처리방침',
  },
  {
    id: 'support',
    title: '고객센터는 어디인가요?',
    prompts: ['고객센터', '문의'],
    keywords: ['support'],
    answer:
      '일반 문의는 support@ilog.kr 입니다. 계정 화면에도 고객센터로 보내는 메일이 있습니다.',
    href: HELP_SUPPORT_MAILTO,
    linkLabel: '고객센터 메일',
  },
  {
    id: 'about',
    title: 'ilog가 어떤 서비스인가요?',
    prompts: ['어떤 서비스', '서비스 소개', 'ilog는', '아이로그'],
    keywords: ['ai 드라마', 'ai 영화'],
    answer:
      'ilog는 AI 드라마와 AI 영화를 발견하고, 감상하고, 공개하는 공간입니다. 보는 사람과 만드는 사람 사이의 거리를 줄이는 환경을 만듭니다.',
    href: '/about',
    linkLabel: 'ilog 소개',
  },
  {
    id: 'greeting',
    title: '무엇을 물어볼 수 있나요?',
    prompts: ['안녕하세요', '안녕', '도움말'],
    keywords: ['hello'],
    answer:
      '작품 감상, 검색, 계정, 크리에이터 지원, Higgsfield 출품작을 안내합니다. 준비된 답에 없는 내용은 support@ilog.kr 로 문의해 주세요.',
    href: null,
    linkLabel: null,
  },
]

export const HELP_ENTRIES: readonly HelpEntry[] = entries

export const HELP_SUGGESTIONS: readonly HelpEntry[] = [
  'about',
  'works',
  'creator-apply',
  'higgsfield',
  'account',
]
  .map((id) => entries.find((entry) => entry.id === id))
  .filter((entry): entry is HelpEntry => entry !== undefined)

export interface HelpMatch {
  readonly entry: HelpEntry | null
  readonly score: number
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}:/]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function phraseScore(question: string, phrase: string, weight: number): number {
  const needle = normalize(phrase)
  if (needle.length < 2 || !question.includes(needle)) return 0
  if (needle.length >= 4 || question === needle) return weight + 12
  // 한국어 두세 글자는 "작가", "공지"처럼 그 자체로 질문이다.
  if (/\p{Script=Hangul}/u.test(needle)) return weight + 4
  return weight
}

export function matchHelpEntry(question: string): HelpMatch {
  const normalized = normalize(question)
  if (normalized.length < 2) return { entry: null, score: 0 }

  let best: HelpEntry | null = null
  let bestScore = 0
  for (const entry of entries) {
    let score = 0
    for (const prompt of [entry.title, ...entry.prompts]) {
      score += phraseScore(normalized, prompt, 4)
    }
    for (const keyword of entry.keywords) {
      score += phraseScore(normalized, keyword, 2)
    }
    if (score > bestScore) {
      best = entry
      bestScore = score
    }
  }
  return { entry: bestScore >= HELP_WEAK_SCORE ? best : null, score: bestScore }
}

/** 모델에 넘기는 안내문. 이 문장 밖은 답하지 말라고 서버가 지시한다. */
export function helpGuideText(): string {
  return entries
    .map((entry) => {
      const link = entry.href === null ? '' : `\n바로가기: ${entry.href}`
      return `Q: ${entry.title}\nA: ${entry.answer}${link}`
    })
    .join('\n\n')
}
