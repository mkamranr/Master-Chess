import { describe, expect, it } from 'vitest'
import { Position } from '@/chess/game'
import { moveSatisfies } from './acceptance'
import { CHAPTERS } from './index'
import { lessonCount, lessonSequence } from './types'
import { validateChapters } from './validate'

/**
 * The most valuable test in the suite.
 *
 * Every authored lesson is walked and proved sound: the position is legal, the
 * recorded solution is a legal move, and that solution really does satisfy the
 * lesson's own acceptance rule. A content bug in a teaching app is worse than
 * a crash — the learner assumes they are the one who is wrong.
 */
describe('the whole curriculum', () => {
  it('has no broken lessons', () => {
    const problems = validateChapters(CHAPTERS)
    // Printed as a list so a failure names every bad lesson at once rather
    // than making us fix them one run at a time.
    expect(problems.map((p) => `${p.lessonId}: ${p.problem}`)).toEqual([])
  })

  it('contains a substantial course', () => {
    expect(CHAPTERS.length).toBeGreaterThanOrEqual(8)
    expect(lessonCount(CHAPTERS)).toBeGreaterThanOrEqual(50)
  })

  it('numbers chapters consecutively from one', () => {
    expect(CHAPTERS.map((c) => c.number)).toEqual(
      Array.from({ length: CHAPTERS.length }, (_, i) => i + 1),
    )
  })

  it('only ever depends on an earlier chapter', () => {
    const seen = new Set<string>()
    for (const chapter of CHAPTERS) {
      for (const requirement of chapter.requires ?? []) {
        expect(seen.has(requirement)).toBe(true)
      }
      seen.add(chapter.id)
    }
  })

  it('starts from the very beginning', () => {
    // The first lesson must assume no knowledge whatsoever.
    const first = CHAPTERS[0]?.lessons[0]
    expect(first?.kind).toBe('explain')
  })

  it('gives every chapter an outcome the learner can check against', () => {
    for (const chapter of CHAPTERS) {
      expect(chapter.outcome.length).toBeGreaterThan(15)
    }
  })

  it('writes every lesson body as real prose, not placeholders', () => {
    for (const { lesson } of lessonSequence(CHAPTERS)) {
      for (const paragraph of lesson.body) {
        expect(paragraph.length).toBeGreaterThan(20)
        expect(paragraph).not.toMatch(/TODO|TBD|Lorem ipsum|placeholder/i)
      }
    }
  })

  it('makes every "do" lesson solvable and every hint useful', () => {
    for (const { lesson } of lessonSequence(CHAPTERS)) {
      if (lesson.kind !== 'do') continue
      const position = Position.fromFen(lesson.fen)
      const move = position.findMoveBySan(lesson.solution)
      expect(move, `${lesson.id}: solution ${lesson.solution} must be legal`).not.toBeNull()
      expect(
        moveSatisfies(position, move!, lesson.accept),
        `${lesson.id}: solution must satisfy its own acceptance rule`,
      ).toBe(true)
      for (const hint of lesson.hints ?? []) {
        expect(hint.length).toBeGreaterThan(10)
      }
    }
  })

  it('never asks for a move the learner cannot legally make', () => {
    for (const { lesson } of lessonSequence(CHAPTERS)) {
      if (lesson.kind === 'explain' || lesson.kind === 'drill') continue
      const position = Position.fromFen(lesson.fen)
      expect(
        position.legalMoves().length,
        `${lesson.id} has no legal moves at all`,
      ).toBeGreaterThan(0)
    }
  })

  it('keeps puzzle lines fully playable from start to finish', () => {
    for (const { lesson } of lessonSequence(CHAPTERS)) {
      if (lesson.kind !== 'puzzle') continue
      let position = Position.fromFen(lesson.fen)
      for (const san of lesson.line) {
        const move = position.findMoveBySan(san)
        expect(move, `${lesson.id}: "${san}" must be legal at ${position.fen()}`).not.toBeNull()
        position = position.after(move!)
      }
    }
  })

  it('uses unique ids throughout', () => {
    const ids = lessonSequence(CHAPTERS).map(({ lesson }) => lesson.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
