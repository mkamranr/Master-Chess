import { Position } from '@/chess/game'
import { moveSatisfies } from './acceptance'
import type { Chapter, Lesson } from './types'

/* ---------------------------------------------------------------------------
 * Lesson validation.
 *
 * A wrong FEN or an unsolvable puzzle is worse than a crash: the learner
 * assumes they are the problem. So every authored lesson is machine-checked,
 * and `curriculum.test.ts` fails the build if any of them is broken.
 * ------------------------------------------------------------------------ */

export interface LessonProblem {
  lessonId: string
  problem: string
}

export function validateLesson(lesson: Lesson): LessonProblem[] {
  const problems: LessonProblem[] = []
  const fail = (problem: string) => problems.push({ lessonId: lesson.id, problem })

  if (lesson.body.length === 0) fail('has no teaching text')
  if (!lesson.title.trim()) fail('has no title')

  const validity = Position.validate(lesson.fen)
  if (!validity.ok) {
    fail(`has an invalid FEN (${validity.error}): ${lesson.fen}`)
    return problems // nothing else can be checked without a position
  }

  const position = Position.fromFen(lesson.fen)

  // `validateFen` checks the notation, not the legality of the position. It
  // happily accepts a board where the side that is NOT to move stands in
  // check, which can never arise in a real game — the previous move would
  // have been illegal. This slipped a broken position into an early draft of
  // Chapter 4, so it is checked explicitly.
  const passed = position.withTurnPassed()
  if (passed?.status().inCheck) {
    fail(
      'is an impossible position: the side that is not to move is in check, ' +
        'which means the previous move was illegal',
    )
  }

  // A lesson that asks for a move must not start from a finished game.
  // Explain lessons and drills are exempt: an explain lesson may legitimately
  // illustrate a finished game (stalemate, insufficient material), and a drill
  // generates its own positions rather than playing from this one.
  if (lesson.kind !== 'explain' && lesson.kind !== 'drill' && position.status().isGameOver) {
    fail('starts from a position where the game is already over')
  }

  if (lesson.kind === 'do') {
    const move = position.findMoveBySan(lesson.solution)
    if (!move) {
      fail(`solution "${lesson.solution}" is not a legal move in ${lesson.fen}`)
    } else if (!moveSatisfies(position, move, lesson.accept)) {
      fail(
        `solution "${lesson.solution}" is legal but does not satisfy its own acceptance rule ` +
          `(${lesson.accept.kind})`,
      )
    }
    if (!lesson.objective.trim()) fail('has no objective')
    if (!lesson.successText.trim()) fail('has no success message')
  }

  if (lesson.kind === 'puzzle') {
    if (lesson.line.length === 0) {
      fail('has an empty solution line')
    } else {
      let current = position
      for (const [index, san] of lesson.line.entries()) {
        const move = current.findMoveBySan(san)
        if (!move) {
          fail(`move ${index + 1} of the line ("${san}") is not legal at ${current.fen()}`)
          break
        }
        current = current.after(move)
      }
    }
    if (!lesson.objective.trim()) fail('has no objective')
  }

  if (lesson.kind === 'drill' && lesson.target < 1) {
    fail('has a drill target below 1')
  }

  // Arrows and highlights must point at squares that exist in this position's
  // frame of reference; a typo here silently draws nothing.
  for (const arrow of lesson.arrows ?? []) {
    if (arrow.from === arrow.to) fail(`has an arrow from ${arrow.from} to itself`)
  }

  return problems
}

export function validateChapters(chapters: Chapter[]): LessonProblem[] {
  const problems: LessonProblem[] = []
  const seenLessonIds = new Set<string>()
  const seenChapterIds = new Set<string>()

  for (const chapter of chapters) {
    if (seenChapterIds.has(chapter.id)) {
      problems.push({ lessonId: chapter.id, problem: 'duplicate chapter id' })
    }
    seenChapterIds.add(chapter.id)

    if (chapter.lessons.length === 0) {
      problems.push({ lessonId: chapter.id, problem: 'chapter has no lessons' })
    }

    for (const requirement of chapter.requires ?? []) {
      if (!chapters.some((c) => c.id === requirement)) {
        problems.push({
          lessonId: chapter.id,
          problem: `requires chapter "${requirement}", which does not exist`,
        })
      }
    }

    for (const lesson of chapter.lessons) {
      if (seenLessonIds.has(lesson.id)) {
        problems.push({ lessonId: lesson.id, problem: 'duplicate lesson id' })
      }
      seenLessonIds.add(lesson.id)
      problems.push(...validateLesson(lesson))
    }
  }

  return problems
}
