import { BUCKET, deletePrefix, hlsPrefix } from '@aidream/storage'

export interface DeleteEpisodeMediaInput {
  readonly assetId: string
}

export interface DeleteEpisodeMediaDependencies {
  readonly removePrefix: (assetId: string) => Promise<void>
}

export function deleteEpisodeMedia(
  input: DeleteEpisodeMediaInput,
  dependencies: DeleteEpisodeMediaDependencies = PRODUCTION_DEPENDENCIES,
): Promise<void> {
  return dependencies.removePrefix(input.assetId)
}

const PRODUCTION_DEPENDENCIES: DeleteEpisodeMediaDependencies = {
  removePrefix: async (assetId) => {
    await deletePrefix(BUCKET.HLS, hlsPrefix(assetId))
  },
}
