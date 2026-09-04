import type { Chapter } from '../types'

export const chapterEndgames: Chapter = {
  id: 'endgames',
  number: 11,
  title: 'Endgames',
  outcome: 'Convert an extra pawn, and know when a race is already lost.',
  requires: ['mates'],
  lessons: [
    {
      kind: 'explain',
      id: 'endgame-king-activity',
      title: 'The king becomes a fighting piece',
      fen: '8/8/8/4k3/8/4K3/4P3/8 w - - 0 1',
      body: [
        'For the whole game you have been hiding your king. In the endgame that reverses completely: with few pieces left there is little to fear, and the king becomes one of your strongest pieces.',
        'An active king in the centre can be worth more than an extra pawn. A king stuck on g1 while the opponent\'s marches into the middle usually loses.',
        'The habit to build: when the queens come off, start walking your king toward the action.',
      ],
      hints: ['Compare the two kings here. Whichever gets in front of the pawn decides the game.'],
    },
    {
      kind: 'do',
      id: 'endgame-king-first',
      title: 'King before pawn',
      fen: '8/8/8/4k3/8/8/4PK2/8 w - - 0 1',
      objective: 'Make progress without pushing the pawn.',
      accept: { kind: 'exact-san', san: ['Ke3', 'Kf3'] },
      solution: 'Ke3',
      successText:
        'Right. Pushing the pawn immediately lets the black king walk in front of it and the game is drawn. The king must lead and the pawn must follow — this is the single most useful endgame idea there is.',
      retryText:
        'Pushing the pawn here just walks it into a blockade, and retreating the king gives up ground. Advance the king up the board instead.',
      body: [
        'You have an extra pawn, which should be a win — but only with the right technique.',
        'The instinct is to push the pawn. That instinct is wrong: a lone pawn cannot force its way past a king that simply stands in front of it. The **king** has to go first and clear the way.',
        'Both pawn moves and king moves are available here. Choose a king move that goes forward.',
      ],
      hints: [
        'A pawn on its own can never break through a king standing in front of it.',
        'Which way should the king go to help the pawn advance?',
      ],
    },
    {
      kind: 'explain',
      id: 'endgame-square-of-pawn',
      title: 'The square of the pawn',
      fen: '8/8/8/8/5k1P/8/8/K7 b - - 0 1',
      body: [
        'Here is a rule that saves you calculating: to know whether a lone king can catch a running pawn, draw an imaginary square. One side runs from the pawn to its promotion square; that gives you the size.',
        'If the defending king is inside that square — or can step into it on its move — it catches the pawn. If not, the pawn promotes and there is nothing to be done.',
        'The pawn on h4 needs four moves to reach h8. The black king on f4 is within four king-moves of h8, so it steps in and catches it. Move the king toward the pawn and follow it: the king arrives exactly in time.',
      ],
      hints: [
        'Count the pawn\'s moves to promotion, then count the king\'s moves to the same square.',
        'Diagonal king moves cover ground in two directions at once — that is why this works.',
      ],
    },
    {
      kind: 'do',
      id: 'endgame-promote',
      title: 'Promote with the king escorting',
      fen: '8/8/4k3/8/8/4PK2/8/8 w - - 0 1',
      objective: 'Advance the king ahead of the pawn again.',
      accept: { kind: 'exact-san', san: ['Ke4', 'Kf4'] },
      solution: 'Ke4',
      successText:
        'Same idea, one rank further on. Keep the king in front of or beside its pawn and shoulder the enemy king aside; the pawn advances only once the king has secured the squares ahead of it.',
      retryText:
        'The pawn can move, but it should not yet. Send the king forward and let the pawn follow behind it.',
      body: [
        'The same structure, one rank further up the board. Your job is not to rush the pawn but to use the king to take squares away from your opponent.',
        'Advance the king again rather than the pawn.',
      ],
      hints: ['The king leads, the pawn follows. Never the other way round.'],
    },
    {
      kind: 'explain',
      id: 'endgame-rook-activity',
      title: 'Rooks belong behind passed pawns',
      fen: '8/8/8/4k3/8/8/4K3/7R w - - 0 1',
      body: [
        'Two rules cover most rook endgames, and between them they are worth more than any amount of memorised theory.',
        '**Put your rook behind a passed pawn** — yours or your opponent\'s. Behind your own, it pushes from safety and its scope grows as the pawn advances. Behind theirs, it pins the pawn to its own promotion square.',
        '**Cut the enemy king off.** A rook placed on a rank or file the enemy king cannot cross is worth more than a rook grabbing a pawn. Rook endgames are decided by king activity far more often than by material.',
      ],
      hints: ['A rook on an open rank in front of the enemy king is a wall it cannot climb.'],
    },
    {
      kind: 'explain',
      id: 'endgame-philidor-lucena',
      title: 'Two positions worth knowing by name',
      fen: '8/8/8/4k3/8/8/4K3/7R w - - 0 1',
      body: [
        'When you start playing longer games, two rook endings come up constantly and both have known solutions.',
        '**The Lucena position** is the winning technique: your king shelters in front of its own pawn on the seventh rank, and you use your rook to build a "bridge" that blocks the checks and lets the king out. It converts a rook-and-pawn advantage into a win by force.',
        '**The Philidor position** is the drawing technique: with the defending rook on its third rank, you stop the enemy king advancing, and if the pawn comes to the third rank you swing the rook behind to check from the rear forever.',
        'You do not need them yet, and this app does not drill them. But when someone tells you rook endgames are technique rather than talent, these are what they mean — and both are learnable in an afternoon.',
      ],
    },
    {
      kind: 'explain',
      id: 'endgame-what-wins',
      demoBoard: true,
      title: 'What is actually enough to win',
      fen: '4k3/8/8/8/8/8/8/3BK3 w - - 0 1',
      body: [
        'Against a bare king: **queen wins, rook wins, two bishops win, bishop and knight wins** (with difficult technique). A single bishop, a single knight, and even two knights cannot force it — those are drawn.',
        'That makes the humble pawn the most important piece in the endgame. One extra pawn that can promote beats an extra bishop that cannot mate.',
        'This position is the plainest illustration: king and bishop against a bare king is a draw the instant it arrives, and the app declares it immediately. If you are trading down while ahead, always keep a pawn.',
      ],
    },
  ],
}
