'use client'

import type { ShaderMount } from '@paper-design/shaders'
import { clsx } from 'clsx'
import { Sparkles } from 'lucide-react'
import * as React from 'react'
import { twMerge } from 'tailwind-merge'

import '@/src/styles/liquid-metal-button.css'

export interface LiquidMetalButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label?: string
  viewMode?: 'text' | 'icon'
}

/** Native form button with a decorative, lazily loaded metal shader. */
export function LiquidMetalButton({
  label = 'Get Started',
  viewMode = 'text',
  type = 'button',
  disabled = false,
  className,
  onClick,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...props
}: LiquidMetalButtonProps) {
  const shaderRef = React.useRef<HTMLSpanElement>(null)
  const shaderMount = React.useRef<ShaderMount | null>(null)
  const hoveredRef = React.useRef(false)
  const reducedRef = React.useRef(false)
  const pulseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const rippleTimers = React.useRef(new Set<ReturnType<typeof setTimeout>>())
  const rippleId = React.useRef(0)
  const [isHovered, setIsHovered] = React.useState(false)
  const [isPressed, setIsPressed] = React.useState(false)
  const [renderMode, setRenderMode] = React.useState('fallback')
  const [ripples, setRipples] = React.useState<
    readonly { x: number; y: number; id: number }[]
  >([])

  React.useEffect(() => {
    const node = shaderRef.current
    if (node === null) return
    let disposed = false
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => {
      reducedRef.current = preference.matches
      shaderMount.current?.setSpeed(
        preference.matches || disabled ? 0 : hoveredRef.current ? 1 : 0.45,
      )
    }
    updateMotion()
    preference.addEventListener('change', updateMotion)

    const mount = async () => {
      try {
        const { ShaderMount: MetalMount, liquidMetalFragmentShader } =
          await import('@paper-design/shaders')
        if (disposed) return
        shaderMount.current = new MetalMount(
          node,
          liquidMetalFragmentShader,
          {
            u_repetition: 4,
            u_softness: 0.38,
            u_shiftRed: 0.18,
            u_shiftBlue: 0.18,
            u_distortion: 0.02,
            u_contour: 0.1,
            u_angle: 45,
            u_scale: 0.9,
            u_shape: 0,
            u_isImage: false,
            u_colorBack: [0, 0, 0, 0],
            u_colorTint: [0.78, 0.85, 0.94, 0.12],
            u_fit: 2,
            u_rotation: 0,
            u_originX: 0.5,
            u_originY: 0.5,
            u_offsetX: 0.1,
            u_offsetY: -0.1,
            u_worldWidth: 0,
            u_worldHeight: 0,
          },
          { alpha: true, antialias: false, powerPreference: 'low-power' },
          reducedRef.current || disabled ? 0 : hoveredRef.current ? 1 : 0.45,
          400,
          1.5,
          100_000,
        )
        setRenderMode('shader')
      } catch {
        // A static metal rim keeps the button usable without WebGL.
        if (!disposed) {
          node.replaceChildren()
          setRenderMode('fallback')
        }
      }
    }
    void mount()
    const timers = rippleTimers.current
    return () => {
      disposed = true
      preference.removeEventListener('change', updateMotion)
      shaderMount.current?.dispose()
      shaderMount.current = null
      if (pulseTimer.current !== null) clearTimeout(pulseTimer.current)
      for (const timer of timers) clearTimeout(timer)
      timers.clear()
    }
  }, [disabled])

  const resetSpeed = () => {
    shaderMount.current?.setSpeed(
      reducedRef.current || disabled ? 0 : hoveredRef.current ? 1 : 0.45,
    )
  }
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!reducedRef.current) {
      shaderMount.current?.setSpeed(2.4)
      if (pulseTimer.current !== null) clearTimeout(pulseTimer.current)
      pulseTimer.current = setTimeout(resetSpeed, 300)
      const rect = event.currentTarget.getBoundingClientRect()
      const ripple = {
        x: event.detail === 0 ? rect.width / 2 : event.clientX - rect.left,
        y: event.detail === 0 ? rect.height / 2 : event.clientY - rect.top,
        id: rippleId.current++,
      }
      setRipples((previous) => [...previous, ripple])
      const timer = setTimeout(() => {
        setRipples((previous) =>
          previous.filter((item) => item.id !== ripple.id),
        )
        rippleTimers.current.delete(timer)
      }, 600)
      rippleTimers.current.add(timer)
    }
    onClick?.(event)
  }

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      className={twMerge(clsx('liquid-metal-button', className))}
      data-view-mode={viewMode}
      data-hovered={isHovered}
      data-pressed={isPressed}
      data-render-mode={renderMode}
      aria-label={props['aria-label'] ?? label}
      onClick={handleClick}
      onPointerEnter={(event) => {
        hoveredRef.current = true
        setIsHovered(true)
        resetSpeed()
        onPointerEnter?.(event)
      }}
      onPointerLeave={(event) => {
        hoveredRef.current = false
        setIsHovered(false)
        setIsPressed(false)
        resetSpeed()
        onPointerLeave?.(event)
      }}
      onPointerDown={(event) => {
        setIsPressed(true)
        onPointerDown?.(event)
      }}
      onPointerUp={(event) => {
        setIsPressed(false)
        onPointerUp?.(event)
      }}
      onPointerCancel={(event) => {
        setIsPressed(false)
        onPointerCancel?.(event)
      }}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') setIsPressed(true)
        onKeyDown?.(event)
      }}
      onKeyUp={(event) => {
        setIsPressed(false)
        onKeyUp?.(event)
      }}
      onBlur={(event) => {
        setIsPressed(false)
        onBlur?.(event)
      }}
    >
      <span
        ref={shaderRef}
        className="liquid-metal-shader"
        aria-hidden="true"
      />
      <span className="liquid-metal-face" aria-hidden="true" />
      <span className="liquid-metal-label">
        {viewMode === 'icon' ? <Sparkles aria-hidden="true" /> : label}
      </span>
      <span className="liquid-metal-ripples" aria-hidden="true">
        {ripples.map((ripple) => (
          <span key={ripple.id} style={{ left: ripple.x, top: ripple.y }} />
        ))}
      </span>
    </button>
  )
}
