import type { Color, Move, Square } from '@/chess/game'
import { Position } from '@/chess/game'
import {
  PIECE_VALUE,
  colorName,
  fileIndex,
  formatMaterial,
  opposite,
  rankIndex,
} from '@/chess/values'
import type { ChessEngine } from '@/engine/stockfish'
import { splitLan } from '@/engine/uci'
import type { MoveExplanation } from './explain'
import { explainMove } from './explain'
import { materialBalance } from './threats'

/* ---------------------------------------------------------------------------
 * The Consequence Explorer — "what happens if I do this?"
 *
 * A learner's real question is never "is this move legal". It is "if I play
 * this, what does my opponent do to me?" This module answers that as an
 * explicit chain of moves in plain English, computed WITHOUT committing the
 * move, so they can look before they leap.
 *
 * Two sources, deliberately:
 *   - `buildStaticChain` needs no engine. It assumes the opponent plays their
 *     best material grab, which is what an opponent at this level will
 *     actually do. Instant, offline, always available.
 *   - `buildEngineChain` walks Stockfish's principal variation instead, which
 *     is correct rather than merely plausible, and can go deeper.
 *
 * The UI shows the static chain immediately and upgrades it in place when the
 * engine has something better to say.
 * ------------------------------------------------------------------------ */

export interface ConsequenceStep {
  /** 0 is the candidate move itself. */
  ply: number
  san: string
  from: Square
  to: Square
  by: Color
  /** Whose move this is, relative to the learner. */
  side: 'you' | 'opponent'
  fenAfter: string
  /** Material after this move, in pawns, from the learner's point of view. */
  materialAfter: number
  /** Engine score in centipawns from the learner's point of view, if known. */
  evalAfter: number | null
  mateIn: number | null
  isCheck: boolean
  isCheckmate: boolean
  /** A full standalone clause for the narrative sentence. */
  clause: string
  /**
   * A short label for the step row, deliberately containing no move notation:
   * the row prints the SAN itself, and repeating it read as
   * "Re5+ — you can answer Re5+ with check".
   */
  rowLabel: string
}

export interface ConsequenceChain {
  startFen: string
  learner: Color
  candidate: MoveExplanation
  steps: ConsequenceStep[]
  /** Net material swing across the whole chain, from the learner's side. */
  netMaterial: number
  /** The full "if… then…" sentence, ready to display. */
  narrative: string
  source: 'static' | 'engine'
  /** True when the chain can be walked one move deeper. */
  canExtend: boolean
}

function learnerMaterial(position: Position, learner: Color): number {
  const balance = materialBalance(position)
  return learner === 'w' ? balance.diff : -balance.diff
}

function clauseFor(
  ply: number,
  move: Move,
  side: 'you' | 'opponent',
  position: Position,
  predicted: boolean,
): string {
  const status = position.status()
  const who = side === 'you' ? 'you' : colorName(move.color)
  // A guessed reply is worded as a guess. Stating "then Black plays Nf6" as
  // fact, when it is really our own heuristic talking, is the kind of small
  // dishonesty that makes a learner mistrust everything else the coach says.
  const verb = side === 'you' ? 'play' : predicted ? 'would probably play' : 'plays'

  let clause: string
  if (ply === 0) clause = `If you play ${move.san}`
  else if (ply === 1) clause = `then ${who} ${verb} ${move.san}`
  else if (side === 'you') clause = `you can answer ${move.san}`
  else clause = `${who} ${verb} ${move.san}`

  if (status.isCheckmate) clause += ' — checkmate'
  else if (status.isStalemate) clause += ' — stalemate, a draw'
  // Spelled out in words rather than left to the '+' in the notation: a
  // learner in Chapter 4 has not reached the notation chapter yet.
  else if (status.inCheck) clause += ' with check'
  return clause
}

function buildStep(
  ply: number,
  before: Position,
  move: Move,
  learner: Color,
  predicted = false,
): ConsequenceStep {
  const after = before.after(move)
  const status = after.status()
  return {
    ply,
    san: move.san,
    from: move.from,
    to: move.to,
    by: move.color,
    side: move.color === learner ? 'you' : 'opponent',
    fenAfter: after.fen(),
    materialAfter: learnerMaterial(after, learner),
    evalAfter: null,
    mateIn: null,
    isCheck: status.inCheck && !status.isCheckmate,
    isCheckmate: status.isCheckmate,
    clause: clauseFor(
      ply,
      move,
      move.color === learner ? 'you' : 'opponent',
      after,
      predicted && move.color !== learner,
    ),
    rowLabel: rowLabelFor(
      ply,
      move,
      move.color === learner ? 'you' : 'opponent',
      after,
      predicted && move.color !== learner,
    ),
  }
}

function rowLabelFor(
  ply: number,
  move: Move,
  side: 'you' | 'opponent',
  position: Position,
  predicted: boolean,
): string {
  const status = position.status()
  let label: string
  if (ply === 0) label = 'your move'
  else if (side === 'you') label = 'you can answer'
  else label = predicted
    ? `${colorName(move.color)} would probably reply`
    : `${colorName(move.color)} replies`

  if (status.isCheckmate) label += ' — checkmate'
  else if (status.isStalemate) label += ' — stalemate, a draw'
  else if (status.inCheck) label += ', with check'
  return label
}

/**
 * How attractive a move looks on pure material grounds, from the point of view
 * of the side making it.
 *
 * This is deliberately a cheap score rather than a full explanation: walking a
 * chain calls it for every legal move at every ply, and running the complete
 * explainer there cost hundreds of milliseconds per chain. It only needs to be
 * good enough to predict what an opponent at this level actually does — grab
 * the biggest free thing, avoid moving into a capture.
 */
function quickMaterialScore(position: Position, move: Move): number {
  const after = position.after(move)
  const status = after.status()
  if (status.isCheckmate) return 1000

  const mover = move.color
  const enemy = opposite(mover)

  let score = move.isEnPassant()
    ? PIECE_VALUE.p
    : move.captured
      ? PIECE_VALUE[move.captured]
      : 0

  if (move.promotion) score += PIECE_VALUE[move.promotion] - PIECE_VALUE.p

  // Do not step onto a square the opponent can profitably take us on.
  const landedType = move.promotion ?? move.piece
  if (landedType !== 'k') {
    const attackers = after.attackers(move.to, enemy)
    if (attackers.length > 0) {
      const defenders = after.attackers(move.to, mover)
      const ourValue = PIECE_VALUE[landedType]
      const cheapestAttacker = Math.min(
        ...attackers.map((sq) => PIECE_VALUE[after.pieceAt(sq)!.type]),
      )
      score -= defenders.length === 0 ? ourValue : Math.max(0, ourValue - cheapestAttacker)
    }
  }

  // A check is forcing, so a club-level opponent reaches for it.
  if (status.inCheck) score += 0.5

  // Positional tiebreak, deliberately worth less than a pawn so it can never
  // outrank real material. Without it every quiet move ties on zero and the
  // alphabetical tiebreak predicts nonsense — the opening reply to 1.e4 came
  // out as Na6.
  if (landedType !== 'k') score += 0.3 * centrality(move.to)
  else score -= 0.15 // an early king walk is not what an opponent plays

  return score
}

/** 1 at the four central squares, falling to 0 at the edge. */
function centrality(square: Square): number {
  const file = fileIndex(square)
  const rank = rankIndex(square)
  const distance = Math.max(Math.abs(file - 3.5), Math.abs(rank - 3.5))
  return (3.5 - distance) / 3.5
}

/**
 * The move the opponent is most likely to actually play at club level: take
 * the most valuable thing available, or otherwise the safest move. This is a
 * heuristic, and the narrative words it as an expectation rather than a
 * certainty. `buildEngineChain` replaces it with the real principal variation.
 */
export function likelyReply(position: Position): Move | null {
  const moves = position.legalMoves()
  if (moves.length === 0) return null

  let best: Move | null = null
  let bestScore = -Infinity
  for (const move of moves) {
    const score = quickMaterialScore(position, move)
    // Ties break on SAN so a chain is reproducible between renders.
    if (score > bestScore || (score === bestScore && best && move.san < best.san)) {
      best = move
      bestScore = score
    }
  }
  return best
}

/**
 * Builds the if-then chain with no engine involved.
 *
 * `plies` counts total moves in the chain including the candidate, so the
 * default of 2 gives "if you play X, then they play Y" — the shape that
 * answers the question most of the time.
 */
export function buildStaticChain(
  position: Position,
  candidateMove: Move,
  plies = 2,
): ConsequenceChain {
  const learner = candidateMove.color
  const candidate = explainMove(position, candidateMove)

  const steps: ConsequenceStep[] = [buildStep(0, position, candidateMove, learner)]
  let current = position.after(candidateMove)

  while (steps.length < plies && !current.status().isGameOver) {
    const reply = likelyReply(current)
    if (!reply) break
    steps.push(buildStep(steps.length, current, reply, learner, true))
    current = current.after(reply)
  }

  return finalise({
    startFen: position.fen(),
    learner,
    candidate,
    steps,
    source: 'static',
    canExtend: !current.status().isGameOver,
  })
}

/**
 * Extends an existing chain by one move, backing the "and then?" button.
 * Returns the chain unchanged when the line has already ended.
 */
export function extendStaticChain(chain: ConsequenceChain): ConsequenceChain {
  const lastFen = chain.steps.at(-1)?.fenAfter
  if (!lastFen) return chain
  const current = Position.fromFen(lastFen)
  if (current.status().isGameOver) return { ...chain, canExtend: false }

  const reply = likelyReply(current)
  if (!reply) return { ...chain, canExtend: false }

  const steps = [
    ...chain.steps,
    buildStep(chain.steps.length, current, reply, chain.learner, chain.source === 'static'),
  ]
  const after = current.after(reply)
  return finalise({ ...chain, steps, canExtend: !after.status().isGameOver })
}

/**
 * Builds the chain from Stockfish's principal variation, which is what the
 * position actually holds rather than what we guess the opponent will do.
 */
export async function buildEngineChain(
  engine: ChessEngine,
  position: Position,
  candidateMove: Move,
  plies = 4,
): Promise<ConsequenceChain> {
  const learner = candidateMove.color
  const candidate = explainMove(position, candidateMove)
  const after = position.after(candidateMove)

  const steps: ConsequenceStep[] = [buildStep(0, position, candidateMove, learner)]

  const analysis = await engine.analyse({ fen: after.fen(), depth: 12, multiPv: 1 })
  const line = analysis.lines[0]

  // Engine scores come from the side-to-move's point of view; after our
  // candidate move that is the opponent, so flip it to face the learner.
  if (line) {
    const first = steps[0]!
    first.evalAfter = line.scoreCp === null ? null : -line.scoreCp
    first.mateIn = line.mateIn === null ? null : -line.mateIn
  }

  let current = after
  for (const lan of line?.pv ?? []) {
    if (steps.length >= plies) break
    const { from, to, promotion } = splitLan(lan)
    const move = current.findMove(from as Square, to as Square, promotion as never)
    if (!move) break // the PV ran past a position we can no longer follow
    steps.push(buildStep(steps.length, current, move, learner))
    current = current.after(move)
  }

  return finalise({
    startFen: position.fen(),
    learner,
    candidate,
    steps,
    source: 'engine',
    canExtend: !current.status().isGameOver,
  })
}

/* ------------------------------------------------------------------------ */

function finalise(
  chain: Omit<ConsequenceChain, 'narrative' | 'netMaterial'>,
): ConsequenceChain {
  const before = Position.fromFen(chain.startFen)
  const materialBefore = learnerMaterial(before, chain.learner)
  const materialAfter = chain.steps.at(-1)?.materialAfter ?? materialBefore
  const netMaterial = materialAfter - materialBefore

  return { ...chain, netMaterial, narrative: narrate(chain, netMaterial) }
}

function narrate(
  chain: Omit<ConsequenceChain, 'narrative' | 'netMaterial'>,
  netMaterial: number,
): string {
  const clauses = chain.steps.map((s) => s.clause)
  const last = chain.steps.at(-1)

  let outcome: string
  if (last?.isCheckmate) {
    outcome =
      last.side === 'you'
        ? ' and you win the game.'
        : ' and you have been checkmated.'
  } else if (netMaterial > 0) {
    outcome = ` — you come out ${netMaterial} ${pawnWord(netMaterial)} ahead.`
  } else if (netMaterial < 0) {
    outcome = ` — you end up ${Math.abs(netMaterial)} ${pawnWord(netMaterial)} down.`
  } else {
    outcome = ' — material stays level.'
  }

  return `${clauses.join(', ')}${outcome}`
}

function pawnWord(n: number): string {
  return Math.abs(n) === 1 ? 'pawn' : 'pawns'
}

/** Short label for the material outcome, for a badge next to the chain. */
export function chainOutcomeLabel(chain: ConsequenceChain): string {
  const last = chain.steps.at(-1)
  if (last?.isCheckmate) return last.side === 'you' ? 'You win' : 'You get mated'
  if (chain.netMaterial === 0) return 'Level'
  return formatMaterial(chain.netMaterial)
}
