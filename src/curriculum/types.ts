import type { Color, PieceSymbol, Square } from '@/chess/game'
import type { OverlayKind } from '@/components/board/boardModel'

/* ---------------------------------------------------------------------------
 * Lessons are data, not code.
 *
 * Every lesson is a plain object: a position, something to understand or do,
 * and the wording to teach it with. That keeps the ~100 authored lessons out
 * of the component layer, and — more importantly — makes them *checkable*.
 * `curriculum.test.ts` walks every lesson in the book and proves its FEN is
 * legal, its solution is a legal move, and that solution really does satisfy
 * the lesson's own acceptance rule. Content bugs in a teaching app are worse
 * than code bugs, because they teach the wrong thing confidently.
 * ------------------------------------------------------------------------ */

/** What counts as a correct answer. Declarative so it can be validated. */
export type Acceptance =
  /** One of these exact moves, in algebraic notation. */
  | { kind: 'exact-san'; san: string[] }
  /** Any legal move landing on one of these squares. */
  | { kind: 'destination'; squares: Square[] }
  /** Any legal move by the piece standing here. */
  | { kind: 'piece-from'; square: Square }
  /** Capture whatever stands on this square. */
  | { kind: 'capture-on'; square: Square }
  | { kind: 'gives-check' }
  | { kind: 'delivers-mate' }
  /** Any move that nets at least this many pawns. */
  | { kind: 'wins-material'; atLeast: number }
  /** Any move that does not hand material away. */
  | { kind: 'stays-safe' }
  | { kind: 'castles'; side?: 'kingside' | 'queenside' }
  | { kind: 'promotes'; to?: PieceSymbol }
  | { kind: 'en-passant' }
  /** Escape a check by this specific route. */
  | { kind: 'escapes-check'; via: 'move-king' | 'block' | 'capture' }

export interface LessonBase {
  id: string
  title: string
  /** Teaching text as paragraphs. */
  body: string[]
  fen: string
  orientation?: Color
  /** Progressive hints, revealed one at a time on request. */
  hints?: string[]
  arrows?: Array<{ from: Square; to: Square; label?: string; dashed?: boolean }>
  highlights?: Partial<Record<Square, OverlayKind>>
  /** Show the control heatmap by default for this lesson. */
  showControl?: boolean
  /**
   * True when the board is a bare teaching diagram rather than a real game.
   * A two-king board is technically an immediate draw by insufficient
   * material, and the coach announcing "Draw — insufficient material" during a
   * lesson about square names is just noise.
   */
  demoBoard?: boolean
}

/** Read and understand. No move required. */
export interface ExplainLesson extends LessonBase {
  kind: 'explain'
}

/** Play one move that satisfies the acceptance rule. */
export interface DoLesson extends LessonBase {
  kind: 'do'
  objective: string
  accept: Acceptance
  /** A move known to satisfy `accept`. Asserted by the validator. */
  solution: string
  successText: string
  /** Shown when a legal but wrong move is played. */
  retryText?: string
}

/**
 * A multi-move problem. `line` alternates the learner's moves and the
 * opponent's replies, starting with the learner.
 */
export interface PuzzleLesson extends LessonBase {
  kind: 'puzzle'
  objective: string
  line: string[]
  successText: string
  retryText?: string
}

export type DrillKind =
  | 'name-the-square'
  | 'square-colour'
  | 'who-attacks'
  | 'mate-in-one'
  | 'hanging-piece'
  | 'best-capture'

/** Endless randomised repetition of a single skill. */
export interface DrillLesson extends LessonBase {
  kind: 'drill'
  objective: string
  drill: DrillKind
  /** Correct answers needed to clear it. */
  target: number
}

export type Lesson = ExplainLesson | DoLesson | PuzzleLesson | DrillLesson

export interface Chapter {
  id: string
  number: number
  title: string
  /** One line describing what the learner walks away with. */
  outcome: string
  lessons: Lesson[]
  /** Chapters that should be finished first. */
  requires?: string[]
}

export function lessonCount(chapters: Chapter[]): number {
  return chapters.reduce((total, chapter) => total + chapter.lessons.length, 0)
}

export function findLesson(chapters: Chapter[], id: string): Lesson | undefined {
  for (const chapter of chapters) {
    const lesson = chapter.lessons.find((l) => l.id === id)
    if (lesson) return lesson
  }
  return undefined
}

export function chapterOf(chapters: Chapter[], lessonId: string): Chapter | undefined {
  return chapters.find((c) => c.lessons.some((l) => l.id === lessonId))
}

/** Flat lesson order across the whole book, for next/previous navigation. */
export function lessonSequence(chapters: Chapter[]): Array<{ chapter: Chapter; lesson: Lesson }> {
  return chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ chapter, lesson })))
}
