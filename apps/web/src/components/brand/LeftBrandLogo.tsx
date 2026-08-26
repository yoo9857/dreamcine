import Image from 'next/image'
import type { ReactNode } from 'react'

export function LeftBrandLogo({
  priority = false,
}: {
  readonly priority?: boolean
}): ReactNode {
  return (
    <>
      <Image
        src="/brand/leftlogo.png"
        alt=""
        width={180}
        height={60}
        sizes="(max-width: 767px) 128px, 160px"
        priority={priority}
        className="brand-left-logo"
      />
      <span className="sr-only">ilog</span>
    </>
  )
}
