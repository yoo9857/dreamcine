import type { FeedItem } from '@aidream/core'
import type { PublicUserSummary } from '@aidream/core'
import {
  ArrowUpRight,
  Clock3,
  Eye,
  Maximize,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Settings2,
  Sparkles,
  Volume2,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { UserTierLine } from '@/src/components/user/UserTierLine'

function duration(value: number | null): string {
  if (value === null) return '--:--'
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}

function count(value: string | number): string {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value))
}

function artwork(item: FeedItem, index: number): string {
  const fallback = [
    '/brand/works/red-horizon.png',
    '/brand/works/paper-dance.png',
    '/brand/posters/city.png',
    '/brand/posters/memory.png',
    '/brand/posters/tomorrow.png',
  ] as const
  return item.thumbUrl ?? fallback[index % fallback.length] ?? fallback[0]
}

function ShortCard({
  item,
  index,
}: {
  readonly item: FeedItem
  readonly index: number
}): ReactNode {
  return (
    <Link className="watch-short-card" href={`/watch/${item.episodeId}`}>
      <div>
        <img src={artwork(item, index)} alt="" />
        <span>
          <Play fill="currentColor" /> SHORT
        </span>
      </div>
      <section>
        <h3>{item.title}</h3>
        <p>
          <UserTierLine user={item.creator} link={false} compact />
        </p>
        <small>
          <Clock3 /> {duration(item.durationSec)}
        </small>
      </section>
    </Link>
  )
}

function LongCard({
  item,
  index,
}: {
  readonly item: FeedItem
  readonly index: number
}): ReactNode {
  return (
    <Link className="watch-long-card" href={`/watch/${item.episodeId}`}>
      <div className="watch-long-art">
        <img src={artwork(item, index)} alt="" />
        <span>{duration(item.durationSec)}</span>
        <i>
          <Play fill="currentColor" />
        </i>
      </div>
      <h3>{item.title}</h3>
      <p>
        <UserTierLine user={item.creator} link={false} compact />
      </p>
      <small>
        <Eye /> 조회 {count(item.viewCount)} · 좋아요 {count(item.likeCount)}
      </small>
    </Link>
  )
}

export function WatchPreviewPlayer({
  posterUrl,
}: {
  readonly posterUrl: string
}): ReactNode {
  return (
    <div
      className="watch-preview-player"
      aria-label="플레이어 레이아웃 미리보기"
    >
      <img src={posterUrl} alt="" />
      <i className="watch-preview-vignette" />
      <button
        className="watch-preview-center"
        type="button"
        aria-label="미리보기 재생"
      >
        <Play fill="currentColor" />
      </button>
      <div className="watch-preview-controls">
        <div className="watch-preview-timeline">
          <i />
        </div>
        <div className="watch-preview-control-row">
          <div>
            <button type="button" aria-label="재생">
              <Play fill="currentColor" />
            </button>
            <button type="button" aria-label="10초 뒤로">
              <RotateCcw />
              <small>10</small>
            </button>
            <button type="button" aria-label="10초 앞으로">
              <RotateCw />
              <small>10</small>
            </button>
            <button type="button" aria-label="음소거">
              <Volume2 />
            </button>
            <span>
              <strong>00:00</strong> / 24:42
            </span>
          </div>
          <div>
            <button type="button" aria-label="재생 설정">
              <Settings2 />
            </button>
            <button type="button" aria-label="화면 속 화면">
              <PictureInPicture2 />
            </button>
            <button type="button" aria-label="전체 화면">
              <Maximize />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WatchExperience({
  player,
  title,
  seriesTitle,
  description,
  creator,
  viewCount,
  publishedAt,
  actions,
  shortItems,
  longItems,
  comments,
}: {
  readonly player: ReactNode
  readonly title: string
  readonly seriesTitle: string
  readonly description: string | null
  readonly creator: PublicUserSummary
  readonly viewCount: string
  readonly publishedAt: string | null
  readonly actions: ReactNode
  readonly shortItems: readonly FeedItem[]
  readonly longItems: readonly FeedItem[]
  readonly comments: ReactNode
}): ReactNode {
  return (
    <main className="watch-experience">
      <div className="watch-stage-grid">
        <div className="watch-primary">
          <div className="watch-player-shell">{player}</div>
          <section className="watch-now-playing">
            <div className="watch-now-kicker">
              <span>NOW PLAYING</span>
              <i /> {seriesTitle}
            </div>
            <h1>{title}</h1>
            <div className="watch-meta-line">
              <Link
                href={`/u/${encodeURIComponent(creator.handle)}`}
                className="watch-creator"
              >
                {creator.avatarUrl === null ? (
                  <span>{creator.displayName.slice(0, 1)}</span>
                ) : (
                  <img src={creator.avatarUrl} alt="" />
                )}
                <div>
                  <strong>
                    {/* 바깥이 이미 프로필 링크다 — 중첩 링크를 만들지 않는다. */}
                    <UserTierLine user={creator} link={false} />
                  </strong>
                  <small>@{creator.handle}</small>
                </div>
              </Link>
              <p>
                <Eye /> 조회 {count(viewCount)}
                {publishedAt === null ? '' : ` · ${publishedAt}`}
              </p>
              <div className="watch-actions">{actions}</div>
            </div>
            {description === null ? null : (
              <p className="watch-synopsis">{description}</p>
            )}
          </section>
          <section
            className="watch-comments"
            id="reviews"
            aria-label="리뷰와 댓글"
          >
            {comments}
          </section>
        </div>

        <aside className="watch-side" aria-label="다음 콘텐츠">
          <Link href="/works" className="watch-brand-banner">
            <span>
              <Sparkles /> ILOG CURATED
            </span>
            <h2>
              다음 장면을
              <br />
              발견하세요.
            </h2>
            <p>길게 몰입하고, 짧게 발견하는 새로운 작품 큐.</p>
            <div>
              작품 둘러보기 <ArrowUpRight />
            </div>
          </Link>
          <section className="watch-short-list">
            <header>
              <div>
                <span>QUICK WATCH</span>
                <h2>다른 숏폼</h2>
              </div>
              <Link href="/works">전체 보기</Link>
            </header>
            <div>
              {shortItems.slice(0, 3).map((item, index) => (
                <ShortCard item={item} index={index} key={item.episodeId} />
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="watch-long-section">
        <header>
          <div>
            <span>KEEP WATCHING</span>
            <h2>이어 볼 롱폼</h2>
            <p>한 편의 이야기에 더 깊이 빠져보세요.</p>
          </div>
          <Link href="/works">
            모든 작품 <ArrowUpRight />
          </Link>
        </header>
        <div className="watch-long-grid">
          {longItems.slice(0, 6).map((item, index) => (
            <LongCard item={item} index={index} key={item.episodeId} />
          ))}
        </div>
      </section>
    </main>
  )
}
