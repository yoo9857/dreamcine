import { episodeFixture } from '@aidream/core/test-support'
import type { FeedRow } from '@aidream/db'

/**
 * 웹 전용 픽스처. 순수 도메인 엔티티 픽스처는 `@aidream/core/test-support` 가
 * 소유한다 — `apps/worker` 도 같은 값을 써야 하고 `no-app-to-app` 규칙이 앱 간
 * import 를 막기 때문이다.
 *
 * 여기 남는 것은 `@aidream/db` 타입에 의존해 core 에 둘 수 없는 것뿐이다.
 */
export {
  episodeFixture,
  publicUserFixture,
  seriesFixture,
  userFixture,
  userProfileFixture,
} from '@aidream/core/test-support'

const EPOCH = new Date('2026-01-01T00:00:00.000Z')

export function feedRowFixture(overrides: Partial<FeedRow> = {}): FeedRow {
  return {
    ...episodeFixture({ status: 'PUBLISHED', publishedAt: EPOCH }),
    creatorId: 'user_fixture',
    seriesTitle: 'Series Fixture',
    seriesSlug: 'series-fixture',
    creatorHandle: 'fixture',
    creatorDisplayName: 'Fixture',
    creatorAvatarKey: null,
    creatorTier: 'BRONZE',
    creatorVerifiedAt: null,
    durationSec: 120,
    ...overrides,
  }
}
