import { chapterBoard } from './chapters/01-board'
import { chapterPieces } from './chapters/02-pieces'
import { chapterSpecial } from './chapters/03-special'
import { chapterCheck } from './chapters/04-check'
import { chapterDraws } from './chapters/05-draws'
import { chapterNotation } from './chapters/06-notation'
import { chapterVision } from './chapters/07-vision'
import { chapterTactics } from './chapters/08-tactics'
import { chapterMates } from './chapters/09-mates'
import { chapterOpenings } from './chapters/10-openings'
import { chapterEndgames } from './chapters/11-endgames'
import { chapterPlaying } from './chapters/12-playing'
import type { Chapter } from './types'

/**
 * The book, in order. This is the path from "I do not know the rules" to a
 * solid club-level foundation, and the Roadmap screen renders it directly.
 */
export const CHAPTERS: Chapter[] = [
  chapterBoard,
  chapterPieces,
  chapterSpecial,
  chapterCheck,
  chapterDraws,
  chapterNotation,
  chapterVision,
  chapterTactics,
  chapterMates,
  chapterOpenings,
  chapterEndgames,
  chapterPlaying,
]

export * from './types'
export * from './acceptance'
export * from './validate'
