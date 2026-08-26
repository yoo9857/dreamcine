'use client'

import {
  ArrowDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import React, { type ReactNode, useState } from 'react'

export interface ProfilePopularItem {
  readonly id: string
  readonly title: string
  readonly image: string
  readonly views: string
  readonly href?: string
}

export function ProfilePopularCarousel({
  items,
  profileName,
}: {
  readonly items: readonly ProfilePopularItem[]
  readonly profileName: string
}): ReactNode {
  const [active, setActive] = useState(0)
  const current = items[active] ?? items[0]
  if (current === undefined) return null

  function move(by: number): void {
    setActive((index) => (index + by + items.length) % items.length)
  }

  return (
    <div className="profile-popular">
      {items.map((item, index) => (
        <img
          key={item.id}
          src={item.image}
          alt={
            index === active
              ? `${item.title} 대표 이미지`
              : `${profileName}의 작품 ${String(index + 1)}`
          }
          className={index === active ? 'is-active' : ''}
          aria-hidden={index === active ? undefined : true}
        />
      ))}
      <div className="profile-popular-shade" />
      <div className="profile-popular-kicker">
        <span>가장 인기 있는 작품</span>
        <span>{current.views} VIEWS</span>
      </div>

      {items.length > 1 ? (
        <div className="profile-carousel-arrows">
          <button
            type="button"
            onClick={() => {
              move(-1)
            }}
            aria-label="이전 작품"
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              move(1)
            }}
            aria-label="다음 작품"
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="profile-popular-caption">
        <div>
          <p>FEATURED</p>
          <h2>{current.title}</h2>
        </div>
        {current.href === undefined ? (
          <a href="#works" aria-label="작품 목록으로 이동">
            <ArrowDown aria-hidden="true" />
          </a>
        ) : (
          <Link href={current.href} aria-label={`${current.title} 보기`}>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        )}
      </div>

      <div className="profile-popular-controls" aria-label="인기 작품 선택">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={index === active ? 'is-active' : ''}
            onClick={() => {
              setActive(index)
            }}
            aria-label={`${item.title} 보기`}
            aria-current={index === active ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  )
}
