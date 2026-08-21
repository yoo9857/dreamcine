import type { UpdateProfileInput } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

import type { MeResult } from './get-me'

export function updateMe(
  _userId: string,
  _input: UpdateProfileInput,
): Promise<MeResult> {
  throw new NotImplementedError('T03:updateMe')
}
