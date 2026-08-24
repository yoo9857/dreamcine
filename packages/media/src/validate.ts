import { NotImplementedError, type Capacity } from '@aidream/core'

import type { ProbeResult } from './probe.js'

export function validateProbe(result: ProbeResult, capacity: Capacity): void {
  void result
  void capacity
  throw new NotImplementedError('T06:validateProbe')
}
