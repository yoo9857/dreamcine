import type { CreateCreatorApplicationInput } from '@aidream/core'
import {
  saveCreatorApplication,
  type CreatorApplicationRecord,
} from '@aidream/db'

export interface SubmitCreatorApplicationDependencies {
  save: typeof saveCreatorApplication
  now: () => Date
}

export function submitCreatorApplication(
  input: CreateCreatorApplicationInput,
  dependencies: SubmitCreatorApplicationDependencies = {
    save: saveCreatorApplication,
    now: () => new Date(),
  },
): Promise<CreatorApplicationRecord> {
  return dependencies.save(input, dependencies.now())
}
