// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PROGRESS,
  completionRatio,
  drillAccuracy,
  dueReviews,
  loadProgress,
  markCompleted,
  recordDrill,
  resetProgress,
  saveProgress,
  scheduleReview,
} from './store'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('persistence', () => {
  it('starts from defaults with nothing stored', () => {
    expect(loadProgress()).toEqual(DEFAULT_PROGRESS)
  })

  it('round-trips through localStorage', () => {
    saveProgress(markCompleted(DEFAULT_PROGRESS, 'board-grid'))
    expect(loadProgress().completed).toEqual(['board-grid'])
  })

  it('falls back to defaults on corrupt data rather than throwing', () => {
    localStorage.setItem('master-chess.progress.v1', '{not json at all')
    expect(loadProgress()).toEqual(DEFAULT_PROGRESS)
  })

  it('ignores progress saved by an incompatible version', () => {
    localStorage.setItem('master-chess.progress.v1', JSON.stringify({ version: 99, completed: ['x'] }))
    expect(loadProgress().completed).toEqual([])
  })

  it('fills in fields missing from older saved data', () => {
    localStorage.setItem('master-chess.progress.v1', JSON.stringify({ version: 1 }))
    const loaded = loadProgress()
    expect(loaded.completed).toEqual([])
    expect(loaded.drills).toEqual({})
    expect(loaded.opponentElo).toBe(DEFAULT_PROGRESS.opponentElo)
  })

  it('survives storage being unavailable', () => {
    // Private windows and blocked-site-data settings make these throw.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('access denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('access denied')
    })
    expect(loadProgress()).toEqual(DEFAULT_PROGRESS)
    expect(() => saveProgress(DEFAULT_PROGRESS)).not.toThrow()
  })

  it('clears everything on reset', () => {
    saveProgress(markCompleted(DEFAULT_PROGRESS, 'board-grid'))
    expect(resetProgress().completed).toEqual([])
    expect(loadProgress().completed).toEqual([])
  })
})

describe('completion', () => {
  it('does not record the same lesson twice', () => {
    let progress = markCompleted(DEFAULT_PROGRESS, 'a')
    progress = markCompleted(progress, 'a')
    expect(progress.completed).toEqual(['a'])
  })

  it('reports a completion ratio', () => {
    const progress = markCompleted(markCompleted(DEFAULT_PROGRESS, 'a'), 'b')
    expect(completionRatio(progress, 8)).toBe(0.25)
    expect(completionRatio(progress, 0)).toBe(0)
  })

  it('never exceeds one even with stale lesson ids', () => {
    let progress = DEFAULT_PROGRESS
    for (const id of ['a', 'b', 'c']) progress = markCompleted(progress, id)
    expect(completionRatio(progress, 2)).toBe(1)
  })
})

describe('drills', () => {
  it('tracks attempts and accuracy', () => {
    let progress = recordDrill(DEFAULT_PROGRESS, 'coords', true)
    progress = recordDrill(progress, 'coords', false)
    progress = recordDrill(progress, 'coords', true)
    expect(progress.drills.coords).toEqual({ attempts: 3, correct: 2 })
    expect(drillAccuracy(progress.drills.coords)).toBeCloseTo(2 / 3)
  })

  it('reports no accuracy before any attempt', () => {
    expect(drillAccuracy(undefined)).toBeNull()
    expect(drillAccuracy({ attempts: 0, correct: 0 })).toBeNull()
  })
})

describe('spaced repetition', () => {
  const NOW = 1_700_000_000_000
  const DAY = 86_400_000

  it('schedules a missed topic for immediate review', () => {
    const progress = scheduleReview(DEFAULT_PROGRESS, 'fork', false, NOW)
    expect(progress.review[0]?.streak).toBe(0)
    expect(progress.review[0]?.dueAt).toBe(NOW)
    expect(dueReviews(progress, NOW)).toHaveLength(1)
  })

  it('pushes a correct topic further out each time', () => {
    let progress = scheduleReview(DEFAULT_PROGRESS, 'fork', true, NOW)
    expect(progress.review[0]?.dueAt).toBe(NOW + 1 * DAY)
    progress = scheduleReview(progress, 'fork', true, NOW)
    expect(progress.review[0]?.dueAt).toBe(NOW + 3 * DAY)
    progress = scheduleReview(progress, 'fork', true, NOW)
    expect(progress.review[0]?.dueAt).toBe(NOW + 7 * DAY)
  })

  it('resets the interval when a topic is missed again', () => {
    let progress = scheduleReview(DEFAULT_PROGRESS, 'fork', true, NOW)
    progress = scheduleReview(progress, 'fork', true, NOW)
    progress = scheduleReview(progress, 'fork', false, NOW)
    expect(progress.review[0]?.streak).toBe(0)
    expect(progress.review[0]?.dueAt).toBe(NOW)
  })

  it('keeps one entry per topic', () => {
    let progress = scheduleReview(DEFAULT_PROGRESS, 'fork', true, NOW)
    progress = scheduleReview(progress, 'pin', true, NOW)
    progress = scheduleReview(progress, 'fork', true, NOW)
    expect(progress.review).toHaveLength(2)
  })

  it('does not offer topics that are not due yet', () => {
    const progress = scheduleReview(DEFAULT_PROGRESS, 'fork', true, NOW)
    expect(dueReviews(progress, NOW)).toHaveLength(0)
    expect(dueReviews(progress, NOW + 2 * DAY)).toHaveLength(1)
  })

  it('caps the interval rather than growing forever', () => {
    let progress = DEFAULT_PROGRESS
    for (let i = 0; i < 20; i++) progress = scheduleReview(progress, 'fork', true, NOW)
    expect(progress.review[0]?.dueAt).toBe(NOW + 35 * DAY)
  })
})
