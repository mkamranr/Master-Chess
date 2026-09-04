import type { Chapter } from '../types'

export const chapterPieces: Chapter = {
  id: 'pieces',
  number: 2,
  title: 'The pieces',
  outcome: 'Move every piece correctly and know what each one is worth.',
  requires: ['board'],
  lessons: [
    /* --- pawn ---------------------------------------------------------- */
    {
      kind: 'explain',
      id: 'piece-pawn-move',
      title: 'The pawn: forward only',
      fen: '7k/8/8/8/8/8/4P3/K7 w - - 0 1',
      body: [
        'A pawn moves one square straight forward. It can never move backwards and never sideways — the only piece in chess with no way to retreat.',
        'From its starting square only, a pawn may advance **two** squares instead of one. Select the pawn on e2 and you will see both e3 and e4 offered.',
        'Once it has moved, that pawn is a one-square-at-a-time piece for the rest of the game.',
      ],
      hints: ['Select the pawn and count the highlighted squares: there should be two.'],
    },
    {
      kind: 'do',
      id: 'piece-pawn-do',
      title: 'Move a pawn two squares',
      fen: '7k/8/8/8/8/8/4P3/K7 w - - 0 1',
      objective: 'Use the pawn\'s first-move option and advance it two squares to e4.',
      accept: { kind: 'exact-san', san: ['e4'] },
      solution: 'e4',
      successText:
        'That is the double first move. Note that it is now on e4 and can only manage one square at a time from here on.',
      retryText: 'That was a legal pawn move, but this lesson wants the two-square advance to e4.',
      body: ['Advance the pawn from e2 to e4.'],
    },
    {
      kind: 'do',
      id: 'piece-pawn-capture',
      title: 'The pawn captures diagonally',
      fen: '7k/8/8/3p4/4P3/8/8/K7 w - - 0 1',
      objective: 'Capture the black pawn on d5.',
      accept: { kind: 'capture-on', square: 'd5' },
      solution: 'exd5',
      successText:
        'Exactly. A pawn captures one square diagonally forward — never straight ahead. This is the only piece whose capture differs from its move.',
      retryText: 'Try again: the black pawn is on d5, diagonally in front of your pawn.',
      body: [
        'Your pawn is on e4 and a black pawn sits on d5, diagonally in front of it.',
        'A pawn cannot take the piece directly ahead of it — that piece simply blocks it. It takes on the diagonal.',
      ],
      hints: [
        'Look diagonally forward from e4: the squares d5 and f5.',
        'Select your pawn — the capture is ringed on the board.',
      ],
    },

    /* --- rook ---------------------------------------------------------- */
    {
      kind: 'explain',
      id: 'piece-rook',
      title: 'The rook: straight lines',
      fen: '7k/8/8/8/3R4/8/8/K7 w - - 0 1',
      body: [
        'A rook slides any number of squares in a straight line: up, down, left or right. Never diagonally.',
        'Select it and you will see it covers a whole cross of squares — 14 of them from an open square like d4, regardless of where on the board that is.',
        'A rook is stopped by the first piece it meets. It captures an enemy piece there, and is blocked by a friendly one.',
      ],
    },
    {
      kind: 'do',
      id: 'piece-rook-do',
      title: 'Move the rook across the board',
      fen: '7k/8/8/8/3R4/8/8/K7 w - - 0 1',
      objective: 'Slide the rook along the fourth rank to h4.',
      accept: { kind: 'exact-san', san: ['Rh4+'] },
      solution: 'Rh4+',
      successText:
        'Distance costs a rook nothing — one move took it right across the board. It even arrived with check, since the h-file now runs straight into the black king.',
      body: ['Send the rook from d4 to h4.'],
    },

    /* --- knight -------------------------------------------------------- */
    {
      kind: 'explain',
      id: 'piece-knight',
      title: 'The knight: the L-shape jumper',
      fen: '7k/8/8/8/3N4/8/8/K7 w - - 0 1',
      body: [
        'A knight moves two squares in a straight line and then one square at a right angle — an L. From d4 it reaches eight squares, and they form a ring around it rather than a line.',
        'The knight is the **only** piece that jumps. Whatever stands between it and its destination is simply ignored, friendly or hostile.',
        'A useful check: a knight always lands on the opposite colour to the square it left. If it starts on a light square, it finishes on a dark one, every single time.',
      ],
      hints: [
        'Two out, one across. Or one across, two out — same thing.',
        'Because it jumps, a wall of pawns does not slow a knight down at all.',
      ],
    },
    {
      kind: 'do',
      id: 'piece-knight-do',
      title: 'Jump the knight over a wall',
      fen: '7k/8/8/8/3N4/2PPP3/2PPP3/K7 w - - 0 1',
      objective: 'Move the knight even though it is completely surrounded by your own pawns.',
      accept: { kind: 'piece-from', square: 'd4' },
      solution: 'Nb5',
      successText:
        'Nothing blocks a knight. That is why it is so awkward to defend against in cramped positions.',
      retryText: 'Move the knight itself — it is the piece on d4.',
      body: [
        'The knight on d4 is walled in by its own pawns. Every other piece would be stuck.',
        'Move the knight anywhere it can legally go.',
      ],
    },

    /* --- bishop -------------------------------------------------------- */
    {
      kind: 'explain',
      id: 'piece-bishop',
      title: 'The bishop: diagonals forever',
      fen: '7k/8/8/3B4/8/8/8/K7 w - - 0 1',
      body: [
        'A bishop slides any number of squares along a diagonal, in any of the four diagonal directions.',
        'Look carefully at every square it can reach: they are all the same colour as the square it stands on. A bishop can never change colour, so it can only ever touch half the board.',
        'That is why the two bishops working together are worth more than the sum of their parts — between them they cover everything.',
      ],
      hints: ['Count the squares it reaches. Every one is a light square, like d5 itself.'],
    },
    {
      kind: 'do',
      id: 'piece-bishop-do',
      title: 'Take the long diagonal',
      // A black pawn is present so the position is not an immediate draw by
      // insufficient material — king and bishop alone against a bare king is
      // a finished game before the lesson even starts.
      fen: '7k/7p/8/3B4/8/8/8/K7 w - - 0 1',
      objective: 'Move the bishop to a8, at the far end of its diagonal.',
      accept: { kind: 'exact-san', san: ['Ba8'] },
      solution: 'Ba8',
      successText:
        'Bishops love long open diagonals. On a blocked board they can be nearly useless — the same piece, wildly different value.',
      body: ['Send the bishop from d5 up the diagonal to a8.'],
    },

    /* --- queen --------------------------------------------------------- */
    {
      kind: 'explain',
      id: 'piece-queen',
      title: 'The queen: rook plus bishop',
      fen: '7k/8/8/3Q4/8/8/8/K7 w - - 0 1',
      body: [
        'A queen moves like a rook and a bishop combined: any distance in a straight line or along a diagonal, in all eight directions.',
        'From an open central square she covers 27 squares. She is worth about as much as two rooks, and far more than any other single piece.',
        'Her value is also her weakness. Anything can chase her — a pawn, a knight — and she has to run, because trading her for something small is a disaster. Do not bring her out early.',
      ],
    },
    {
      kind: 'do',
      id: 'piece-queen-do',
      title: 'Move the queen like a bishop',
      fen: '7k/8/8/3Q4/8/8/8/K7 w - - 0 1',
      objective: 'Move the queen diagonally to h1.',
      accept: { kind: 'exact-san', san: ['Qh1+'] },
      solution: 'Qh1+',
      successText:
        'She travelled as a bishop and arrived checking as a rook, straight up the h-file. That flexibility is what makes her so strong.',
      body: ['Send the queen down the diagonal from d5 to h1.'],
    },

    /* --- king ---------------------------------------------------------- */
    {
      kind: 'explain',
      id: 'piece-king',
      demoBoard: true,
      title: 'The king: one square, but it matters most',
      fen: 'k7/8/8/8/4K3/8/8/8 w - - 0 1',
      body: [
        'A king moves exactly one square in any of the eight directions. Slow — but the whole game is about keeping it safe.',
        'A king may **never** move onto a square an enemy piece attacks, and may never stay on one. That is not a suggestion; such moves are simply illegal and the app will not let you make them.',
        'It follows that the two kings can never stand next to each other, since each would be attacking the other. Try moving this king toward the black one and watch the squares beside it refuse to light up.',
      ],
      hints: [
        'Select the white king and look for the squares that are NOT offered near the black king.',
      ],
    },
    {
      kind: 'explain',
      id: 'piece-values',
      title: 'What everything is worth',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      body: [
        'Pieces are measured in pawns: **pawn 1, knight 3, bishop 3, rook 5, queen 9**. The king has no value because it is never traded.',
        'These numbers are approximations, but they are good enough to win games. Losing a rook for a knight is a bad deal roughly whenever it happens, and knowing that instantly is most of what separates a beginner from a club player.',
        'The material bar in the Board Read panel keeps this count for you throughout — but do the arithmetic yourself as well. It is the habit that matters.',
      ],
      hints: ['Rough guide: a rook is worth about a knight plus two pawns.'],
    },
  ],
}
