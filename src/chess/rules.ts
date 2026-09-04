import type { PieceSymbol } from 'chess.js'

/* ---------------------------------------------------------------------------
 * The rules, in words.
 *
 * This is the teaching text the coach panel and the lessons both read from, so
 * a rule is worded once and stays consistent everywhere. Written for someone
 * who has never played: no jargon that is not immediately defined.
 * ------------------------------------------------------------------------ */

export interface PieceRule {
  name: string
  /** One-line summary — the thing to remember. */
  short: string
  /** The full rule. */
  full: string
  /** The detail beginners most often get wrong. */
  gotcha: string
  value: string
}

export const PIECE_RULES: Record<PieceSymbol, PieceRule> = {
  p: {
    name: 'Pawn',
    short: 'Walks one square forward. Captures one square diagonally forward.',
    full:
      'A pawn moves straight forward one square, and never backwards or sideways. ' +
      'From its starting square only, it may go forward two squares instead. ' +
      'It captures differently from how it moves: one square diagonally forward, never straight ahead.',
    gotcha:
      'A pawn cannot capture the piece directly in front of it — that piece blocks it completely. ' +
      'This is the only piece in chess whose capture differs from its move.',
    value: 'Worth 1. The unit everything else is measured against.',
  },
  n: {
    name: 'Knight',
    short: 'Moves in an L: two squares one way, then one square at a right angle.',
    full:
      'A knight moves two squares in a straight line and then one square at a right angle — an L shape. ' +
      'It always lands on a square of the opposite colour to the one it left. ' +
      'It is the only piece that jumps: whatever stands in between is simply ignored.',
    gotcha:
      'Because it jumps, a knight cannot be blocked and cannot be stopped by a wall of pawns. ' +
      'It is also the only piece that can attack a queen without the queen being able to attack it back.',
    value: 'Worth 3. Best in the middle of the board, weak in a corner.',
  },
  b: {
    name: 'Bishop',
    short: 'Slides any distance diagonally.',
    full:
      'A bishop slides any number of empty squares along a diagonal, in any of the four diagonal directions. ' +
      'It stops when it reaches a piece: it captures an enemy piece there, and is blocked by a friendly one.',
    gotcha:
      'A bishop can never change square colour. A bishop that starts on a light square only ever ' +
      'visits light squares — so half the board is permanently out of its reach.',
    value: 'Worth 3, like a knight, but the two bishops together are worth more than the parts.',
  },
  r: {
    name: 'Rook',
    short: 'Slides any distance along a rank or a file.',
    full:
      'A rook slides any number of empty squares in a straight line: up, down, left or right. ' +
      'It captures the first enemy piece it meets and is blocked by the first friendly one.',
    gotcha:
      'Rooks are poor early on, boxed in behind their own pawns, and strong later once files open up. ' +
      'Two rooks on the same open file or rank support each other and are far stronger than one.',
    value: 'Worth 5. Two rooks are usually a little better than a queen.',
  },
  q: {
    name: 'Queen',
    short: 'Slides any distance in any of the eight directions — rook and bishop combined.',
    full:
      'A queen slides any number of empty squares in a straight line or along a diagonal — every ' +
      'direction a rook or a bishop could go. She is by far the most powerful piece.',
    gotcha:
      'Being the most valuable piece is a weakness too: anything can chase her, and she must retreat ' +
      'from a pawn or a knight. Bringing her out early usually just loses time.',
    value: 'Worth 9. Losing her for nothing normally loses the game.',
  },
  k: {
    name: 'King',
    short: 'Moves one square in any direction. Must never stand on an attacked square.',
    full:
      'A king moves exactly one square in any of the eight directions. Once per game it may also ' +
      'castle (see the castling rule). The king is never captured and never traded: the whole game ' +
      'is about it.',
    gotcha:
      'A king may not move onto a square an enemy piece attacks, and may not stay on one either. ' +
      'The two kings can also never stand next to each other, since each would be attacking the other.',
    value: 'Priceless — it is not counted in material at all.',
  },
}

export interface SpecialRule {
  name: string
  short: string
  conditions: string[]
  gotcha: string
}

export const CASTLING_RULE: SpecialRule = {
  name: 'Castling',
  short:
    'A one-off double move: the king steps two squares toward a rook, and that rook hops to the ' +
    'square the king crossed. It is the only move where two of your pieces move at once.',
  conditions: [
    'Neither that king nor that rook has moved at any earlier point in the game.',
    'Every square between the king and the rook is empty.',
    'The king is not currently in check.',
    'The king does not pass through a square an enemy piece attacks.',
    'The king does not land on a square an enemy piece attacks.',
  ],
  gotcha:
    'Only the king is restricted by attacked squares. The rook may be attacked, and may pass ' +
    'through an attacked square, and castling is still perfectly legal.',
}

export const EN_PASSANT_RULE: SpecialRule = {
  name: 'En passant',
  short:
    'When an enemy pawn uses its two-square first move to slip past your pawn, you may capture it ' +
    'as though it had only moved one square. French for "in passing".',
  conditions: [
    'The enemy pawn has just moved two squares forward, as its very first move.',
    'Your capturing pawn stands directly beside it, on the same rank.',
    'You capture immediately — the right disappears if you play anything else first.',
  ],
  gotcha:
    'Your pawn lands on the empty square the enemy pawn skipped over, not on the square the ' +
    'captured pawn occupies. It is the only capture in chess where you do not land on your victim.',
}

export const PROMOTION_RULE: SpecialRule = {
  name: 'Promotion',
  short:
    'A pawn that reaches the far end of the board must immediately become a queen, rook, bishop ' +
    'or knight of its own colour.',
  conditions: [
    'The pawn reaches the eighth rank (or the first rank, for Black).',
    'You must choose a new piece — the pawn cannot stay a pawn.',
    'You may take a queen even if you still have one; there is no limit.',
  ],
  gotcha:
    'You are not restricted to pieces you have lost, and you cannot promote to a king. ' +
    'Choosing a knight instead of a queen is occasionally right, usually because it comes with check.',
}

export const CHECK_RULE = {
  name: 'Check',
  short: 'Your king is being attacked. You must deal with it this move — you cannot ignore it.',
  responses: [
    'Move the king to a square that is not attacked.',
    'Block the line by putting a piece in the way (impossible against a knight).',
    'Capture the piece that is giving check.',
  ],
  gotcha:
    'Those three are the only options that exist. If none of them is available, it is checkmate ' +
    'and the game is over. Against a double check — two pieces checking at once — only moving ' +
    'the king can work, since one move cannot answer two attackers.',
}

export const CHECKMATE_RULE = {
  name: 'Checkmate',
  short: 'The king is in check and there is no legal way out. The game ends immediately.',
  gotcha:
    'The king is never actually captured. The game stops the moment there is no escape.',
}

export const STALEMATE_RULE = {
  name: 'Stalemate',
  short:
    'The player to move has no legal move at all, but is NOT in check. The game is a draw — ' +
    'half a point each, no winner.',
  gotcha:
    'This catches out almost every beginner: if you are winning easily, take care not to leave ' +
    'your opponent with no moves. A stalemate throws away a whole won game.',
}

export const DRAW_RULES = [
  {
    name: 'Stalemate',
    detail: 'No legal move available and not in check.',
  },
  {
    name: 'Insufficient material',
    detail:
      'Neither side has enough left to force a checkmate — king against king, or king and a ' +
      'single bishop or knight against a bare king.',
  },
  {
    name: 'Fifty-move rule',
    detail:
      'Fifty moves by each side with no capture and no pawn move. Nothing is progressing, so ' +
      'either player may claim the draw.',
  },
  {
    name: 'Threefold repetition',
    detail:
      'The very same position, with the same player to move and the same options, has occurred ' +
      'three times. Either player may claim the draw.',
  },
  {
    name: 'Agreement',
    detail: 'Both players simply agree to a draw.',
  },
] as const

export const OPENING_PRINCIPLES = [
  {
    name: 'Take the centre',
    detail:
      'Push a pawn to the middle — e4 or d4. Pieces in the centre reach more squares, and a pawn ' +
      'there takes squares away from your opponent.',
  },
  {
    name: 'Develop your pieces',
    detail:
      'Get knights and bishops off the back row and onto useful squares. A piece still on its ' +
      'starting square is doing nothing.',
  },
  {
    name: 'Castle early',
    detail:
      'Castling tucks the king away behind pawns and brings a rook toward the centre. Two good ' +
      'things for one move. Do it in the first ten moves or so.',
  },
  {
    name: 'Do not move the same piece twice',
    detail:
      'Every move you spend re-positioning one piece is a move your opponent spends developing a ' +
      'new one. Aim to move each piece once, well.',
  },
  {
    name: 'Keep the queen home for now',
    detail:
      'She is the easiest piece to attack. Bringing her out early hands your opponent free ' +
      'developing moves while she runs away.',
  },
] as const
