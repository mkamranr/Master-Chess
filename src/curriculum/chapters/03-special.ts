import type { Chapter } from '../types'

export const chapterSpecial: Chapter = {
  id: 'special',
  number: 3,
  title: 'Special moves',
  outcome: 'Castle correctly, take en passant, and promote a pawn.',
  requires: ['pieces'],
  lessons: [
    {
      kind: 'do',
      id: 'special-castle-kingside',
      title: 'Castling: the short side',
      fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
      objective: 'Castle kingside.',
      accept: { kind: 'castles', side: 'kingside' },
      solution: 'O-O',
      successText:
        'The king went two squares to g1 and the rook hopped over it to f1. Two pieces improved in one move — that is why castling is such good value.',
      retryText: 'Castling is a king move: pick up the king and put it on g1.',
      body: [
        'Castling is the one move where two of your pieces move at once. The king steps two squares toward a rook, and that rook jumps to the square the king crossed.',
        'It is written **O-O** on the kingside (the short side) and **O-O-O** on the queenside.',
        'Do it by moving the *king* two squares — not the rook.',
      ],
      hints: ['Select the king on e1. The square g1 will be offered.'],
    },
    {
      kind: 'do',
      id: 'special-castle-queenside',
      title: 'Castling: the long side',
      fen: '4k3/8/8/8/8/8/8/R3K3 w Q - 0 1',
      objective: 'Castle queenside.',
      accept: { kind: 'castles', side: 'queenside' },
      solution: 'O-O-O',
      successText:
        'Queenside castling puts the king on c1 and the rook on d1. The king ends up slightly more exposed than on the kingside, but the rook lands on a more useful file.',
      body: ['Same move, other side: the king goes two squares toward the rook on a1.'],
    },
    {
      kind: 'explain',
      id: 'special-castle-rules',
      title: 'The five conditions for castling',
      fen: '4k3/8/8/8/8/8/8/4KB1R w K - 0 1',
      body: [
        'Castling is legal only when **all** of these hold: neither that king nor that rook has moved at any point in the game; every square between them is empty; the king is not currently in check; the king does not pass through an attacked square; and the king does not land on an attacked square.',
        'In this position the bishop on f1 is in the way, so kingside castling is unavailable. Select the king and you will see g1 is not offered.',
        'The condition people get wrong is the last two: they apply **only to the king**. The rook may be attacked, and the rook may pass through an attacked square, and castling remains perfectly legal.',
      ],
      hints: [
        'Select the king — the Rule panel checks all five conditions against this exact position.',
      ],
    },
    {
      kind: 'explain',
      id: 'special-castle-through-check',
      title: 'Castling through check is not allowed',
      fen: '4kr2/8/8/8/8/8/8/4K2R w K - 0 1',
      arrows: [{ from: 'f8', to: 'f1', label: 'covered' }],
      body: [
        'Here the squares are empty, the king is not in check, and neither piece has moved. Yet castling is still illegal.',
        'The reason is the black rook on f8: it covers f1, the square the king would cross. A king may not travel through a square the enemy attacks, even for an instant.',
        'Select the king and confirm that g1 is not on offer. Then imagine the black rook on h8 instead — castling would be fine, because h1 is where the *rook* lands, and the rook is allowed to be attacked.',
      ],
    },
    {
      kind: 'do',
      id: 'special-en-passant',
      title: 'En passant: catching a pawn in passing',
      fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',
      objective: 'Capture the black pawn on d5 en passant.',
      accept: { kind: 'en-passant' },
      solution: 'exd6',
      successText:
        'Notice where your pawn ended up: on d6, the square the black pawn skipped over — not on d5 where the pawn actually stood. It is the only capture in chess where you do not land on your victim.',
      retryText: 'The en passant capture is exd6 — your pawn moves to the empty square d6.',
      body: [
        'Black has just pushed a pawn two squares, from d7 to d5, sliding it past your pawn on e5. If pawns could always do that, a pawn could never be stopped.',
        'So the rules allow you to capture it as though it had only moved one square. Your pawn takes to **d6** and the black pawn is removed.',
        'This right lasts for exactly one move. Play anything else and it is gone forever.',
      ],
      hints: [
        'Select your e5 pawn. The square d6 is offered even though it looks empty.',
        'You end up on d6; the captured pawn was on d5.',
      ],
    },
    {
      kind: 'do',
      id: 'special-promotion',
      title: 'Promotion: a pawn becomes a queen',
      fen: '4k3/P7/8/8/8/8/8/4K3 w - - 0 1',
      objective: 'Promote the pawn on a7.',
      accept: { kind: 'promotes' },
      solution: 'a8=Q+',
      successText:
        'A pawn worth 1 just became a piece worth 9. This is why a single passed pawn can decide a game, and why endgames are all about pawns.',
      body: [
        'A pawn that reaches the far end of the board must immediately become a queen, rook, bishop or knight of its own colour. It cannot stay a pawn, and it cannot become a king.',
        'You are not limited to pieces you have already lost — you may have two queens, or three, or eight.',
        'Push the pawn to a8 and the app will ask what it becomes.',
      ],
      hints: ['Almost always choose the queen. She is the strongest piece by a wide margin.'],
    },
    {
      kind: 'explain',
      id: 'special-underpromotion',
      title: 'When a knight beats a queen',
      fen: '8/4P1k1/8/8/8/8/8/K7 w - - 0 1',
      arrows: [{ from: 'e7', to: 'e8', label: 'promote' }],
      body: [
        'Occasionally promoting to something other than a queen is right, and it is nearly always because the lesser piece comes with check.',
        'Look at this pawn on e7 and the black king on g7. Promote to a **knight** and the new knight on e8 attacks g7 — check. Promote to a **queen** and she attacks the e-file, the eighth rank and two diagonals, none of which touch g7 — no check at all.',
        'So the rule is: promote to a queen unless you can see a concrete reason not to. Underpromotion is real but rare, and choosing a knight for style will cost you games.',
      ],
      hints: [
        'Select the pawn and try each promotion piece in the chooser to see what each one attacks.',
        'A knight on e8 reaches c7, d6, f6 and g7.',
      ],
    },
  ],
}
