import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

export function AdminPagination({
  nextCursor,
  path,
  params = {},
}: {
  nextCursor: string | null
  path: string
  params?: Readonly<Record<string, string | undefined>>
}) {
  const first = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') first.set(key, value)
  }
  const next = new URLSearchParams(first)
  if (nextCursor !== null) next.set('cursor', nextCursor)
  const firstQuery = first.toString()
  return (
    <footer className="admin-pagination">
      <Link href={firstQuery === '' ? path : `${path}?${firstQuery}`}>
        <ArrowLeft /> 처음으로
      </Link>
      {nextCursor === null ? (
        <span>마지막 페이지입니다.</span>
      ) : (
        <Link className="is-next" href={`${path}?${next.toString()}`}>
          다음 페이지 <ArrowRight />
        </Link>
      )}
    </footer>
  )
}
