import {
  formatPlanPrice,
  getPlanRegion,
  type PlanLanguage,
  type PlanRegion,
} from '@/src/config/plan-markets'

export type PlanLocale = PlanLanguage
export type PlanMarket = PlanRegion

export const PLAN_COPY = {
  ko: {
    htmlLang: 'ko',
    homeLabel: 'ilog 홈',
    navLabel: '페이지 메뉴',
    accountLabel: '계정 메뉴',
    nav: ['혜택', '가입 방법', '멤버십 정보', 'FAQ'],
    login: '로그인',
    start: '시작하기',
    language: 'English',
    languageHref: '/en-us/ads-plan',
    heroEyebrow: 'SMART PRICE. FULL STORY.',
    heroLine1: '보고 싶은 모든 순간,',
    heroPrice: '월 6,900원.',
    heroDescription: '짧고 매끄러운 광고와 함께 ilog의 영화와 시리즈를',
    heroDescriptionTail: 'Full HD로 마음껏 즐겨보세요.',
    planName: '광고형 스탠다드',
    recommended: '가장 합리적인 선택',
    monthly: '월 요금',
    currency: '₩',
    price: '6,900',
    adNote: '짧고 매끄러운 광고',
    details: [
      { label: '화질', value: 'Full HD', note: '1080p' },
      { label: '동시 시청', value: '2대', note: '어디서든' },
      { label: '다운로드', value: '지원', note: '오프라인' },
    ],
    startWithPrice: '6,900원으로 시작하기',
    cancelNote: '약정 없이 언제든 변경·해지 가능',
    scrollLabel: '혜택 더 보기',
    benefitsEyebrow: "WHY YOU'LL LOVE IT",
    benefitsTitle: ['가격은 가볍게.', '즐거움은 빈틈없이.'],
    benefits: [
      {
        eyebrow: 'LESS INTERRUPTION',
        title: '이야기에 집중하세요',
        description:
          '광고는 흐름이 자연스럽게 전환되는 지점에 짧게 배치됩니다. 중요한 장면은 온전히 즐기세요.',
      },
      {
        eyebrow: 'FULL HD',
        title: '선명함은 그대로',
        description: '합리적인 가격에도 생생한 1080p 화질을 제공합니다.',
      },
      {
        eyebrow: 'TOGETHER',
        title: '두 화면에서 동시에',
        description: '서로 다른 취향도 같은 시간에, 최대 2대에서 시청하세요.',
      },
      {
        eyebrow: 'OFFLINE',
        title: '보고 싶은 순간 어디서나',
        description:
          '콘텐츠를 저장해 이동 중에도 데이터 걱정 없이 즐길 수 있어요.',
      },
    ],
    values: [
      ['하루 약', '230원'],
      ['', 'Full HD 화질'],
      ['동시 시청', '2대'],
      ['', '다운로드 지원'],
    ],
    journeyEyebrow: 'START IN 3 STEPS',
    journeyTitle: ['복잡한 건 빼고,', '세 단계면 충분해요.'],
    journeyDescription:
      '가입부터 첫 재생까지 몇 분이면 됩니다. 약정이나 방문 설치는 필요하지 않아요.',
    startNow: '지금 시작하기',
    steps: [
      ['이메일로 시작', '사용할 이메일과 기본 프로필 정보를 입력하세요.'],
      ['멤버십 확인', '월 6,900원 광고형 스탠다드를 확인하고 결제하세요.'],
      ['바로 감상', '좋아하는 작품을 골라 Full HD로 바로 시작하세요.'],
    ],
    includedAlt: '미래적인 공간에서 작품을 감상하는 두 사람',
    perMonth: '/ 월',
    includedEyebrow: 'EVERYTHING INCLUDED',
    includedTitle: '선택 전에, 한눈에 확인하세요.',
    includedDescription:
      '숨겨진 조건 없이 꼭 필요한 혜택을 모두 담았습니다. 지원되는 디바이스에서 언제든 로그인하고 이어보세요.',
    features: [
      ['월 이용료', '6,900원'],
      ['최대 화질', 'Full HD · 1080p'],
      ['동시 시청', '2대'],
      ['프로필', '최대 5개'],
      ['콘텐츠 저장', '지원'],
      ['멤버십 변경·해지', '언제든 가능'],
    ],
    devices: 'TV · 모바일 · 태블릿 · 웹',
    deviceNote: '주요 디바이스에서 이어서 감상할 수 있어요.',
    joinEyebrow: 'YOUR NEXT STORY IS READY',
    joinTitle: ['오늘부터,', '마음껏 빠져보세요.'],
    joinDescription: [
      '이메일 주소만 입력하면 시작할 수 있습니다.',
      '멤버십은 언제든 변경하거나 해지하세요.',
    ],
    form: {
      emailLabel: '이메일 주소',
      placeholder: 'name@example.com',
      submit: '시작하기',
      hint: '월 6,900원 · 약정 없음 · 언제든 해지',
      error: '이메일 주소를 정확히 입력해 주세요.',
    },
    faqEyebrow: 'GOOD TO KNOW',
    faqTitle: '가입 전, 이것만 확인하세요.',
    faqDescription: '궁금한 내용을 선택하면 바로 답을 확인할 수 있어요.',
    faqs: [
      [
        '광고는 얼마나 자주 나오나요?',
        '콘텐츠와 러닝타임에 따라 달라지지만, 이야기의 흐름을 고려해 짧은 광고가 자연스러운 지점에 배치됩니다.',
      ],
      [
        '어떤 화질로 볼 수 있나요?',
        'TV, 컴퓨터, 스마트폰과 태블릿에서 최대 Full HD(1080p) 화질로 감상할 수 있습니다.',
      ],
      [
        '여러 기기에서 동시에 볼 수 있나요?',
        '네. 광고형 스탠다드 멤버십은 한 계정으로 최대 2대의 디바이스에서 동시에 시청할 수 있습니다.',
      ],
      [
        '언제든 해지할 수 있나요?',
        '물론입니다. 별도의 약정이나 해지 수수료 없이 계정에서 언제든 멤버십을 변경하거나 해지할 수 있습니다.',
      ],
    ],
    footer: ['자주 묻는 질문', '계정', '고객센터', '개인정보 문의'],
    copyright: '© 2026 ilog. All rights reserved.',
    mobileBarLabel: '멤버십 빠른 가입',
  },
  en: {
    htmlLang: 'en-KR',
    homeLabel: 'ilog home',
    navLabel: 'On this page',
    accountLabel: 'Account menu',
    nav: ['Benefits', 'How it works', 'Plan details', 'FAQ'],
    login: 'Sign in',
    start: 'Get started',
    language: '한국어',
    languageHref: '/ads-plan',
    heroEyebrow: 'SMART PRICE. FULL STORY.',
    heroLine1: 'Every story you want.',
    heroPrice: 'Just KRW 6,900.',
    heroDescription: 'Enjoy ilog films and series in Full HD,',
    heroDescriptionTail: 'with short, seamless ads.',
    planName: 'Standard with ads',
    recommended: 'Best value',
    monthly: 'Monthly price',
    currency: 'KRW',
    price: '6,900',
    adNote: 'Short, seamless ads',
    details: [
      { label: 'Quality', value: 'Full HD', note: '1080p' },
      { label: 'Watch at once', value: '2 devices', note: 'anywhere' },
      { label: 'Downloads', value: 'Included', note: 'offline' },
    ],
    startWithPrice: 'Get started for KRW 6,900',
    cancelNote: 'No contract. Change or cancel anytime.',
    scrollLabel: 'Discover the benefits',
    benefitsEyebrow: "WHY YOU'LL LOVE IT",
    benefitsTitle: ['Easy on your budget.', 'Big on entertainment.'],
    benefits: [
      {
        eyebrow: 'LESS INTERRUPTION',
        title: 'Stay in the story',
        description:
          'Short ads are placed at natural breaks, so the moments that matter stay uninterrupted.',
      },
      {
        eyebrow: 'FULL HD',
        title: 'Sharp from every angle',
        description:
          'Enjoy vivid 1080p picture quality at an accessible price.',
      },
      {
        eyebrow: 'TOGETHER',
        title: 'Two screens at once',
        description:
          'Different tastes, same time. Stream on up to two devices simultaneously.',
      },
      {
        eyebrow: 'OFFLINE',
        title: 'Take every story with you',
        description:
          'Download your favorites and watch on the go without using mobile data.',
      },
    ],
    values: [
      ['About', 'KRW 230 a day'],
      ['', 'Full HD quality'],
      ['Watch on', '2 devices'],
      ['', 'Downloads included'],
    ],
    journeyEyebrow: 'START IN 3 STEPS',
    journeyTitle: ['Nothing complicated.', 'Just three easy steps.'],
    journeyDescription:
      'Go from sign-up to your first scene in minutes. No contract or installation required.',
    startNow: 'Start now',
    steps: [
      ['Enter your email', 'Add your email and a few basic profile details.'],
      ['Confirm your plan', 'Review Standard with ads at KRW 6,900 per month.'],
      ['Press play', 'Pick something you love and start watching in Full HD.'],
    ],
    includedAlt: 'People exploring stories in a futuristic media space',
    perMonth: '/ month',
    includedEyebrow: 'EVERYTHING INCLUDED',
    includedTitle: 'Know exactly what you get.',
    includedDescription:
      'All the essentials, with no hidden conditions. Sign in on supported devices and pick up where you left off.',
    features: [
      ['Monthly price', 'KRW 6,900'],
      ['Maximum quality', 'Full HD · 1080p'],
      ['Simultaneous streams', '2 devices'],
      ['Profiles', 'Up to 5'],
      ['Downloads', 'Included'],
      ['Change or cancel', 'Anytime'],
    ],
    devices: 'TV · mobile · tablet · web',
    deviceNote: 'Keep watching across your favorite devices.',
    joinEyebrow: 'YOUR NEXT STORY IS READY',
    joinTitle: ['Start today.', 'Get lost in every story.'],
    joinDescription: [
      'Enter your email to create your membership.',
      'Change or cancel your plan anytime.',
    ],
    form: {
      emailLabel: 'Email address',
      placeholder: 'name@example.com',
      submit: 'Get started',
      hint: 'KRW 6,900/month · No contract · Cancel anytime',
      error: 'Please enter a valid email address.',
    },
    faqEyebrow: 'GOOD TO KNOW',
    faqTitle: 'A few things before you join.',
    faqDescription: 'Select a question to get the answer right away.',
    faqs: [
      [
        'How often will I see ads?',
        'Ad frequency varies by title and runtime. Short ads are thoughtfully placed at natural breaks in the story.',
      ],
      [
        'What video quality is included?',
        'Watch in up to Full HD (1080p) on supported TVs, computers, phones, and tablets.',
      ],
      [
        'Can I watch on multiple devices?',
        'Yes. Standard with ads lets you stream on up to two devices at the same time.',
      ],
      [
        'Can I cancel anytime?',
        'Absolutely. There is no long-term contract or cancellation fee. Change or cancel your membership from your account anytime.',
      ],
    ],
    footer: ['FAQ', 'Account', 'Help center', 'Privacy inquiries'],
    copyright: '© 2026 ilog. All rights reserved.',
    mobileBarLabel: 'Quick plan sign-up',
  },
} as const

export function getPlanCopy(locale: PlanLocale, market: PlanMarket) {
  const base = PLAN_COPY[locale]
  const region = getPlanRegion(market)
  const displayPrice = formatPlanPrice(market, locale)
  const currency =
    region.currency === 'USD' ? '$' : locale === 'ko' ? '₩' : 'KRW'
  const price =
    region.currency === 'USD'
      ? region.monthlyPrice.toFixed(2)
      : region.monthlyPrice.toLocaleString('en-US')
  const dailyPrice =
    region.currency === 'USD'
      ? `$${(region.monthlyPrice / 30).toFixed(2)}`
      : `₩${Math.round(region.monthlyPrice / 30).toLocaleString('en-US')}`

  if (locale === 'ko') {
    const localizedPrice =
      region.currency === 'KRW' ? `${price}원` : displayPrice
    const localizedDailyPrice =
      region.currency === 'KRW'
        ? `${Math.round(region.monthlyPrice / 30).toLocaleString('en-US')}원`
        : dailyPrice
    return {
      ...base,
      currency,
      price,
      heroPrice: `월 ${localizedPrice}.`,
      startWithPrice: `${localizedPrice}으로 시작하기`,
      values: [
        ['하루 약', localizedDailyPrice],
        ['', 'Full HD 화질'],
        ['동시 시청', '2대'],
        ['', '다운로드 지원'],
      ],
      steps: [
        ['이메일로 시작', '사용할 이메일과 기본 프로필 정보를 입력하세요.'],
        [
          '멤버십 확인',
          `월 ${localizedPrice} 광고형 스탠다드를 확인하고 결제하세요.`,
        ],
        ['바로 감상', '좋아하는 작품을 골라 Full HD로 바로 시작하세요.'],
      ],
      features: [
        ['월 이용료', localizedPrice],
        ['최대 화질', 'Full HD · 1080p'],
        ['동시 시청', '2대'],
        ['프로필', '최대 5개'],
        ['콘텐츠 저장', '지원'],
        ['멤버십 변경·해지', '언제든 가능'],
      ],
      form: {
        ...base.form,
        hint: `${localizedPrice}/월 · 약정 없음 · 언제든 해지`,
      },
    } as const
  }

  return {
    ...base,
    currency,
    price,
    heroPrice: `${market === 'US' ? 'Only' : 'Just'} ${displayPrice} a month.`,
    startWithPrice: `Get started for ${displayPrice}`,
    cancelNote:
      region.taxDisplay === 'added-at-checkout'
        ? 'No contract. Cancel anytime. Taxes may apply.'
        : 'No contract. Change or cancel anytime.',
    values: [
      ['About', `${dailyPrice} a day`],
      ['', 'Full HD quality'],
      ['Watch on', '2 devices'],
      ['', 'Downloads included'],
    ],
    steps: [
      ['Enter your email', 'Add your email and a few basic profile details.'],
      [
        'Confirm your plan',
        `Review Standard with ads at ${displayPrice} per month.`,
      ],
      ['Press play', 'Pick something you love and start watching in Full HD.'],
    ],
    features: [
      ['Monthly price', displayPrice],
      ['Maximum quality', 'Full HD · 1080p'],
      ['Simultaneous streams', '2 devices'],
      ['Profiles', 'Up to 5'],
      ['Downloads', 'Included'],
      ['Change or cancel', 'Anytime'],
    ],
    form: {
      ...base.form,
      hint:
        region.taxDisplay === 'added-at-checkout'
          ? `${displayPrice}/month · Taxes may apply · Cancel anytime`
          : `${displayPrice}/month · No contract · Cancel anytime`,
    },
  } as const
}
