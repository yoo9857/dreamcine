import type { AgeRating, Episode, EpisodeStatus, Page } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

export interface CreateEpisodeData {
  seriesId: string
  seasonId?: string | null
  number: number
  title: string
  description?: string | null
  ageRating?: AgeRating
  aiDisclosure?: string | null
}

export interface UpdateEpisodeData {
  title?: string
  description?: string | null
  thumbKey?: string | null
  ageRating?: AgeRating
  aiDisclosure?: string | null
  assetId?: string | null
}

export interface ListEpisodesOptions {
  seriesId: string
  status?: EpisodeStatus[]
  includeDeleted?: false
  limit: number
  cursor?: string
}

export function findEpisodeById(_id: string): Promise<Episode | null> {
  throw new NotImplementedError('T02:findEpisodeById')
}

export function listEpisodesBySeries(
  _options: ListEpisodesOptions,
): Promise<Page<Episode>> {
  throw new NotImplementedError('T02:listEpisodesBySeries')
}

export function createEpisode(_input: CreateEpisodeData): Promise<Episode> {
  throw new NotImplementedError('T02:createEpisode')
}

export function updateEpisode(
  _id: string,
  _input: UpdateEpisodeData,
): Promise<Episode> {
  throw new NotImplementedError('T02:updateEpisode')
}

export function updateEpisodeStatus(
  _id: string,
  _next: EpisodeStatus,
  _patch: { publishAt?: Date | null; publishedAt?: Date | null },
): Promise<Episode> {
  throw new NotImplementedError('T02:updateEpisodeStatus')
}

export function softDeleteEpisode(_id: string): Promise<Episode> {
  throw new NotImplementedError('T02:softDeleteEpisode')
}
