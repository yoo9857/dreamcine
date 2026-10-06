'use client'

import type HlsType from 'hls.js'
import { Play } from 'lucide-react'
import React, {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'

interface FestivalFilm {
  readonly title: string
  readonly creator: string
  readonly duration: string
  readonly logline: string
  readonly page: string
  readonly hls: string
  readonly poster: string
  readonly width: number
  readonly height: number
}

/** Higgsfield Global Film Festival 출품작. 페이지에 박혀 있는 재생 정보. */
const FILMS: readonly FestivalFilm[] = [
  {
    title: 'THREAD',
    creator: 'pandaproduction',
    duration: '5:44',
    logline:
      '골목의 물길이 검게 흐르는 시간. 슬픔과 기쁨이 낯선 사람처럼 스쳐 지나고, 한 창 너머에서 무언가가 일어나려 하거나 이미 일어났다.',
    page: 'https://higgsfield.ai/ko/@pandaproduction/projects/thread',
    hls: 'https://cdn.higgsfield.ai/hls/video_input/97f832bd-1d33-4562-bb3f-c34364a9f93c/index.m3u8',
    poster:
      'https://d2ol7oe51mr4n9.cloudfront.net/user_39tDAPbknLeiOHGT4b1AsPWiZ3z/d54e034b-40b5-48be-bd07-e3441c28f499.webp',
    width: 3840,
    height: 1648,
  },
  {
    title: 'Borrowed Wounds',
    creator: 'jeffzambrano',
    duration: '14:30',
    logline:
      '사무라이 의식에서는 모든 상처가 무릎 꿇은 다음 사람에게 넘어간다. 수십 년을 견딘 한 노인이 마침내 일어서기로 한다.',
    page: 'https://higgsfield.ai/ko/@jeffzambrano/projects/borrowed-wounds',
    hls: 'https://cdn.higgsfield.ai/hls/video_input_watermarked/2688a1ee-de6a-4e57-bf68-546e8d34f257/aa67b49b-6553-48c6-b6d6-f314a0b150bd/index.m3u8?v=aa67b49b-6553-48c6-b6d6-f314a0b150bd',
    poster:
      'https://cdn.higgsfield.ai/hls/video_input_watermarked/2688a1ee-de6a-4e57-bf68-546e8d34f257/aa67b49b-6553-48c6-b6d6-f314a0b150bd/thumbnail.webp?v=aa67b49b-6553-48c6-b6d6-f314a0b150bd',
    width: 2520,
    height: 1080,
  },
]

/**
 * 원본 mp4 는 수 GB 라 목록에서 바로 받지 않는다.
 * 재생을 누르기 전에는 포스터만 보여주고, 그때 HLS 세그먼트를 받기 시작한다.
 */
function useHiggsfieldPlayback(
  videoRef: RefObject<HTMLVideoElement | null>,
  src: string,
  active: boolean,
): void {
  useEffect(() => {
    const video = videoRef.current
    if (!active || video === null) return

    let cancelled = false
    let hls: HlsType | null = null

    const start = async (): Promise<void> => {
      if (video.canPlayType('application/vnd.apple.mpegurl') !== '') {
        video.src = src
        void video.play().catch(() => undefined)
        return
      }

      const module = await import('hls.js')
      if (cancelled || !module.default.isSupported()) return
      hls = new module.default({
        autoStartLoad: true,
        capLevelToPlayerSize: true,
        maxBufferLength: 20,
      })
      hls.attachMedia(video)
      hls.loadSource(src)
      hls.on(module.default.Events.MANIFEST_PARSED, () => {
        if (!cancelled) void video.play().catch(() => undefined)
      })
    }

    void start()
    return () => {
      cancelled = true
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
  }, [active, src, videoRef])
}

function FestivalFilmCard({
  film,
}: {
  readonly film: FestivalFilm
}): ReactNode {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  useHiggsfieldPlayback(videoRef, film.hls, playing)

  return (
    <article className="works-partner-film">
      <div className="works-partner-stage">
        <video
          ref={videoRef}
          controls={playing}
          playsInline
          preload="none"
          poster={film.poster}
          style={{
            aspectRatio: `${String(film.width)} / ${String(film.height)}`,
          }}
          aria-label={`${film.title}, ${film.creator}`}
        />
        {playing ? null : (
          <button
            type="button"
            className="works-partner-play"
            onClick={() => {
              setPlaying(true)
            }}
          >
            <Play aria-hidden="true" />
            <span className="sr-only">{film.title} 재생</span>
          </button>
        )}
      </div>
      <div className="works-partner-copy">
        <span>HIGGSFIELD × ILOG</span>
        <h3>{film.title}</h3>
        <p>{film.logline}</p>
        <p>
          {film.creator} · {film.duration} · Global Film Festival
        </p>
        <a href={film.page} target="_blank" rel="noreferrer">
          Higgsfield에서 보기
          <span className="sr-only"> (새 창)</span>
        </a>
      </div>
    </article>
  )
}

export function HiggsfieldThread(): ReactNode {
  return (
    <div className="works-partner-list">
      {FILMS.map((film) => (
        <FestivalFilmCard film={film} key={film.title} />
      ))}
    </div>
  )
}
