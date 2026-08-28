export const OPEN_EPISODE_CREATOR = 'ilog:open-episode-creator'

export function openEpisodeCreator(): void {
  window.dispatchEvent(new Event(OPEN_EPISODE_CREATOR))
}
