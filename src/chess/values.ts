import type { Color, PieceSymbol, Square } from 'chess.js'

/** Files a–h, left to right from White's point of view. */
export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
/** Ranks 1–8, bottom to top from White's point of view. */
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const

export type File = (typeof FILES)[number]
export type Rank = (typeof RANKS)[number]

/**
 * Classical piece values in pawns. These are the numbers a beginner should
 * learn first; they drive every "did that win or lose material?" judgement in
 * the app. The king is given a sentinel value so exchange arithmetic never
 * treats it as capturable.
 */
export const PIECE_VALUE: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}

export const KING_SENTINEL = 1000

export const PIECE_NAME: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

export const COLOR_NAME: Record<Color, string> = { w: 'White', b: 'Black' }

export function pieceName(type: PieceSymbol): string {
  return PIECE_NAME[type]
}

export function colorName(color: Color): string {
  return COLOR_NAME[color]
}

export function opposite(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

/** All 64 squares, a1 first, ordered by rank then file. */
export const ALL_SQUARES: Square[] = RANKS.flatMap((r) =>
  FILES.map((f) => `${f}${r}` as Square),
)

export function fileOf(square: Square): File {
  return square[0] as File
}

export function rankOf(square: Square): Rank {
  return square[1] as Rank
}

/** 0-based file index: a→0 … h→7. */
export function fileIndex(square: Square): number {
  return FILES.indexOf(fileOf(square))
}

/** 0-based rank index: 1→0 … 8→7. */
export function rankIndex(square: Square): number {
  return RANKS.indexOf(rankOf(square))
}

export function squareAt(fileIdx: number, rankIdx: number): Square | null {
  if (fileIdx < 0 || fileIdx > 7 || rankIdx < 0 || rankIdx > 7) return null
  return `${FILES[fileIdx]}${RANKS[rankIdx]}` as Square
}

/**
 * a1 is dark. A square is light when its file and rank indices sum to an odd
 * number — the fact Chapter 1 teaches, and the same rule the board renders by.
 */
export function squareColor(square: Square): 'light' | 'dark' {
  return (fileIndex(square) + rankIndex(square)) % 2 === 1 ? 'light' : 'dark'
}

/** Spoken form of a square, for screen readers and lesson copy. */
export function squareLabel(square: Square): string {
  return `${fileOf(square).toUpperCase()} ${rankOf(square)}`
}

/** The eight king/queen ray directions as [fileStep, rankStep]. */
export const DIRECTIONS = {
  n: [0, 1],
  s: [0, -1],
  e: [1, 0],
  w: [-1, 0],
  ne: [1, 1],
  nw: [-1, 1],
  se: [1, -1],
  sw: [-1, -1],
} as const

export type Direction = keyof typeof DIRECTIONS

export const ORTHOGONAL: Direction[] = ['n', 's', 'e', 'w']
export const DIAGONAL: Direction[] = ['ne', 'nw', 'se', 'sw']

/**
 * Every square from `from` outward along `dir`, edge-inclusive, excluding
 * `from` itself. Used for pin/skewer geometry and for drawing rays.
 */
export function ray(from: Square, dir: Direction): Square[] {
  const [df, dr] = DIRECTIONS[dir]
  const out: Square[] = []
  let f = fileIndex(from) + df
  let r = rankIndex(from) + dr
  while (true) {
    const sq = squareAt(f, r)
    if (!sq) break
    out.push(sq)
    f += df
    r += dr
  }
  return out
}

/** The direction from `a` to `b` if they share a rank, file or diagonal. */
export function directionBetween(a: Square, b: Square): Direction | null {
  const df = fileIndex(b) - fileIndex(a)
  const dr = rankIndex(b) - rankIndex(a)
  if (df === 0 && dr === 0) return null
  const norm = (n: number) => (n === 0 ? 0 : n > 0 ? 1 : -1)
  if (df !== 0 && dr !== 0 && Math.abs(df) !== Math.abs(dr)) return null
  const key = (Object.keys(DIRECTIONS) as Direction[]).find((d) => {
    const [sf, sr] = DIRECTIONS[d]
    return sf === norm(df) && sr === norm(dr)
  })
  return key ?? null
}

/** Squares strictly between two aligned squares; empty if not aligned. */
export function between(a: Square, b: Square): Square[] {
  const dir = directionBetween(a, b)
  if (!dir) return []
  const out: Square[] = []
  for (const sq of ray(a, dir)) {
    if (sq === b) return out
    out.push(sq)
  }
  return []
}

/** Which ray directions a piece can attack along, if it is a sliding piece. */
export function slidingDirections(type: PieceSymbol): Direction[] {
  if (type === 'r') return ORTHOGONAL
  if (type === 'b') return DIAGONAL
  if (type === 'q') return [...ORTHOGONAL, ...DIAGONAL]
  return []
}

export function isSliding(type: PieceSymbol): boolean {
  return type === 'r' || type === 'b' || type === 'q'
}

/**
 * Formats a material count as a signed pawn score from White's perspective,
 * e.g. +1.0 or -3.0. Beginners read this constantly, so it never shows a bare
 * zero without a sign.
 */
export function formatMaterial(pawns: number): string {
  if (pawns === 0) return 'level'
  const sign = pawns > 0 ? '+' : '−'
  return `${sign}${Math.abs(pawns)}`
}
