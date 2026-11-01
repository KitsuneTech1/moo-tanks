const BEST_SCORE_KEY = 'moo-tanks-best'

export function readBestScore(storage?: Storage): number {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(BEST_SCORE_KEY)
    const value = Number(raw ?? '0')
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
  } catch {
    return 0
  }
}

export function writeBestScore(value: number, storage?: Storage) {
  try {
    const safeValue = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
    ;(storage ?? globalThis.localStorage).setItem(BEST_SCORE_KEY, String(safeValue))
  } catch {
    // Local storage is optional. A blocked or full store must not stop the game.
  }
}
