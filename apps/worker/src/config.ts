import type { Capacity, CapacityTier, ServerEnv } from '@aidream/core'

export type ProcessRole = 'worker' | 'scheduler'

export interface WorkerConfig {
  readonly env: ServerEnv
  readonly capacityTier: CapacityTier
  readonly capacity: Capacity
  readonly processRole: ProcessRole
}
