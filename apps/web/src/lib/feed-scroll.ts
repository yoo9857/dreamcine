const STORAGE_PREFIX = 'aidream:feed-scroll:'

function storageKey(): string {
  return `${STORAGE_PREFIX}${window.location.pathname}${window.location.search}`
}

export function rememberFeedScrollPosition(): void {
  try {
    window.sessionStorage.setItem(storageKey(), String(window.scrollY))
  } catch {
    // Storage can be unavailable in private or hardened browser contexts.
    return
  }
}

export function readFeedScrollPosition(): number | null {
  try {
    const value = window.sessionStorage.getItem(storageKey())
    if (value === null) return null
    const position = Number(value)
    return Number.isFinite(position) && position >= 0 ? position : null
  } catch {
    return null
  }
}

export function forgetFeedScrollPosition(): void {
  try {
    window.sessionStorage.removeItem(storageKey())
  } catch {
    // See rememberFeedScrollPosition.
    return
  }
}
