import type { Move } from '@/chess/game'
import { Position } from '@/chess/game'
import { explainMove } from '@/analysis/explain'
import { checkResponses } from '@/analysis/threats'
import type { Acceptance } from './types'

/* ---------------------------------------------------------------------------
 * Judging an answer.
 *
 * One pure function, so the same logic decides whether a learner's move was
 * right at runtime and whether an authored solution is genuinely correct in
 * the test suite. If those two ever disagreed, lessons would be unpassable.
 * ------------------------------------------------------------------------ */

export function moveSatisfies(
  position: Position,
  move: Move,
  accept: Acceptance,
): boolean {
  switch (accept.kind) {
    case 'exact-san':
      return accept.san.includes(move.san)

    case 'destination':
      return accept.squares.includes(move.to)

    case 'piece-from':
      return move.from === accept.square

    case 'capture-on':
      // En passant is the one capture that does not land on its victim.
      if (move.isEnPassant()) {
        const victimRank = move.color === 'w' ? '5' : '4'
        return accept.square === `${move.to[0]}${victimRank}`
      }
      return move.isCapture() && move.to === accept.square

    case 'gives-check': {
      const after = position.after(move)
      const status = after.status()
      return status.inCheck || status.isCheckmate
    }

    case 'delivers-mate':
      return position.after(move).status().isCheckmate

    case 'wins-material':
      return explainMove(position, move, { includeMotifs: false }).netMaterial >= accept.atLeast

    case 'stays-safe':
      return explainMove(position, move, { includeMotifs: false }).netMaterial >= 0

    case 'castles': {
      if (accept.side === 'kingside') return move.isKingsideCastle()
      if (accept.side === 'queenside') return move.isQueensideCastle()
      return move.isKingsideCastle() || move.isQueensideCastle()
    }

    case 'promotes':
      if (!move.promotion) return false
      return accept.to ? move.promotion === accept.to : true

    case 'en-passant':
      return move.isEnPassant()

    case 'escapes-check': {
      const responses = checkResponses(position)
      if (!responses.inCheck) return false
      const kingSquare = position.kingSquare(position.turn())
      if (accept.via === 'move-king') return move.from === kingSquare
      if (accept.via === 'capture') {
        return move.from !== kingSquare && responses.checkers.includes(move.to)
      }
      return move.from !== kingSquare && responses.block.includes(move.to)
    }
  }
}

/** A human-readable statement of what the lesson is asking for. */
export function describeAcceptance(accept: Acceptance): string {
  switch (accept.kind) {
    case 'exact-san':
      return accept.san.length === 1
        ? `Play ${accept.san[0]}.`
        : `Play one of: ${accept.san.join(', ')}.`
    case 'destination':
      return `Move a piece to ${accept.squares.join(' or ')}.`
    case 'piece-from':
      return `Move the piece on ${accept.square}.`
    case 'capture-on':
      return `Capture the piece on ${accept.square}.`
    case 'gives-check':
      return 'Play a move that puts the enemy king in check.'
    case 'delivers-mate':
      return 'Find checkmate in one move.'
    case 'wins-material':
      return `Win at least ${accept.atLeast} ${accept.atLeast === 1 ? 'pawn' : 'pawns'} of material.`
    case 'stays-safe':
      return 'Play a move that gives nothing away.'
    case 'castles':
      return accept.side ? `Castle ${accept.side}.` : 'Castle.'
    case 'promotes':
      return accept.to ? `Promote the pawn to a ${accept.to.toUpperCase()}.` : 'Promote the pawn.'
    case 'en-passant':
      return 'Capture en passant.'
    case 'escapes-check':
      return accept.via === 'move-king'
        ? 'Escape the check by moving your king.'
        : accept.via === 'block'
          ? 'Escape the check by blocking the line.'
          : 'Escape the check by capturing the attacker.'
  }
}

/** Every legal move that would satisfy the rule — used by hints. */
export function acceptableMoves(position: Position, accept: Acceptance): Move[] {
  return position.legalMoves().filter((move) => moveSatisfies(position, move, accept))
}
