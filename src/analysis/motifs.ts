import type { Color, Move, PieceSymbol, Square } from '@/chess/game'
import { Position } from '@/chess/game'
import {
  PIECE_VALUE,
  colorName,
  opposite,
  pieceName,
  ray,
  slidingDirections,
} from '@/chess/values'
import { defendersOf } from './threats'

/* ---------------------------------------------------------------------------
 * Named tactical patterns.
 *
 * Naming a pattern is how a learner turns "I can see something here" into
 * transferable knowledge, so every motif carries a plain-English description
 * as well as its geometry.
 *
 * Each motif reports a confidence. `certain` means the pattern is exact
 * geometry or a verified forced result — a pin really is a pin, a mate really
 * is a mate. `likely` means it is a judgement call. The coach must never
 * assert a `likely` motif as fact; it phrases those as "this looks like…" and
 * leans on the concrete threat instead.
 * ------------------------------------------------------------------------ */

export type MotifKind =
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered-attack'
  | 'double-check'
  | 'back-rank'
  | 'back-rank-mate'
  | 'trapped-piece'
  | 'removes-defender'

export type Confidence = 'certain' | 'likely'

export interface Motif {
  kind: MotifKind
  /** Short label for the coach panel, e.g. "Knight fork". */
  name: string
  /** One or two sentences a complete beginner can follow. */
  description: string
  /** The square doing the work (our piece), where there is one. */
  by: Square | null
  /** Squares involved, ordered nearest-first where geometry implies an order. */
  targets: Square[]
  confidence: Confidence
  /** Set when the motif is tied to one specific move. */
  san?: string
}

const CERTAIN_FIRST = (a: Motif, b: Motif) =>
  a.confidence === b.confidence ? 0 : a.confidence === 'certain' ? -1 : 1

/** Ensures we can generate moves for `color` even if the FEN says otherwise. */
function asTurnOf(position: Position, color: Color): Position | null {
  if (position.turn() === color) return position
  return position.withTurnPassed()
}

/* ---------------------------------------------------------------------------
 * Forks
 * ------------------------------------------------------------------------ */

/**
 * A target is worth forking if taking it would actually gain something: the
 * king (which must respond), a piece worth more than the attacker, or any
 * undefended piece.
 */
function isWorthwhileTarget(
  position: Position,
  target: Square,
  targetType: PieceSymbol,
  attackerType: PieceSymbol,
): boolean {
  if (targetType === 'k') return true
  if (PIECE_VALUE[targetType] > PIECE_VALUE[attackerType]) return true
  return defendersOf(position, target).length === 0
}

export function findForks(position: Position, color: Color): Motif[] {
  const enemy = opposite(color)
  const out: Motif[] = []

  for (const attacker of position.piecesOf(color)) {
    const targets = position
      .piecesOf(enemy)
      .filter((victim) => position.attackers(victim.square, color).includes(attacker.square))
      .filter((victim) => isWorthwhileTarget(position, victim.square, victim.type, attacker.type))

    if (targets.length < 2) continue

    // If the forking piece can simply be taken for profit, the fork may not be
    // worth anything — report it, but do not assert it.
    const attackedBack = position.attackers(attacker.square, enemy).length > 0
    const defended = defendersOf(position, attacker.square).length > 0
    const shaky = attackedBack && !defended

    const names = targets.map((t) => `${pieceName(t.type)} on ${t.square}`).join(' and the ')
    out.push({
      kind: 'fork',
      name: `${capitalise(pieceName(attacker.type))} fork`,
      description:
        `The ${pieceName(attacker.type)} on ${attacker.square} attacks the ${names} at the same time. ` +
        `${colorName(enemy)} can only save one of them, so the other can be taken next move.` +
        (shaky ? ' Careful though — the forking piece can be captured, so check that first.' : ''),
      by: attacker.square,
      targets: targets.map((t) => t.square),
      confidence: shaky ? 'likely' : 'certain',
    })
  }
  return out
}

/* ---------------------------------------------------------------------------
 * Pins and skewers — one shared piece of geometry
 *
 * Walk out along each of a slider's lines. The first piece found is the
 * "front" piece, the next one behind it is the "back" piece. If both belong to
 * the opponent then the front piece is stuck on the line:
 *   - back piece more valuable  → a pin (front cannot move without exposing it)
 *   - back piece less valuable  → a skewer (front will move, then we take back)
 * A king behind is always a pin, and an absolute one.
 * ------------------------------------------------------------------------ */

export function findPinsAndSkewers(position: Position, color: Color): Motif[] {
  const enemy = opposite(color)
  const out: Motif[] = []

  for (const slider of position.piecesOf(color)) {
    for (const dir of slidingDirections(slider.type)) {
      const line = ray(slider.square, dir)
      const occupied = line.filter((sq) => position.pieceAt(sq))
      const frontSquare = occupied[0]
      const backSquare = occupied[1]
      if (!frontSquare || !backSquare) continue

      const front = position.pieceAt(frontSquare)!
      const back = position.pieceAt(backSquare)!
      if (front.color !== enemy || back.color !== enemy) continue

      // Treat a king as infinitely valuable on either end of the line. That
      // makes the two branches below fall out correctly on their own: nothing
      // can be more valuable than a king in front, so a king in front can
      // never be a pin — but it is the classic skewer, where the king is
      // forced to step aside and we take whatever was hiding behind it.
      const frontValue = front.type === 'k' ? Infinity : PIECE_VALUE[front.type]
      const backValue = back.type === 'k' ? Infinity : PIECE_VALUE[back.type]

      if (backValue > frontValue) {
        const absolute = back.type === 'k'
        out.push({
          kind: 'pin',
          name: absolute ? 'Absolute pin' : 'Pin',
          description: absolute
            ? `The ${pieceName(slider.type)} on ${slider.square} pins the ${pieceName(front.type)} on ${frontSquare} against the king on ${backSquare}. ` +
              `That ${pieceName(front.type)} is not allowed to leave the line at all — moving it would expose the king, which is illegal.`
            : `The ${pieceName(slider.type)} on ${slider.square} pins the ${pieceName(front.type)} on ${frontSquare} against the ${pieceName(back.type)} on ${backSquare}. ` +
              `Moving the ${pieceName(front.type)} would let you take the more valuable ${pieceName(back.type)} behind it.`,
          by: slider.square,
          targets: [frontSquare, backSquare],
          confidence: 'certain',
        })
      } else if (backValue < frontValue) {
        out.push({
          kind: 'skewer',
          name: 'Skewer',
          description:
            `The ${pieceName(slider.type)} on ${slider.square} attacks the ${pieceName(front.type)} on ${frontSquare}, ` +
            `and the ${pieceName(back.type)} on ${backSquare} is lined up right behind it. ` +
            `A skewer is a pin the other way round: the valuable piece has to move, and then you take the one behind it.`,
          by: slider.square,
          targets: [frontSquare, backSquare],
          confidence: 'certain',
        })
      }
    }
  }
  return out
}

/* ---------------------------------------------------------------------------
 * Back rank
 * ------------------------------------------------------------------------ */

export function findBackRank(position: Position, color: Color): Motif[] {
  const enemy = opposite(color)
  const kingSquare = position.kingSquare(enemy)
  if (!kingSquare) return []

  const backRank = enemy === 'w' ? '1' : '8'
  if (kingSquare[1] !== backRank) return []

  const out: Motif[] = []
  const enemyToMove = asTurnOf(position, enemy)
  const ourTurn = asTurnOf(position, color)

  // Boxed in: the king has no legal move that leaves its own back rank.
  const kingMoves = enemyToMove?.legalMoves(kingSquare) ?? []
  const hasFlightSquare = kingMoves.some((m) => m.to[1] !== backRank)

  // A boxed-in king is only a *weakness* if we can actually get at the back
  // rank. Without this the motif fires on the starting position — Black's king
  // does have no flight square at move one — which is noise that teaches the
  // learner to stop trusting the coach.
  const canReachBackRank =
    ourTurn?.legalMoves().some(
      (move) =>
        (move.piece === 'r' || move.piece === 'q') && move.to[1] === backRank,
    ) ?? false

  if (!hasFlightSquare && canReachBackRank) {
    out.push({
      kind: 'back-rank',
      name: 'Back-rank weakness',
      description:
        `${colorName(enemy)}'s king on ${kingSquare} has no escape square off its own back rank — ` +
        `its own pieces are in the way. A rook or queen arriving on that rank would be checkmate, ` +
        `because the king cannot step forward to run away.`,
      by: null,
      targets: [kingSquare],
      confidence: 'likely',
    })
  }

  // Verified mate is not a judgement call, so it is reported separately.
  if (ourTurn) {
    for (const move of ourTurn.legalMoves()) {
      if (!move.san.includes('#')) continue
      if (move.to[1] !== backRank) continue
      if (move.piece !== 'r' && move.piece !== 'q') continue
      out.push({
        kind: 'back-rank-mate',
        name: 'Back-rank mate',
        description:
          `${move.san} is checkmate. The ${pieceName(move.piece)} lands on the back rank, the king is ` +
          `boxed in by its own pieces, and there is no way to block or capture.`,
        by: move.from,
        targets: [kingSquare],
        confidence: 'certain',
        san: move.san,
      })
    }
  }

  return out
}

/* ---------------------------------------------------------------------------
 * Trapped pieces and overloaded defenders
 * ------------------------------------------------------------------------ */

export function findTrappedPieces(position: Position, color: Color): Motif[] {
  const enemy = opposite(color)
  const enemyToMove = asTurnOf(position, enemy)
  if (!enemyToMove) return []
  const out: Motif[] = []

  for (const victim of enemyToMove.piecesOf(enemy)) {
    if (victim.type === 'k' || victim.type === 'p') continue
    if (position.attackers(victim.square, color).length === 0) continue

    const escapes = enemyToMove.legalMoves(victim.square)
    const safeEscape = escapes.some((m) => {
      const after = enemyToMove.after(m)
      return after.attackers(m.to, color).length === 0 || defendersOf(after, m.to).length > 0
    })
    if (safeEscape) continue

    out.push({
      kind: 'trapped-piece',
      name: 'Trapped piece',
      description:
        `${colorName(enemy)}'s ${pieceName(victim.type)} on ${victim.square} is attacked and has nowhere safe to go. ` +
        `Pieces with no escape squares can often just be won.`,
      by: null,
      targets: [victim.square],
      confidence: 'likely',
    })
  }
  return out
}

/**
 * An enemy piece we attack that has exactly one real defender, where we can
 * also hit that defender. Take or chase the defender away and the piece behind
 * it falls — the idea taught as "removing the defender".
 */
export function findRemovableDefenders(position: Position, color: Color): Motif[] {
  const enemy = opposite(color)
  const out: Motif[] = []

  for (const victim of position.piecesOf(enemy)) {
    if (victim.type === 'k') continue
    if (position.attackers(victim.square, color).length === 0) continue

    const defenders = defendersOf(position, victim.square)
    const soleDefender = defenders.length === 1 ? defenders[0] : undefined
    if (!soleDefender) continue
    if (position.attackers(soleDefender, color).length === 0) continue

    const defenderPiece = position.pieceAt(soleDefender)!
    out.push({
      kind: 'removes-defender',
      name: 'Remove the defender',
      description:
        `The ${pieceName(victim.type)} on ${victim.square} is held up by exactly one defender: the ` +
        `${pieceName(defenderPiece.type)} on ${soleDefender}. You attack that defender too — take it or drive it away, ` +
        `and the ${pieceName(victim.type)} is left hanging.`,
      by: null,
      targets: [victim.square, soleDefender],
      confidence: 'likely',
    })
  }
  return out
}

/* ---------------------------------------------------------------------------
 * Public entry points
 * ------------------------------------------------------------------------ */

/** Every motif `color` has available in this position. */
export function detectMotifs(position: Position, color: Color): Motif[] {
  return [
    ...findForks(position, color),
    ...findPinsAndSkewers(position, color),
    ...findBackRank(position, color),
    ...findRemovableDefenders(position, color),
    ...findTrappedPieces(position, color),
  ].sort(CERTAIN_FIRST)
}

/**
 * Motifs that one specific move brings into being. Discovered attacks and
 * double checks only exist as a *change* between two positions, so they are
 * computed here rather than in `detectMotifs`.
 */
export function motifsCreatedBy(before: Position, move: Move): Motif[] {
  const after = before.after(move)
  const mover = move.color
  const enemy = opposite(mover)
  const out: Motif[] = []

  // Squares whose occupancy the move changed. For castling that is four
  // squares, not two, so derive it rather than assuming from/to.
  const changed = new Set<Square>()
  for (const square of new Set([
    ...before.pieces().map((p) => p.square),
    ...after.pieces().map((p) => p.square),
  ])) {
    const b = before.pieceAt(square)
    const a = after.pieceAt(square)
    if (b?.type !== a?.type || b?.color !== a?.color) changed.add(square)
  }

  // Double check: two pieces checking the king at once.
  const enemyKing = after.kingSquare(enemy)
  if (enemyKing) {
    const checkers = after.attackers(enemyKing, mover)
    if (checkers.length > 1) {
      out.push({
        kind: 'double-check',
        name: 'Double check',
        description:
          `Two pieces are checking the king at once (from ${checkers.join(' and ')}). ` +
          `You cannot block two lines or capture two attackers with one move, so the king is forced to move. ` +
          `Double check is the one kind of check where nothing else will do.`,
        by: move.to,
        targets: checkers,
        confidence: 'certain',
        san: move.san,
      })
    }
  }

  // Discovered attack: one of our pieces that did not move now attacks
  // something it could not reach before, because the mover stepped off its line.
  for (const victim of after.piecesOf(enemy)) {
    const beforeAttackers = new Set(before.attackers(victim.square, mover))
    for (const attacker of after.attackers(victim.square, mover)) {
      if (beforeAttackers.has(attacker)) continue
      if (changed.has(attacker)) continue // this piece moved; not a discovery
      const piece = after.pieceAt(attacker)
      if (!piece || slidingDirections(piece.type).length === 0) continue
      out.push({
        kind: 'discovered-attack',
        name: 'Discovered attack',
        description:
          `Moving the ${pieceName(move.piece)} off the line uncovered the ${pieceName(piece.type)} on ${attacker}, ` +
          `which now attacks the ${pieceName(victim.type)} on ${victim.square}. ` +
          `The piece that moved is not the one doing the damage — that is what makes discoveries easy to miss.`,
        by: attacker,
        targets: [victim.square],
        confidence: 'certain',
        san: move.san,
      })
    }
  }

  // Plus everything the resulting position now offers us.
  out.push(...detectMotifs(after, mover))

  return dedupe(out).sort(CERTAIN_FIRST)
}

function dedupe(motifs: Motif[]): Motif[] {
  const seen = new Set<string>()
  return motifs.filter((m) => {
    const key = `${m.kind}|${m.by}|${m.targets.join(',')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
