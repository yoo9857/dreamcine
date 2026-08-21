import type { AgeRating, Page, Series } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

export interface CreateSeriesData {
  ownerId: string
  slug: string
  title: string
  synopsis?: string | null
  posterKey?: string | null
  ageRating?: AgeRating
}

export interface UpdateSeriesData {
  title?: string
  synopsis?: string | null
  posterKey?: string | null
  ageRating?: AgeRating
  isCompleted?: boolean
  commentsOff?: boolean
}

export interface ListSeriesByOwnerOptions {
  ownerId: string
  limit: number
  cursor?: string
  includeDeleted?: false
}

export function findSeriesById(_id: string): Promise<Series | null> {
  throw new NotImplementedError('T02:findSeriesById')
}

export function findSeriesBySlug(_slug: string): Promise<Series | null> {
  throw new NotImplementedError('T02:findSeriesBySlug')
}

export function listSeriesByOwner(
  _options: ListSeriesByOwnerOptions,
): Promise<Page<Series>> {
  throw new NotImplementedError('T02:listSeriesByOwner')
}

export function createSeries(_input: CreateSeriesData): Promise<Series> {
  throw new NotImplementedError('T02:createSeries')
}

export function updateSeries(
  _id: string,
  _input: UpdateSeriesData,
): Promise<Series> {
  throw new NotImplementedError('T02:updateSeries')
}

export function softDeleteSeries(_id: string): Promise<Series> {
  throw new NotImplementedError('T02:softDeleteSeries')
}
