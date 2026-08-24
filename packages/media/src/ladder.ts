export type RenditionName = '1080p' | '720p' | '480p' | '360p'

export interface RenditionSpec {
  readonly name: RenditionName
  readonly width: number
  readonly height: number
  readonly videoBitrateKbps: number
  readonly audioBitrateKbps: number
}

interface RenditionPreset {
  readonly name: RenditionName
  readonly longSide: number
  readonly videoBitrateKbps: number
  readonly audioBitrateKbps: number
}

const PRESETS: readonly RenditionPreset[] = [
  {
    name: '1080p',
    longSide: 1920,
    videoBitrateKbps: 5000,
    audioBitrateKbps: 128,
  },
  {
    name: '720p',
    longSide: 1280,
    videoBitrateKbps: 2800,
    audioBitrateKbps: 128,
  },
  {
    name: '480p',
    longSide: 854,
    videoBitrateKbps: 1400,
    audioBitrateKbps: 96,
  },
  {
    name: '360p',
    longSide: 640,
    videoBitrateKbps: 800,
    audioBitrateKbps: 96,
  },
]

function evenFloor(value: number): number {
  return Math.floor(value / 2) * 2
}

function dimensions(
  width: number,
  height: number,
  longSide: number,
): { width: number; height: number } {
  if (width >= height) {
    return {
      width: longSide,
      height: evenFloor((height / width) * longSide),
    }
  }
  return {
    width: evenFloor((width / height) * longSide),
    height: longSide,
  }
}

export function buildLadder(
  width: number,
  height: number,
  allowed: readonly RenditionName[],
): RenditionSpec[] {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    Math.max(width, height) < 640 ||
    Math.min(width, height) < 360
  ) {
    return []
  }

  const sourceLongSide = Math.max(width, height)
  const allowedNames = new Set(allowed)

  return PRESETS.filter(
    (preset) =>
      allowedNames.has(preset.name) && sourceLongSide >= preset.longSide,
  ).map((preset) => ({
    name: preset.name,
    ...dimensions(width, height, preset.longSide),
    videoBitrateKbps: preset.videoBitrateKbps,
    audioBitrateKbps: preset.audioBitrateKbps,
  }))
}
