import { NotImplementedError } from '@aidream/core'

export interface DeleteEpisodeMediaInput {
  readonly assetId: string
}

export function deleteEpisodeMedia(
  _input: DeleteEpisodeMediaInput,
): Promise<void> {
  throw new NotImplementedError('T08:deleteEpisodeMedia')
}
