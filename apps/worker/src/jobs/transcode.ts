import { NotImplementedError } from '@aidream/core'

export interface TranscodeJobInput {
  readonly assetId: string
  readonly signal?: AbortSignal
}

export type TranscodeJobResult = 'COMPLETED' | 'SKIPPED'

export function processTranscodeJob(
  input: TranscodeJobInput,
): Promise<TranscodeJobResult> {
  void input
  throw new NotImplementedError('T06:transcodeJob')
}
