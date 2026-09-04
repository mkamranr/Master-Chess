import { Chess, DEFAULT_POSITION, Move, validateFen } from 'chess.js'
import type { Color, Piece, PieceSymbol, Square } from 'chess.js'
import { opposite } from './values'

export type { Color, Piece, PieceSymbol, Square }
export { Move, DEFAULT_POSITION }

export interface PlacedPiece {
  square: Square
  type: PieceSymbol
  color: Color
}

export type GameOverReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient-material'
  | 'fifty-move'
  | 'threefold'

export interface GameStatus {
  turn: Color
  inCheck: boolean
  isCheckmate: boolean
  isStalemate: boolean
  isDraw: boolean
  isGameOver: boolean
  reason: GameOverReason | null
  /** Winner when the game ended decisively, else null. */
  winner: Color | null
}

export interface CastlingRights {
  kingside: boolean
  queenside: boolean
}

/**
 * A single chess position, wrapping chess.js.
 *
 * This is the ONLY module in the app that imports chess.js. Everything else —
 * threat analysis, motif detection, move explanation, lessons — goes through
 * this façade, so the rules of chess have exactly one implementation and it is
 * a battle-tested one. Do not hand-roll move generation or draw detection
 * anywhere else.
 *
 * Construct once per position and pass it around: the analysis layer asks
 * dozens of questions per position and rebuilding the engine for each would be
 * wasteful.
 */
export class Position {
  private readonly chess: Chess

  // A Position is immutable, so everything derived from it can be memoised.
  // This matters more than it looks: move generation costs a couple of
  // milliseconds, and the analysis layer asks for it once per piece on the
  // board. Without these caches, explaining a single middlegame move took
  // ~30ms and ranking every legal move took most of a second.
  private cachedMoves: Move[] | null = null
  private cachedMovesBySquare = new Map<Square, Move[]>()
  private cachedPieces: PlacedPiece[] | null = null
  private cachedStatus: GameStatus | null = null

  private constructor(chess: Chess) {
    this.chess = chess
  }

  static start(): Position {
    return new Position(new Chess())
  }

  /** Throws on an invalid FEN — call `Position.validate` first if unsure. */
  static fromFen(fen: string): Position {
    return new Position(new Chess(fen))
  }

  static tryFromFen(fen: string): Position | null {
    if (!validateFen(fen).ok) return null
    try {
      return new Position(new Chess(fen))
    } catch {
      return null
    }
  }

  static validate(fen: string): { ok: boolean; error?: string } {
    return validateFen(fen)
  }

  fen(): string {
    return this.chess.fen()
  }

  /** Position-only key (ignores clocks), useful for repetition and caching. */
  hash(): string {
    return this.chess.hash()
  }

  turn(): Color {
    return this.chess.turn()
  }

  pieceAt(square: Square): Piece | undefined {
    return this.chess.get(square)
  }

  /** Every piece on the board, with its square. */
  pieces(): PlacedPiece[] {
    if (this.cachedPieces) return this.cachedPieces
    const out: PlacedPiece[] = []
    for (const row of this.chess.board()) {
      for (const cell of row) {
        if (cell) out.push({ square: cell.square, type: cell.type, color: cell.color })
      }
    }
    this.cachedPieces = out
    return out
  }

  piecesOf(color: Color): PlacedPiece[] {
    return this.pieces().filter((p) => p.color === color)
  }

  kingSquare(color: Color): Square | null {
    return this.chess.findPiece({ type: 'k', color })[0] ?? null
  }

  /** All legal moves, or only those from one square when given. */
  legalMoves(square?: Square): Move[] {
    if (square === undefined) {
      this.cachedMoves ??= this.chess.moves({ verbose: true })
      return this.cachedMoves
    }
    let moves = this.cachedMovesBySquare.get(square)
    if (!moves) {
      moves = this.chess.moves({ square, verbose: true })
      this.cachedMovesBySquare.set(square, moves)
    }
    return moves
  }

  /**
   * Legal captures grouped by destination square. The analysis layer needs
   * "who can take on this square" for many squares at once, and doing it from
   * one pass is much cheaper than re-filtering the whole move list per square.
   */
  private cachedCapturers: Map<Square, Square[]> | null = null

  capturersByDestination(): Map<Square, Square[]> {
    if (this.cachedCapturers) return this.cachedCapturers
    const map = new Map<Square, Square[]>()
    for (const move of this.legalMoves()) {
      const existing = map.get(move.to)
      if (existing) {
        if (!existing.includes(move.from)) existing.push(move.from)
      } else {
        map.set(move.to, [move.from])
      }
    }
    this.cachedCapturers = map
    return map
  }

  /** Legal moves for the side to move that land on `square`. */
  movesTo(square: Square): Move[] {
    return this.legalMoves().filter((m) => m.to === square)
  }

  findMove(from: Square, to: Square, promotion?: PieceSymbol): Move | null {
    return (
      this.legalMoves(from).find(
        (m) => m.to === to && (promotion ? m.promotion === promotion : true),
      ) ?? null
    )
  }

  findMoveBySan(san: string): Move | null {
    return this.legalMoves().find((m) => m.san === san) ?? null
  }

  /**
   * Squares holding `color` pieces that attack `square`.
   *
   * Note carefully: chess.js reports *raw* attacks, so a piece that is pinned
   * to its own king is still listed here even though it could not legally
   * capture. That is the right primitive for "is this square covered", but it
   * is the wrong answer for "is this piece really defended" — use
   * `defendersOf` in the analysis layer, which filters pinned defenders out.
   */
  attackers(square: Square, color: Color): Square[] {
    return this.chess.attackers(square, color)
  }

  isAttacked(square: Square, byColor: Color): boolean {
    return this.chess.isAttacked(square, byColor)
  }

  castlingRights(color: Color): CastlingRights {
    // chess.js reports these as { k, q }; we name them for readability since
    // the castling lesson prints these conditions verbatim.
    const rights = this.chess.getCastlingRights(color)
    return { kingside: rights.k, queenside: rights.q }
  }

  /** The en-passant target square from the FEN, if one is available. */
  enPassantSquare(): Square | null {
    const field = this.chess.fen().split(' ')[3]
    return !field || field === '-' ? null : (field as Square)
  }

  status(): GameStatus {
    if (this.cachedStatus) return this.cachedStatus
    const turn = this.chess.turn()
    const isCheckmate = this.chess.isCheckmate()
    const isStalemate = this.chess.isStalemate()
    const insufficient = this.chess.isInsufficientMaterial()
    const fifty = this.chess.isDrawByFiftyMoves()
    const threefold = this.chess.isThreefoldRepetition()
    const isDraw = isStalemate || insufficient || fifty || threefold

    let reason: GameOverReason | null = null
    if (isCheckmate) reason = 'checkmate'
    else if (isStalemate) reason = 'stalemate'
    else if (insufficient) reason = 'insufficient-material'
    else if (fifty) reason = 'fifty-move'
    else if (threefold) reason = 'threefold'

    this.cachedStatus = {
      turn,
      inCheck: this.chess.inCheck(),
      isCheckmate,
      isStalemate,
      isDraw,
      isGameOver: isCheckmate || isDraw,
      reason,
      // The side to move is the side that got mated, so the winner is the other.
      winner: isCheckmate ? opposite(turn) : null,
    }
    return this.cachedStatus
  }

  /**
   * The position after `move`, as a new Position. `move` must be legal here.
   * chess.js records the resulting FEN on the move itself, so this needs no
   * make/unmake dance and never mutates this position.
   */
  after(move: Move): Position {
    return Position.fromFen(move.after)
  }

  /** Convenience: apply a from/to move if it is legal. */
  play(from: Square, to: Square, promotion?: PieceSymbol): { position: Position; move: Move } | null {
    const move = this.findMove(from, to, promotion)
    return move ? { position: this.after(move), move } : null
  }

  /**
   * The same position with the other side to move and no en-passant right.
   * Used to answer "what is my opponent threatening right now?" — you have to
   * hand them the move to see their threats.
   */
  withTurnPassed(): Position | null {
    const parts = this.fen().split(' ')
    parts[1] = opposite(this.turn())
    parts[3] = '-'
    return Position.tryFromFen(parts.join(' '))
  }

  ascii(): string {
    return this.chess.ascii()
  }
}

/** A move played in a game, plus the position it produced. */
export interface HistoryEntry {
  move: Move
  fenBefore: string
  fenAfter: string
}

export interface GameRecord {
  startFen: string
  history: HistoryEntry[]
}

export function newGame(startFen: string = DEFAULT_POSITION): GameRecord {
  return { startFen, history: [] }
}

export function currentFen(game: GameRecord): string {
  return game.history.at(-1)?.fenAfter ?? game.startFen
}

export function currentPosition(game: GameRecord): Position {
  return Position.fromFen(currentFen(game))
}

export function pushMove(game: GameRecord, move: Move): GameRecord {
  return {
    startFen: game.startFen,
    history: [...game.history, { move, fenBefore: move.before, fenAfter: move.after }],
  }
}

export function undoMove(game: GameRecord): GameRecord {
  return { startFen: game.startFen, history: game.history.slice(0, -1) }
}

/**
 * Move list grouped into numbered pairs for display, e.g.
 * `1. e4 e5  2. Nf3 Nc6`. Handles games that start with Black to move.
 */
export function movePairs(game: GameRecord): Array<{
  number: number
  white: HistoryEntry | null
  black: HistoryEntry | null
}> {
  const startTurn = game.startFen.split(' ')[1] === 'b' ? 'b' : 'w'
  const startNumber = Number(game.startFen.split(' ')[5] ?? '1') || 1
  const rows: Array<{ number: number; white: HistoryEntry | null; black: HistoryEntry | null }> = []

  let index = 0
  let number = startNumber
  if (startTurn === 'b' && game.history[0]) {
    rows.push({ number, white: null, black: game.history[0] })
    index = 1
    number += 1
  }
  for (; index < game.history.length; index += 2) {
    rows.push({
      number,
      white: game.history[index] ?? null,
      black: game.history[index + 1] ?? null,
    })
    number += 1
  }
  return rows
}
