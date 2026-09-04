import type { Color, Piece, Square } from '@/chess/game'
import { Position } from '@/chess/game'
import {
  ALL_SQUARES,
  DIAGONAL,
  ORTHOGONAL,
  PIECE_VALUE,
  between,
  directionBetween,
  isSliding,
  opposite,
  ray,
  squareColor,
} from '@/chess/values'

/* ---------------------------------------------------------------------------
 * Material
 * ------------------------------------------------------------------------ */

export interface MaterialBalance {
  white: number
  black: number
  /** Positive favours White, in pawns. */
  diff: number
}

/** Total material for each side, kings excluded. */
export function materialBalance(position: Position): MaterialBalance {
  let white = 0
  let black = 0
  for (const p of position.pieces()) {
    const value = PIECE_VALUE[p.type]
    if (p.color === 'w') white += value
    else black += value
  }
  return { white, black, diff: white - black }
}

/* ---------------------------------------------------------------------------
 * Pins
 *
 * A piece is (absolutely) pinned when it stands on a line between its own king
 * and an enemy slider, with nothing else in between. It may still move along
 * that line, so a pin restricts a piece rather than freezing it — which is
 * exactly why a pinned piece can defend squares on its pin line but not off it.
 * ------------------------------------------------------------------------ */

export interface PinInfo {
  /** The pinned piece. */
  square: Square
  /** The enemy slider doing the pinning. */
  pinnedBy: Square
  /** The friendly piece behind the pin — always the king for an absolute pin. */
  shieldedSquare: Square
  /** Squares the pinned piece may still legally occupy (its own line). */
  allowedSquares: Square[]
}

export function pinInfo(position: Position, square: Square): PinInfo | null {
  const piece = position.pieceAt(square)
  if (!piece || piece.type === 'k') return null

  const kingSquare = position.kingSquare(piece.color)
  if (!kingSquare) return null

  const dir = directionBetween(kingSquare, square)
  if (!dir) return null

  // Nothing may stand between the king and the candidate pinned piece.
  if (between(kingSquare, square).some((sq) => position.pieceAt(sq))) return null

  const isDiagonal = DIAGONAL.includes(dir)
  const validPinners = isDiagonal ? (['b', 'q'] as const) : (['r', 'q'] as const)

  // Walk outward past the piece looking for the first obstruction.
  for (const sq of ray(square, dir)) {
    const other = position.pieceAt(sq)
    if (!other) continue
    if (other.color === piece.color) return null
    if (!(validPinners as readonly string[]).includes(other.type)) return null
    return {
      square,
      pinnedBy: sq,
      shieldedSquare: kingSquare,
      allowedSquares: [...between(kingSquare, sq), sq].filter((s) => s !== square),
    }
  }
  return null
}

export function isPinned(position: Position, square: Square): boolean {
  return pinInfo(position, square) !== null
}

/* ---------------------------------------------------------------------------
 * Attackers and defenders
 * ------------------------------------------------------------------------ */

/**
 * Squares holding `color` pieces that attack `square` — the raw attack map
 * straight from chess.js, pinned pieces included.
 */
export { capturersOf }

export function attackersOf(position: Position, square: Square, color: Color): Square[] {
  return position.attackers(square, color)
}

/**
 * The pieces that genuinely defend `square`, i.e. could actually recapture
 * there.
 *
 * This is deliberately stricter than the raw attack map: a piece pinned to its
 * own king cannot leave its pin line, so it does not defend squares off that
 * line. Counting it would tell a learner a piece is safe when it is free to be
 * taken — the single most damaging kind of wrong advice this app could give.
 */
export function defendersOf(position: Position, square: Square): Square[] {
  const piece = position.pieceAt(square)
  const color = piece ? piece.color : position.turn()
  return realAttackers(position, square, color)
}

/** Raw attackers filtered down to those that could legally capture there. */
function realAttackers(position: Position, square: Square, color: Color): Square[] {
  return position.attackers(square, color).filter((from) => {
    const pin = pinInfo(position, from)
    if (!pin) return true
    // A pinned piece may still act along its own pin line.
    return pin.allowedSquares.includes(square)
  })
}

/**
 * The pieces of `color` that can actually capture whatever stands on `square`.
 *
 * When it is `color`'s turn we can answer this exactly by generating legal
 * moves, which catches a constraint the pin filter alone misses: if that side
 * is in check, they must deal with the check first and cannot go grab a loose
 * piece elsewhere. Getting this wrong would make the coach shout "blunder!"
 * at moves that are in fact perfectly safe because they come with check.
 *
 * Legal-move generation is only usable for occupied squares, since a pawn can
 * legally *move* to an empty square it does not attack. Empty squares keep the
 * pin-filtered attack map.
 */
function capturersOf(position: Position, square: Square, color: Color): Square[] {
  const victim = position.pieceAt(square)
  if (victim && victim.color !== color && position.turn() === color) {
    return position.capturersByDestination().get(square) ?? []
  }
  return realAttackers(position, square, color)
}

/* ---------------------------------------------------------------------------
 * Hanging pieces
 * ------------------------------------------------------------------------ */

export interface HangingPiece {
  square: Square
  piece: Piece
  /** Enemy pieces that can capture it. */
  attackers: Square[]
  /** Friendly pieces that could recapture (pins already discounted). */
  defenders: Square[]
  /**
   * Material lost, in pawns, if the opponent starts the exchange and we
   * recapture with our cheapest defender. 0 or less means the capture is not
   * actually good for them.
   */
  lossIfTaken: number
  /** True when nothing at all defends it. */
  undefended: boolean
}

/**
 * Every piece of `color` that the opponent can profitably capture right now.
 *
 * The judgement is a static exchange approximation: cheapest attacker takes,
 * cheapest real defender recaptures. That is not a full SEE search — deep
 * multi-capture sequences are the engine's job — but it is exactly the
 * arithmetic a club player does at the board, which makes it the right thing
 * to teach.
 */
export function hangingPieces(position: Position, color: Color): HangingPiece[] {
  const enemy = opposite(color)
  const out: HangingPiece[] = []

  for (const placed of position.piecesOf(color)) {
    // The king can never be captured, so it is never "hanging"; being attacked
    // is check, which the status layer reports separately.
    if (placed.type === 'k') continue

    const attackers = capturersOf(position, placed.square, enemy)
    if (attackers.length === 0) continue

    const defenders = realAttackers(position, placed.square, color)
    const victimValue = PIECE_VALUE[placed.type]
    const cheapestAttacker = Math.min(
      ...attackers.map((sq) => PIECE_VALUE[position.pieceAt(sq)!.type]),
    )

    // If we cannot recapture, we simply lose the piece. If we can, the
    // opponent nets our piece minus the attacker we take back.
    const lossIfTaken = defenders.length === 0 ? victimValue : victimValue - cheapestAttacker

    if (lossIfTaken > 0) {
      out.push({
        square: placed.square,
        piece: { color: placed.color, type: placed.type },
        attackers,
        defenders,
        lossIfTaken,
        undefended: defenders.length === 0,
      })
    }
  }

  // Worst first: that is the order a learner should look at them in.
  return out.sort((a, b) => b.lossIfTaken - a.lossIfTaken)
}

/* ---------------------------------------------------------------------------
 * Control map — "who owns which squares"
 * ------------------------------------------------------------------------ */

export type ControlOwner = 'white' | 'black' | 'contested' | 'neutral'

export interface SquareControl {
  white: number
  black: number
  owner: ControlOwner
}

export type ControlMap = Partial<Record<Square, SquareControl>>

/**
 * How many pieces of each colour cover every square. This drives the board
 * heatmap overlay, which is the fastest way to show a beginner what "control
 * of the centre" physically means.
 */
export function controlMap(position: Position): ControlMap {
  const map: ControlMap = {}
  for (const square of ALL_SQUARES) {
    const white = position.attackers(square, 'w').length
    const black = position.attackers(square, 'b').length
    let owner: ControlOwner = 'neutral'
    if (white > 0 && black > 0) owner = 'contested'
    else if (white > 0) owner = 'white'
    else if (black > 0) owner = 'black'
    map[square] = { white, black, owner }
  }
  return map
}

/* ---------------------------------------------------------------------------
 * Per-square report — the Board Read panel's data source
 * ------------------------------------------------------------------------ */

export interface SquareReport {
  square: Square
  squareColor: 'light' | 'dark'
  piece: Piece | null
  whiteAttackers: Square[]
  blackAttackers: Square[]
  /** Real defenders of the occupying piece, pins discounted. */
  defenders: Square[]
  /** Real enemy attackers of the occupying piece. */
  threats: Square[]
  isHanging: boolean
  lossIfTaken: number
  pin: PinInfo | null
}

export function squareReport(position: Position, square: Square): SquareReport {
  const piece = position.pieceAt(square) ?? null
  const whiteAttackers = position.attackers(square, 'w')
  const blackAttackers = position.attackers(square, 'b')

  let defenders: Square[] = []
  let threats: Square[] = []
  let isHanging = false
  let lossIfTaken = 0

  if (piece) {
    defenders = realAttackers(position, square, piece.color)
    threats = capturersOf(position, square, opposite(piece.color))
    const hanging = hangingPieces(position, piece.color).find((h) => h.square === square)
    isHanging = hanging !== undefined
    lossIfTaken = hanging?.lossIfTaken ?? 0
  }

  return {
    square,
    squareColor: squareColor(square),
    piece,
    whiteAttackers,
    blackAttackers,
    defenders,
    threats,
    isHanging,
    lossIfTaken,
    pin: piece ? pinInfo(position, square) : null,
  }
}

/* ---------------------------------------------------------------------------
 * Check responses — the "if you are in check" rule, made concrete
 * ------------------------------------------------------------------------ */

export interface CheckResponses {
  inCheck: boolean
  /** The enemy piece(s) giving check. Two means double check. */
  checkers: Square[]
  isDoubleCheck: boolean
  /** Legal king moves out of check. */
  moveKing: Square[]
  /** Squares a piece could interpose on to block the check. */
  block: Square[]
  /** Our pieces that can capture the checking piece. */
  capture: Square[]
}

/**
 * There are only ever three legal answers to a check: move the king, block the
 * line, or capture the attacker. Chapter 4 states that rule; this function
 * grounds it in the position actually on the board.
 *
 * A double check is the exception worth naming: with two attackers, blocking or
 * capturing cannot address both, so the king must move.
 */
export function checkResponses(position: Position): CheckResponses {
  const color = position.turn()
  const kingSquare = position.kingSquare(color)
  const status = position.status()

  if (!kingSquare || !status.inCheck) {
    return {
      inCheck: false,
      checkers: [],
      isDoubleCheck: false,
      moveKing: [],
      block: [],
      capture: [],
    }
  }

  const checkers = position.attackers(kingSquare, opposite(color))
  const legal = position.legalMoves()

  const moveKing = legal.filter((m) => m.from === kingSquare).map((m) => m.to)
  const capture = checkers.length === 1 && checkers[0]
    ? legal.filter((m) => m.to === checkers[0] && m.from !== kingSquare).map((m) => m.from)
    : []

  // Blocking is only possible against a single sliding checker.
  let block: Square[] = []
  if (checkers.length === 1 && checkers[0]) {
    const checker = checkers[0]
    const checkerPiece = position.pieceAt(checker)
    if (checkerPiece && isSliding(checkerPiece.type)) {
      const lane = between(kingSquare, checker)
      block = legal
        .filter((m) => m.from !== kingSquare && lane.includes(m.to))
        .map((m) => m.to)
      block = [...new Set(block)]
    }
  }

  return {
    inCheck: true,
    checkers,
    isDoubleCheck: checkers.length > 1,
    moveKing,
    block,
    capture: [...new Set(capture)],
  }
}

/* ---------------------------------------------------------------------------
 * Threats the opponent is preparing
 * ------------------------------------------------------------------------ */

/**
 * What the opponent would do to us if we passed the move. Used by the coach to
 * answer "what is being threatened?" before the learner commits to anything.
 */
export function opponentThreats(position: Position): HangingPiece[] {
  const passed = position.withTurnPassed()
  if (!passed) return []
  return hangingPieces(passed, position.turn())
}

/** Directions worth drawing for a piece, for the movement-playground lessons. */
export function pieceRayDirections(position: Position, square: Square) {
  const piece = position.pieceAt(square)
  if (!piece) return []
  if (piece.type === 'r') return ORTHOGONAL
  if (piece.type === 'b') return DIAGONAL
  if (piece.type === 'q') return [...ORTHOGONAL, ...DIAGONAL]
  return []
}
