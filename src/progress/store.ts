/* ---------------------------------------------------------------------------
 * Progress, kept in the browser.
 *
 * Everything lives in localStorage: no account, no server, nothing leaves the
 * machine. Every read and write is wrapped, because storage throws outright in
 * private windows and in browsers configured to block site data — and losing
 * progress is annoying, but a crash on load would make the app unusable.
 * ------------------------------------------------------------------------ */

const STORAGE_KEY = 'master-chess.progress.v1'

export interface DrillRecord {
  attempts: number
  correct: number
}

export interface ReviewItem {
  /** Lesson or motif this came from. */
  topic: string
  /** When it should next be shown, as an epoch millisecond timestamp. */
  dueAt: number
  /** How many times it has been answered right in a row. */
  streak: number
}

export interface Progress {
  version: 1
  /** Lesson ids the learner has completed. */
  completed: string[]
  /** Per-drill accuracy. */
  drills: Record<string, DrillRecord>
  /** Spaced-repetition queue, seeded by things they got wrong. */
  review: ReviewItem[]
  /** Engine strength last used in Play mode. */
  opponentElo: number
  coachMode: 'silent' | 'warn' | 'explain'
  /** Last lesson opened, so the app can offer to resume. */
  lastLessonId: string | null
}

export const DEFAULT_PROGRESS: Progress = {
  version: 1,
  completed: [],
  drills: {},
  review: [],
  opponentElo: 800,
  coachMode: 'warn',
  lastLessonId: null,
}

function safeRead(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROGRESS
    const parsed = JSON.parse(raw) as Partial<Progress>
    if (parsed.version !== 1) return DEFAULT_PROGRESS
    // Merge over defaults so a field added in a later build cannot produce
    // undefined where the UI expects a value.
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      drills: parsed.drills ?? {},
      review: Array.isArray(parsed.review) ? parsed.review : [],
    }
  } catch {
    return DEFAULT_PROGRESS
  }
}

function safeWrite(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage unavailable or full. The session still works; only persistence
    // is lost, and telling the learner would not help them.
  }
}

export function loadProgress(): Progress {
  return safeRead()
}

export function saveProgress(progress: Progress): Progress {
  safeWrite(progress)
  return progress
}

export function resetProgress(): Progress {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing to do */
  }
  return DEFAULT_PROGRESS
}

/* --- updates, all pure ---------------------------------------------------- */

export function markCompleted(progress: Progress, lessonId: string): Progress {
  if (progress.completed.includes(lessonId)) return progress
  return { ...progress, completed: [...progress.completed, lessonId] }
}

export function setLastLesson(progress: Progress, lessonId: string): Progress {
  return { ...progress, lastLessonId: lessonId }
}

export function recordDrill(
  progress: Progress,
  drillId: string,
  wasCorrect: boolean,
): Progress {
  const existing = progress.drills[drillId] ?? { attempts: 0, correct: 0 }
  return {
    ...progress,
    drills: {
      ...progress.drills,
      [drillId]: {
        attempts: existing.attempts + 1,
        correct: existing.correct + (wasCorrect ? 1 : 0),
      },
    },
  }
}

/**
 * Intervals between repetitions, in days, indexed by streak length. A missed
 * item drops back to the start; a correct one moves up one step. This is
 * deliberately the simplest scheme that works — the value is in reviewing at
 * all, not in the exact curve.
 */
const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35]
const DAY_MS = 86_400_000

export function scheduleReview(
  progress: Progress,
  topic: string,
  wasCorrect: boolean,
  now: number = Date.now(),
): Progress {
  const existing = progress.review.find((item) => item.topic === topic)
  const streak = wasCorrect ? Math.min((existing?.streak ?? 0) + 1, REVIEW_INTERVAL_DAYS.length - 1) : 0
  const days = REVIEW_INTERVAL_DAYS[streak] ?? 1
  const item: ReviewItem = { topic, streak, dueAt: now + days * DAY_MS }

  return {
    ...progress,
    review: [...progress.review.filter((r) => r.topic !== topic), item],
  }
}

export function dueReviews(progress: Progress, now: number = Date.now()): ReviewItem[] {
  return progress.review.filter((item) => item.dueAt <= now).sort((a, b) => a.dueAt - b.dueAt)
}

export function setOpponentElo(progress: Progress, elo: number): Progress {
  return { ...progress, opponentElo: elo }
}

export function setCoachMode(progress: Progress, coachMode: Progress['coachMode']): Progress {
  return { ...progress, coachMode }
}

/** Overall completion as a 0–1 fraction. */
export function completionRatio(progress: Progress, totalLessons: number): number {
  if (totalLessons === 0) return 0
  return Math.min(1, progress.completed.length / totalLessons)
}

export function drillAccuracy(record: DrillRecord | undefined): number | null {
  if (!record || record.attempts === 0) return null
  return record.correct / record.attempts
}
