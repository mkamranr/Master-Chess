import type { Color, Square } from '@/chess/game'
import { FILES, RANKS, fileIndex, rankIndex, squareAt, squareColor } from '@/chess/values'

/** Which way up the board is drawn. */
export type Orientation = Color

/** Ranks top-to-bottom and files left-to-right, for the chosen orientation. */
export function boardLayout(orientation: Orientation) {
  const files = orientation === 'w' ? [...FILES] : [...FILES].reverse()
  const ranks = orientation === 'w' ? [...RANKS].reverse() : [...RANKS]
  return { files, ranks }
}

export function squaresInReadingOrder(orientation: Orientation): Square[] {
  const { files, ranks } = boardLayout(orientation)
  return ranks.flatMap((r) => files.map((f) => `${f}${r}` as Square))
}

/**
 * Moves a keyboard cursor one step. Directions are what the user sees, so they
 * flip with the board: pressing Up always moves toward the top of the screen.
 */
export function stepSquare(
  from: Square,
  direction: 'up' | 'down' | 'left' | 'right',
  orientation: Orientation,
): Square {
  const flip = orientation === 'w' ? 1 : -1
  let file = fileIndex(from)
  let rank = rankIndex(from)
  if (direction === 'up') rank += flip
  if (direction === 'down') rank -= flip
  if (direction === 'right') file += flip
  if (direction === 'left') file -= flip
  return squareAt(file, rank) ?? from
}

/** The square in a corner, for Home/End style jumps. */
export function edgeSquare(
  from: Square,
  edge: 'first' | 'last',
  orientation: Orientation,
): Square {
  const { files } = boardLayout(orientation)
  const target = edge === 'first' ? files[0] : files[files.length - 1]
  return `${target}${from[1]}` as Square
}

export type OverlayKind =
  | 'selected'
  | 'legal'
  | 'capture'
  | 'lastmove'
  | 'check'
  | 'threat'
  | 'ghost'
  | 'hint'

export const OVERLAY_COLOR: Record<OverlayKind, string> = {
  selected: 'var(--color-ov-selected)',
  legal: 'var(--color-ov-legal)',
  capture: 'var(--color-ov-capture)',
  lastmove: 'var(--color-ov-lastmove)',
  check: 'var(--color-ov-check)',
  threat: 'var(--color-ov-threat)',
  ghost: 'var(--color-ov-ghost)',
  hint: 'var(--color-ov-selected)',
}

/**
 * A spoken description of a square, read by screen readers.
 *
 * Deliberately verbose: for a player who cannot see the board this is the
 * board. It names the square, its colour, what stands there and — when the
 * coach is showing move options — what would happen if you moved there.
 */
export function describeSquare(options: {
  square: Square
  pieceLabel: string | null
  isLegalTarget: boolean
  isCapture: boolean
  isSelected: boolean
  verdict?: string | null
}): string {
  const { square, pieceLabel, isLegalTarget, isCapture, isSelected, verdict } = options
  const parts = [`${square[0]?.toUpperCase()} ${square[1]}`, `${squareColor(square)} square`]
  parts.push(pieceLabel ? pieceLabel : 'empty')
  if (isSelected) parts.push('selected')
  if (isLegalTarget) parts.push(isCapture ? 'can capture here' : 'can move here')
  if (verdict) parts.push(verdict)
  return parts.join(', ')
}
