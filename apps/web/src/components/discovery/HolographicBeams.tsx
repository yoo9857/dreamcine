'use client'

import React, { type CSSProperties, type ReactNode } from 'react'

interface HolographicBeamsProps {
  readonly className?: string
  readonly density?: number
  readonly speed?: number
  readonly aberration?: number
  readonly opacity?: number
  readonly style?: CSSProperties
}

export function HolographicBeams({
  className,
  density = 30,
  speed = 1,
  aberration = 2.5,
  opacity = 50,
  style,
}: HolographicBeamsProps): ReactNode {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (canvas === null || container === null) return

    const context = canvas.getContext('2d')
    if (context === null) return

    let width = container.offsetWidth
    let height = container.offsetHeight
    let time = 0
    let animationFrame = 0

    const noise = (position: number, offset: number): number =>
      (Math.sin(position * 0.01 + offset) +
        Math.sin(position * 0.03 + offset * 2) * 0.5 +
        Math.sin(position * 0.1 + offset * 4) * 0.25) /
      1.75

    const resize = (): void => {
      width = container.offsetWidth
      height = container.offsetHeight
      canvas.width = width
      canvas.height = height
    }

    const drawBeam = (
      position: number,
      offset: number,
      color: string,
      scale: number,
    ): void => {
      const wave = noise(position, offset * 0.5)
      const beamHeight = height * (0.6 + wave * 0.4)
      const beamWidth = (width / density) * scale
      const gradient = context.createLinearGradient(
        position,
        height,
        position,
        height - beamHeight,
      )
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, 'transparent')
      context.fillStyle = gradient
      context.beginPath()
      context.moveTo(position - beamWidth / 2, height)
      context.lineTo(position + beamWidth / 2, height)
      context.lineTo(position + beamWidth, height - beamHeight)
      context.lineTo(position - beamWidth, height - beamHeight)
      context.fill()
    }

    const draw = (): void => {
      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'screen'
      time += 0.01 * speed
      const spacing = width / density

      for (let index = 0; index <= density; index += 1) {
        const position = index * spacing
        const redOpacity =
          (opacity / 100) * (0.5 + 0.5 * Math.cos(index * 0.5 + time))
        drawBeam(
          position - aberration,
          time + index * 0.1,
          // Exact chromatic channel from the referenced canvas component.
          // eslint-disable-next-line no-restricted-syntax
          `rgba(255, 0, 0, ${String(redOpacity * 0.5)})`,
          1.5,
        )

        const blueOpacity =
          (opacity / 100) * (0.5 + 0.5 * Math.sin(index * 0.6 + time * 1.1))
        drawBeam(
          position + aberration,
          time + index * 0.12 + 10,
          // Exact chromatic channel from the referenced canvas component.
          // eslint-disable-next-line no-restricted-syntax
          `rgba(0, 50, 255, ${String(blueOpacity * 0.5)})`,
          1.5,
        )

        const whiteOpacity =
          (opacity / 100) * (0.6 + 0.4 * Math.sin(index * 0.3 - time))
        drawBeam(
          position,
          time + index * 0.1 + 5,
          // Exact chromatic channel from the referenced canvas component.
          // eslint-disable-next-line no-restricted-syntax
          `rgba(200, 255, 255, ${String(whiteOpacity * 0.3)})`,
          0.8,
        )
      }

      animationFrame = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize)
    resize()
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrame)
    }
  }, [aberration, density, opacity, speed])

  return (
    <div
      ref={containerRef}
      className={`holographic-beams${className === undefined ? '' : ` ${className}`}`}
      style={style}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} />
      <div className="holographic-beams-scanlines" />
      <div className="holographic-beams-vignette" />
    </div>
  )
}
