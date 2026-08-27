'use client'

import {
  FullscreenControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl'
import { useEffect, useRef } from 'react'

const mapStyles = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
} as const

interface AudienceCountry {
  readonly code: string
  readonly name: string
  readonly views: number
  readonly watchHours: number
  readonly share: number
  readonly longitude: number
  readonly latitude: number
}

function documentTheme(): keyof typeof mapStyles {
  if (document.documentElement.dataset.theme === 'dark') return 'dark'
  if (document.documentElement.dataset.theme === 'light') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function compact(value: number): string {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function createPopupContent(country: AudienceCountry): HTMLDivElement {
  const root = document.createElement('div')
  root.className = 'admin-map-popup'

  const title = document.createElement('strong')
  title.textContent = country.name
  root.append(title)

  const list = document.createElement('dl')
  const rows = [
    ['조회수', compact(country.views)],
    ['시청 시간', `${compact(country.watchHours)}시간`],
    ['전체 비중', `${String(country.share)}%`],
  ] as const

  for (const [label, value] of rows) {
    const row = document.createElement('div')
    const term = document.createElement('dt')
    const description = document.createElement('dd')
    term.textContent = label
    description.textContent = value
    row.append(term, description)
    list.append(row)
  }
  root.append(list)
  return root
}

setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

export function AdminAudienceMap({
  countries,
}: {
  readonly countries: readonly AudienceCountry[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new MapLibreMap({
      container,
      style: mapStyles[documentTheme()],
      center: [18, 18],
      zoom: 0.5,
      minZoom: 0,
      maxZoom: 8,
      renderWorldCopies: false,
      attributionControl: { compact: true },
    })

    map.addControl(
      new NavigationControl({ showCompass: false, visualizePitch: false }),
      'bottom-right',
    )
    map.addControl(new FullscreenControl(), 'bottom-right')
    map.once('load', () => {
      map.fitBounds(
        [
          [-170, -52],
          [170, 70],
        ],
        { padding: 22, duration: 0 },
      )
    })

    const markers = countries.map((country) => {
      const element = document.createElement('div')
      const size = Math.min(46, Math.max(22, 18 + country.share * 0.55))
      element.className = 'admin-map-marker-shell'
      element.style.setProperty('--marker-size', `${String(size)}px`)

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'admin-map-marker'
      button.setAttribute(
        'aria-label',
        `${country.name}, 조회수 ${compact(country.views)}, 비중 ${String(country.share)}%`,
      )
      const code = document.createElement('span')
      code.textContent = country.code
      button.append(code)
      const tooltip = createPopupContent(country)
      element.append(button, tooltip)

      const focusCountry = () => {
        map.easeTo({
          center: [country.longitude, country.latitude],
          zoom: Math.max(map.getZoom(), 3.2),
          duration: 700,
        })
      }

      button.addEventListener('click', focusCountry)

      const marker = new Marker({ element, anchor: 'center' })
        .setLngLat([country.longitude, country.latitude])
        .addTo(map)

      return { button, element, marker, tooltip, focusCountry }
    })

    const positionTooltips = () => {
      const containerRect = container.getBoundingClientRect()
      const leftPadding = 8
      const rightPadding = 58

      for (const item of markers) {
        const markerRect = item.element.getBoundingClientRect()
        const tooltipRect = item.tooltip.getBoundingClientRect()
        const markerCenter = markerRect.left + markerRect.width / 2
        const halfTooltip = tooltipRect.width / 2
        const minimumCenter = containerRect.left + leftPadding + halfTooltip
        const maximumCenter = containerRect.right - rightPadding - halfTooltip
        const safeCenter = Math.min(
          maximumCenter,
          Math.max(minimumCenter, markerCenter),
        )

        item.tooltip.style.setProperty(
          '--tooltip-shift-x',
          `${String(safeCenter - markerCenter)}px`,
        )
        item.tooltip.classList.toggle(
          'is-below',
          markerRect.top - tooltipRect.height - 10 < containerRect.top,
        )
      }
    }

    map.on('move', positionTooltips)
    map.on('resize', positionTooltips)
    map.once('idle', positionTooltips)
    for (const item of markers) {
      item.element.addEventListener('mouseenter', positionTooltips)
      item.button.addEventListener('focus', positionTooltips)
    }

    const themeObserver = new MutationObserver(() => {
      map.setStyle(mapStyles[documentTheme()], { diff: true })
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      themeObserver.disconnect()
      map.off('move', positionTooltips)
      map.off('resize', positionTooltips)
      for (const item of markers) {
        item.element.removeEventListener('mouseenter', positionTooltips)
        item.button.removeEventListener('focus', positionTooltips)
        item.button.removeEventListener('click', item.focusCountry)
        item.marker.remove()
      }
      map.remove()
    }
  }, [countries])

  return (
    <div
      ref={containerRef}
      className="admin-audience-map"
      role="region"
      aria-label="국가별 시청자 인터랙티브 세계 지도"
    />
  )
}
