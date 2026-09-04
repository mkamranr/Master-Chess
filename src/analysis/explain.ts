import type { Move, PieceSymbol, Square } from '@/chess/game'
import { Position } from '@/chess/game'
import {
  CASTLING_RULE,
  EN_PASSANT_RULE,
  PIECE_RULES,
  PROMOTION_RULE,
} from '@/chess/rules'
import { PIECE_VALUE, colorName, opposite, pieceName } from '@/chess/values'
import type { Motif } from './motifs'
import { motifsCreatedBy } from './motifs'
import type { HangingPiece } from './threats'
import { defendersOf, hangingPieces, materialBalance } from './threats'
import type { StaticVerdict } from './verdict'
import { classifyMaterial } from './verdict'

/* ---------------------------------------------------------------------------
 * Explaining a single move.
 *
 * This is the engine behind "what happens if I do this". It answers the
 * question without the move being played, so a learner can look before they
 * leap — which is the whole point.
 *
 * Everything here is computed from the rules and from counting material. No
 * chess engine is involved, so it works instantly and offline; Stockfish adds
 * the opponent's best reply on top of this, it does not replace it.
 * ------------------------------------------------------------------------ */

export interface MoveFlags {
  isCapture: boolean
  isCheck: boolean
  isCheckmate: boolean
  isStalemate: boolean
  isCastle: 'kingside' | 'queenside' | null
  isEnPassant: boolean
  isPromotion: PieceSymbol | null
  isDoublePawnPush: boolean
}

export interface DestinationSafety {
  /** Enemy pieces that could capture us on the destination square. */
  attackedBy: Square[]
  /** Our pieces that could recapture there. */
  defendedBy: Square[]
  /** Pawns lost if the opponent takes and we take back. Positive = we lose. */
  riskIfTaken: number
  safe: boolean
}

export interface MoveExplanation {
  move: Move
  san: string
  from: Square
  to: Square
  pieceLabel: string
  /** The rule that permits this move, in plain words. */
  rule: string
  flags: MoveFlags
  /** Value of whatever this move captures, in pawns. */
  captureValue: number
  /** Material from the mover's side before the move. */
  materialBefore: number
  /** Material from the mover's side after the move. */
  materialAfter: number
  /**
   * Best guess at what this move nets, in pawns, after the opponent takes
   * their best capture in reply.
   */
  netMaterial: number
  destination: DestinationSafety
  /** Enemy pieces we would then be threatening profitably. */
  createsThreats: HangingPiece[]
  /** Our own pieces left capturable after the move. */
  leavesHanging: HangingPiece[]
  /** Squares this piece was defending and would stop defending. */
  abandons: Square[]
  motifs: Motif[]
  staticVerdict: StaticVerdict
  /** One-paragraph plain-English verdict, safe to show verbatim. */
  summary: string
}

/* ------------------------------------------------------------------------ */

function flagsOf(move: Move, after: Position): MoveFlags {
  const status = after.status()
  return {
    isCapture: move.isCapture(),
    isCheck: status.inCheck && !status.isCheckmate,
    isCheckmate: status.isCheckmate,
    isStalemate: status.isStalemate,
    isCastle: move.isKingsideCastle()
      ? 'kingside'
      : move.isQueensideCastle()
        ? 'queenside'
        : null,
    isEnPassant: move.isEnPassant(),
    isPromotion: move.promotion ?? null,
    isDoublePawnPush: move.isBigPawn(),
  }
}

/** The rule text that justifies this particular move. */
function ruleFor(move: Move, flags: MoveFlags): string {
  if (flags.isCastle) return `${CASTLING_RULE.name}: ${CASTLING_RULE.short}`
  if (flags.isEnPassant) return `${EN_PASSANT_RULE.name}: ${EN_PASSANT_RULE.short}`
  if (flags.isPromotion) return `${PROMOTION_RULE.name}: ${PROMOTION_RULE.short}`
  const rule = PIECE_RULES[move.piece]
  if (move.piece === 'p' && flags.isDoublePawnPush) {
    return `${rule.name}: ${rule.short} From its starting square only, it may advance two squares instead of one.`
  }
  if (move.piece === 'p' && flags.isCapture) {
    return `${rule.name}: a pawn captures one square diagonally forward — never straight ahead.`
  }
  return `${rule.name}: ${rule.short}`
}

/** What this move takes, in pawns. En passant captures a pawn off-square. */
function captureValueOf(move: Move): number {
  if (move.isEnPassant()) return PIECE_VALUE.p
  const victim = move.captured
  return victim ? PIECE_VALUE[victim] : 0
}

function destinationSafety(move: Move, after: Position): DestinationSafety {
  const mover = move.color
  const enemy = opposite(mover)

  // Ask on the resulting position: who can hit us where we have landed?
  const attackedBy = after.attackers(move.to, enemy)
  const defendedBy = defendersOf(after, move.to)

  // Our piece, at its destination, after a possible promotion.
  const landedType = move.promotion ?? move.piece
  const ourValue = landedType === 'k' ? 0 : PIECE_VALUE[landedType]

  let riskIfTaken = 0
  if (attackedBy.length > 0 && landedType !== 'k') {
    const cheapestAttacker = Math.min(
      ...attackedBy.map((sq) => PIECE_VALUE[after.pieceAt(sq)!.type]),
    )
    riskIfTaken = defendedBy.length === 0 ? ourValue : ourValue - cheapestAttacker
  }

  return {
    attackedBy,
    defendedBy,
    riskIfTaken: Math.max(0, riskIfTaken),
    safe: riskIfTaken <= 0,
  }
}

/**
 * Squares this piece was covering from its old square and no longer covers
 * from the new one. Only squares that actually matter — occupied by one of our
 * pieces, or under enemy attack — are reported, so the list stays short enough
 * to read.
 */
function abandonedSquares(before: Position, move: Move, after: Position): Square[] {
  const mover = move.color
  const enemy = opposite(mover)
  const out: Square[] = []

  for (const placed of before.piecesOf(mover)) {
    if (placed.square === move.from) continue
    const wasDefending = before.attackers(placed.square, mover).includes(move.from)
    if (!wasDefending) continue
    const stillDefended = after.attackers(placed.square, mover).length > 0
    const nowAttacked = after.attackers(placed.square, enemy).length > 0
    if (!stillDefended || nowAttacked) out.push(placed.square)
  }
  return out
}

/* ------------------------------------------------------------------------ */

export interface ExplainOptions {
  /**
   * Whether to run named-motif detection. Motif detection is by far the most
   * expensive part of an explanation, so bulk callers that only need a verdict
   * badge (the Moves panel, reply ranking) leave it off and the If-Then panel
   * turns it on for the one move the learner actually selected.
   */
  includeMotifs?: boolean
}

export function explainMove(
  before: Position,
  move: Move,
  options: ExplainOptions = {},
): MoveExplanation {
  const { includeMotifs = true } = options
  const after = before.after(move)
  const mover = move.color
  const enemy = opposite(mover)

  const flags = flagsOf(move, after)
  const captureValue = captureValueOf(move)
  const destination = destinationSafety(move, after)

  const balanceBefore = materialBalance(before)
  const balanceAfter = materialBalance(after)
  const materialBefore = mover === 'w' ? balanceBefore.diff : -balanceBefore.diff
  const materialAfter = mover === 'w' ? balanceAfter.diff : -balanceAfter.diff

  // What we leave loose, and what we start threatening.
  const leavesHanging = hangingPieces(after, mover)
  const alreadyLoose = new Set(hangingPieces(before, enemy).map((t) => t.square))
  const createsThreats = hangingPieces(after, enemy).filter((t) => !alreadyLoose.has(t.square))

  // Assume the opponent grabs the most valuable thing available in reply.
  const worstReply = leavesHanging[0]?.lossIfTaken ?? 0
  const netMaterial = flags.isCheckmate ? captureValue : captureValue - worstReply

  const staticVerdict: StaticVerdict = flags.isCheckmate
    ? 'checkmate'
    : flags.isStalemate
      ? 'stalemate'
      : classifyMaterial(netMaterial, captureValue > 0)

  const motifs = includeMotifs ? motifsCreatedBy(before, move) : []
  const abandons = abandonedSquares(before, move, after)

  return {
    move,
    san: move.san,
    from: move.from,
    to: move.to,
    pieceLabel: PIECE_RULES[move.piece].name,
    rule: ruleFor(move, flags),
    flags,
    captureValue,
    materialBefore,
    materialAfter,
    netMaterial,
    destination,
    createsThreats,
    leavesHanging,
    abandons,
    motifs,
    staticVerdict,
    summary: summarise({
      move,
      flags,
      captureValue,
      netMaterial,
      destination,
      createsThreats,
      leavesHanging,
      motifs,
      staticVerdict,
    }),
  }
}

/* ------------------------------------------------------------------------ */

interface SummaryInput {
  move: Move
  flags: MoveFlags
  captureValue: number
  netMaterial: number
  destination: DestinationSafety
  createsThreats: HangingPiece[]
  leavesHanging: HangingPiece[]
  motifs: Motif[]
  staticVerdict: StaticVerdict
}

/**
 * The sentence the coach actually says. Order matters: end of game first, then
 * what you win, then what you risk, then what you threaten. Always ends with a
 * full stop so it can be dropped into the UI unmodified.
 */
function summarise(input: SummaryInput): string {
  const { move, flags, captureValue, netMaterial, destination, createsThreats, leavesHanging } =
    input
  const parts: string[] = []
  const piece = pieceName(move.piece)

  if (flags.isCheckmate) {
    return `${move.san} is checkmate — ${colorName(move.color)} wins, and the game ends right here.`
  }
  if (flags.isStalemate) {
    return `${move.san} leaves your opponent with no legal move while not in check. That is stalemate: an immediate draw, even if you are winning.`
  }

  if (flags.isCastle) {
    parts.push(
      `${move.san} castles ${flags.isCastle}, tucking the king behind its pawns and bringing the rook toward the centre`,
    )
  } else if (flags.isEnPassant) {
    parts.push(`${move.san} captures the pawn en passant, winning a pawn`)
  } else if (flags.isPromotion) {
    parts.push(`${move.san} promotes the pawn to a ${pieceName(flags.isPromotion)}`)
  } else if (captureValue > 0) {
    parts.push(`${move.san} takes a ${pieceName(move.captured!)}, worth ${captureValue}`)
  } else {
    parts.push(`${move.san} moves the ${piece} to ${move.to}`)
  }

  if (flags.isCheck) parts.push('and gives check, so your opponent must answer it immediately')

  if (destination.attackedBy.length > 0) {
    if (destination.safe) {
      parts.push(
        `the ${move.to} square is attacked from ${destination.attackedBy.join(', ')} but you have it defended, so a trade there is fine`,
      )
    } else {
      parts.push(
        `but ${move.to} is attacked from ${destination.attackedBy.join(', ')} and ${
          destination.defendedBy.length === 0 ? 'nothing defends it' : 'not defended well enough'
        }`,
      )
    }
  }

  const worst = leavesHanging[0]
  if (worst && worst.square !== move.to) {
    parts.push(
      `it also leaves your ${pieceName(worst.piece.type)} on ${worst.square} loose, costing ${worst.lossIfTaken} if taken`,
    )
  }

  if (createsThreats.length > 0) {
    const list = createsThreats
      .slice(0, 2)
      .map((t) => `the ${pieceName(t.piece.type)} on ${t.square}`)
      .join(' and ')
    parts.push(`afterwards you threaten ${list}`)
  }

  if (netMaterial > 0) parts.push(`net result: you come out ${netMaterial} pawns ahead`)
  else if (netMaterial < 0) parts.push(`net result: you come out ${Math.abs(netMaterial)} pawns behind`)

  const sentence = parts.join(', ').replace(/, and /g, ' and ').replace(/, but /g, ' but ')
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`
}

/* ------------------------------------------------------------------------ */

/** Rank explanations best-first, for the "next possible moves" list. */
const VERDICT_ORDER: Record<StaticVerdict, number> = {
  checkmate: 0,
  'wins-material': 1,
  safe: 2,
  'even-trade': 3,
  'loses-material': 4,
  stalemate: 5,
}

/**
 * Explain every legal move for the piece on `square`. This backs the Moves
 * panel, so it is sorted the way a learner should read it: winning moves
 * first, material-losing moves last.
 */
const BEST_FIRST = (a: MoveExplanation, b: MoveExplanation) => {
  const byVerdict = VERDICT_ORDER[a.staticVerdict] - VERDICT_ORDER[b.staticVerdict]
  if (byVerdict !== 0) return byVerdict
  if (b.netMaterial !== a.netMaterial) return b.netMaterial - a.netMaterial
  // Stable, position-independent tiebreak so the list does not reshuffle
  // between renders.
  return a.san.localeCompare(b.san)
}

export function explainMovesFrom(
  position: Position,
  square: Square,
  options: ExplainOptions = {},
): MoveExplanation[] {
  const { includeMotifs = false } = options
  return position
    .legalMoves(square)
    .map((move) => explainMove(position, move, { includeMotifs }))
    .sort(BEST_FIRST)
}

/** Explain every legal move in the position, best first. */
export function explainAllMoves(
  position: Position,
  options: ExplainOptions = {},
): MoveExplanation[] {
  const { includeMotifs = false } = options
  return position
    .legalMoves()
    .map((move) => explainMove(position, move, { includeMotifs }))
    .sort(BEST_FIRST)
}
