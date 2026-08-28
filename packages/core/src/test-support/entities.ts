import type {
  Episode,
  PublicUserSummary,
  Series,
  User,
  UserProfile,
} from '../entities.js'

/**
 * 도메인 엔티티 기본값.
 *
 * 왜 여기 있는가: `User` · `Series` · `Episode` 는 필드가 40개를 넘는다. 테스트가
 * 전체 리터럴을 손으로 적으면 스키마에 필드가 하나 늘 때마다 무관한 테스트
 * 수십 개가 동시에 깨진다. 실제로 T15·T16 에서 web·worker 양쪽 20여 곳이 한꺼번에
 * 깨졌다.
 *
 * `packages/core` 에 두는 이유: `apps/web` 과 `apps/worker` 가 둘 다 써야 한다.
 * `no-app-to-app` 규칙이 앱 간 import 를 막으므로 공용 위치는 패키지뿐이다.
 * 제품 배럴(`src/index.ts`)에 넣지 않고 `@aidream/core/test-support` 서브패스로
 * 내보내, 제품 코드가 실수로 픽스처를 import 하는 경로를 없앤다.
 *
 * 규칙: 기본값은 **DB 기본값과 같아야 한다.** 다르면 테스트가 통과하는데
 * 운영에서 깨지는 조합이 생긴다.
 */
const EPOCH = new Date('2026-01-01T00:00:00.000Z')

export function userFixture(overrides: Partial<User> = {}): User {
  return {
    id: 'user_fixture',
    handle: 'fixture',
    email: 'fixture@example.com',
    emailVerified: null,
    passwordHash: null,
    displayName: 'Fixture',
    bio: null,
    avatarKey: null,
    role: 'VIEWER',
    status: 'ACTIVE',
    tier: 'BRONZE',
    tierPoints: 0,
    tierEvaluatedAt: null,
    roleGrantedAt: null,
    roleGrantedBy: null,
    bannerKey: null,
    channelDescription: null,
    channelKeywords: [],
    trailerEpisodeId: null,
    profileVisibility: 'PUBLIC',
    hideFollowerCount: false,
    verifiedAt: null,
    country: null,
    locale: 'ko-KR',
    timezone: 'Asia/Seoul',
    birthDate: null,
    phone: null,
    phoneVerifiedAt: null,
    defaultAgeRating: 'ALL',
    defaultLanguage: 'ko',
    defaultLicense: 'STANDARD',
    followerCount: 0,
    followingCount: 0,
    seriesCount: 0,
    episodeCount: 0,
    totalViews: '0',
    lastLoginAt: null,
    lastSeenAt: null,
    loginCount: 0,
    signupIpHash: null,
    signupUserAgent: null,
    signupReferrer: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    suspendedUntil: null,
    suspendReason: null,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    deletedAt: null,
    ...overrides,
  }
}

export function seriesFixture(overrides: Partial<Series> = {}): Series {
  return {
    id: 'series_fixture',
    ownerId: 'user_fixture',
    slug: 'series-fixture',
    title: 'Series Fixture',
    synopsis: null,
    workType: 'SERIES',
    posterKey: null,
    ageRating: 'ALL',
    isCompleted: false,
    commentsOff: false,
    bannerKey: null,
    categoryId: null,
    language: 'ko',
    visibility: 'PUBLIC',
    keywords: [],
    trailerEpisodeId: null,
    firstAiredAt: null,
    metaTitle: null,
    metaDescription: null,
    ogImageKey: null,
    canonicalPath: null,
    madeForKids: false,
    license: 'STANDARD',
    contentWarnings: [],
    regionsAllowed: [],
    regionsBlocked: [],
    episodeCount: 0,
    totalViews: '0',
    totalLikes: 0,
    followerCount: 0,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    deletedAt: null,
    ...overrides,
  }
}

export function episodeFixture(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 'episode_fixture',
    seriesId: 'series_fixture',
    seasonId: null,
    assetId: null,
    number: 1,
    title: 'Episode Fixture',
    description: null,
    thumbKey: null,
    status: 'DRAFT',
    ageRating: 'ALL',
    visibility: 'PUBLIC',
    durationSec: null,
    language: 'ko',
    categoryId: null,
    keywords: [],
    allowEmbed: true,
    allowDownload: false,
    recordedAt: null,
    metaTitle: null,
    metaDescription: null,
    ogImageKey: null,
    canonicalPath: null,
    madeForKids: false,
    license: 'STANDARD',
    contentWarnings: [],
    regionsAllowed: [],
    regionsBlocked: [],
    aiDisclosure: null,
    aiModels: [],
    aiTools: [],
    aiHumanRole: null,
    aiGeneratedPct: null,
    publishAt: null,
    publishedAt: null,
    viewCount: '0',
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    impressionCount: '0',
    avgWatchSec: 0,
    rankScore: 0,
    createdAt: EPOCH,
    updatedAt: EPOCH,
    deletedAt: null,
    ...overrides,
  }
}

/**
 * 공개 사용자 요약. 피드 크리에이터·댓글 작성자·검색 결과가 같은 모양을 쓰므로
 * 픽스처도 하나면 된다.
 */
export function publicUserFixture(
  overrides: Partial<PublicUserSummary> = {},
): PublicUserSummary {
  return {
    handle: 'fixture',
    displayName: 'Fixture',
    avatarUrl: null,
    tier: 'BRONZE',
    isVerified: false,
    ...overrides,
  }
}

export function userProfileFixture(
  overrides: Partial<UserProfile> = {},
): UserProfile {
  return {
    ...publicUserFixture(),
    bio: null,
    channelDescription: null,
    bannerUrl: null,
    channelKeywords: [],
    country: null,
    locale: 'ko-KR',
    role: 'VIEWER',
    tierPoints: 0,
    followerCount: 0,
    followingCount: 0,
    seriesCount: 0,
    episodeCount: 0,
    totalViews: '0',
    joinedAt: EPOCH,
    trailerEpisodeId: null,
    links: [],
    isFollowing: false,
    isBlocked: false,
    ...overrides,
  }
}
