import { NotImplementedError } from '@aidream/core'

export function recoverStuck(
  olderThanMinutes: number,
  now: Date,
): Promise<number> {
  void olderThanMinutes
  void now
  throw new NotImplementedError('T06:recoverStuck')
}
