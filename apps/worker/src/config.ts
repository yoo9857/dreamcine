import {
  loadCapacity,
  loadServerEnv,
  type Capacity,
  type CapacityTier,
  type ServerEnv,
} from '@aidream/core'
import { z } from 'zod'

export type ProcessRole = 'worker' | 'scheduler'

export interface WorkerConfig {
  readonly env: ServerEnv
  readonly capacityTier: CapacityTier
  readonly capacity: Capacity
  readonly processRole: ProcessRole
}

const ProcessRoleSchema = z.enum(['worker', 'scheduler']).default('worker')

export function loadWorkerConfig(
  input: NodeJS.ProcessEnv = process.env,
): WorkerConfig {
  const env = loadServerEnv(input)
  return {
    env,
    capacityTier: env.CAPACITY_TIER,
    capacity: loadCapacity(env.CAPACITY_TIER),
    processRole: ProcessRoleSchema.parse(input.PROCESS_ROLE),
  }
}
