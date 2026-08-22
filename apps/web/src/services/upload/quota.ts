import { AppError, type Capacity } from '@aidream/core'
import { sumUploadBytesSince } from '@aidream/db'

/**
 * 하루치 업로드 총량을 넘지 않는지 본다. (06_MEDIA_PIPELINE.md §2 검증 4단계)
 *
 * **상한은 티어에서 읽는다.** T0 는 10GiB, T1 이상은 50GiB —
 * `05_API_CONTRACT` §10 은 50GB 를 고정값처럼 적고 있지만 그것은 T1/T2 의
 * 값이다. 06 §2 가 "모든 상한은 capacity 객체에서 읽는다" 를 이유까지 적어
 * 명시하므로 그쪽을 따른다. (ISS-009)
 *
 * 창은 **최근 24시간**이다. 자정 기준으로 하면 23:59 에 하루치를 다 쓰고
 * 00:01 에 또 하루치를 쓸 수 있다.
 */
const WINDOW_MS = 24 * 60 * 60 * 1000

export async function assertDailyQuota(
  userId: string,
  incomingBytes: number,
  capacity: Capacity,
): Promise<void> {
  const since = new Date(Date.now() - WINDOW_MS)
  const used = await sumUploadBytesSince(userId, since)
  const total = used + BigInt(incomingBytes)

  if (total > BigInt(capacity.uploadDailyBytes)) {
    /*
      남은 양을 detail 에 담는다. 08_UIUX_SPEC §10 은 "다음 행동을 제시한다"
      를 요구하는데, 얼마나 남았는지 모르면 사용자가 할 수 있는 일이 없다.
    */
    const remaining = BigInt(capacity.uploadDailyBytes) - used
    throw new AppError('E_UPLOAD_QUOTA_EXCEEDED', {
      usedBytes: used.toString(),
      limitBytes: capacity.uploadDailyBytes,
      remainingBytes: (remaining < 0n ? 0n : remaining).toString(),
      resetsAt: new Date(Date.now() + WINDOW_MS).toISOString(),
    })
  }
}
