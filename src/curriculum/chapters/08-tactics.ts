import type { Chapter } from '../types'

export const chapterTactics: Chapter = {
  id: 'tactics',
  number: 8,
  title: 'Tactics',
  outcome: 'Recognise and play the six patterns that win most games.',
  requires: ['vision'],
  lessons: [
    /* --- fork ---------------------------------------------------------- */
    {
      kind: 'explain',
      id: 'tactic-fork-explain',
      title: 'The fork: one piece, two targets',
      fen: 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1',
      arrows: [
        { from: 'c7', to: 'e8', label: 'check' },
        { from: 'c7', to: 'a8' },
      ],
      body: [
        'The knight on c7 attacks the black king **and** the rook on a8 at the same time. Black must answer the check, so the rook cannot be saved.',
        'That is a **fork**: one piece attacking two things at once. Your opponent can only address one of them.',
        'Knights are the great forkers, because their L-shaped attack is the hardest to see coming and because nothing can block it. A fork that includes the king is strongest of all, since answering check is not optional.',
      ],
      hints: ['Look at where the knight attacks: c7 hits a8, e8, e6, d5, b5 and a6.'],
    },
    {
      kind: 'do',
      id: 'tactic-fork-do',
      title: 'Find the knight fork',
      fen: 'r3r3/8/4N3/8/8/8/8/2K4k w - - 0 1',
      objective: 'Fork the two black rooks with your knight.',
      accept: { kind: 'exact-san', san: ['Nc7'] },
      solution: 'Nc7',
      successText:
        'Both rooks are attacked at once. Black saves one, you take the other — a clean rook won out of nothing.',
      retryText:
        'Look for a single knight move that attacks both rooks. The knight is on e6 and the rooks are on a8 and e8.',
      body: [
        'Two black rooks, on a8 and e8. Your knight on e6 can hit both of them in one move.',
        'Find the square that attacks both rooks at once — remember a knight moves two squares one way, then one at a right angle.',
      ],
      hints: [
        'Which square attacks both a8 and e8? It must be a knight\'s-move away from each.',
        'The square you are looking for is c7 — check that it really hits both rooks before you play it.',
      ],
    },

    /* --- pin ----------------------------------------------------------- */
    {
      kind: 'explain',
      id: 'tactic-pin-explain',
      title: 'The pin: a piece that cannot move',
      fen: '4k3/8/8/4n3/8/8/8/4RK2 b - - 0 1',
      arrows: [{ from: 'e1', to: 'e8', label: 'pin' }],
      body: [
        'The black knight on e5 stands between the white rook on e1 and the black king on e8. If the knight moved, the king would be exposed — which is illegal.',
        'So the knight is **pinned**: it has no legal moves at all. Select it and the board offers nothing.',
        'A pinned piece is barely a piece. It cannot run, and it cannot really defend anything off its own line either — so attack it again and it falls.',
      ],
      hints: ['Select the knight on e5. It has zero legal moves.'],
    },
    {
      kind: 'do',
      id: 'tactic-pin-do',
      title: 'Pin the knight',
      fen: '4k3/8/8/4n3/8/8/8/5RK1 w - - 0 1',
      objective: 'Pin the black knight against its king.',
      accept: { kind: 'exact-san', san: ['Re1'] },
      solution: 'Re1',
      successText:
        'The knight is now frozen on e5. Next you would attack it a second time — a pinned piece cannot run away from a second attacker.',
      retryText:
        'You want your rook on the same line as the black knight and the black king. Which line do they share?',
      body: [
        'The black knight on e5 and the black king on e8 share the e-file. Get your rook onto it.',
      ],
      hints: ['The knight and king are both on the e-file. Put the rook there too.'],
    },

    /* --- skewer -------------------------------------------------------- */
    {
      kind: 'explain',
      id: 'tactic-skewer-explain',
      title: 'The skewer: a pin the other way round',
      fen: '8/r7/8/8/k7/8/8/R3K3 b - - 0 1',
      arrows: [{ from: 'a1', to: 'a7', label: 'skewer' }],
      body: [
        'The white rook on a1 checks the black king on a4, and the black rook on a7 is lined up right behind it.',
        'The king **must** move — check is not optional — and when it steps aside, the rook behind it is taken. That is a **skewer**.',
        'A pin has the valuable piece behind; a skewer has it in front. Same geometry, opposite order, and the skewer usually wins material immediately.',
      ],
      hints: ['Look at Black\'s only legal moves: every one of them abandons the rook on a7.'],
    },

    /* --- discovered attack --------------------------------------------- */
    {
      kind: 'do',
      id: 'tactic-discovery-do',
      title: 'Uncover an attack',
      fen: '7r/8/8/8/3N4/8/8/B3K2k w - - 0 1',
      objective: 'Move the knight so that your bishop attacks the black rook.',
      accept: { kind: 'exact-san', san: ['Nf5', 'Nb5', 'Nc6', 'Ne6', 'Nf3', 'Ne2', 'Nc2', 'Nb3'] },
      solution: 'Nf5',
      successText:
        'The knight stepped off the long diagonal and suddenly the bishop on a1 attacks the rook on h8. The piece that moved is not the piece doing the damage — which is exactly why discoveries are so easy to miss.',
      retryText: 'Move the knight off the a1–h8 diagonal so the bishop can see through.',
      body: [
        'Your bishop on a1 sits on the long diagonal that runs all the way to h8, where a black rook stands. But your own knight on d4 is in the way.',
        'Move the knight and the attack appears from nowhere. That is a **discovered attack**.',
      ],
      hints: [
        'The diagonal is a1–b2–c3–d4–e5–f6–g7–h8. Your knight is sitting on d4.',
        'Any knight move at all clears the diagonal.',
      ],
    },

    /* --- double attack ------------------------------------------------- */
    {
      kind: 'do',
      id: 'tactic-double-attack',
      title: 'Attack two things with a queen',
      fen: '4k3/8/8/7n/8/8/1Q6/K7 w - - 0 1',
      objective: 'Attack the black king and the black knight in a single move.',
      accept: { kind: 'exact-san', san: ['Qe5+'] },
      solution: 'Qe5+',
      successText:
        'Check and an attack on the knight at once, from a square Black cannot touch. The king has to move, and then the knight is yours.',
      retryText:
        'Look for a queen move that gives check *and* attacks the knight on h5 — and make sure the square you land on is safe.',
      body: [
        'The black king is on e8 and a knight on h5. Your queen can attack both at the same time.',
        'This is a fork by another name — a **double attack**. Any piece can do it, not just a knight.',
        'One warning that applies to every tactic: check that the square you land on is not defended. A fork that loses the forking piece is not a fork, it is a gift.',
      ],
      hints: [
        'Which single square attacks both e8 and h5?',
        'The e-file reaches the king; the fifth rank reaches the knight. Where do they cross?',
      ],
    },

    /* --- removing the defender ----------------------------------------- */
    {
      kind: 'do',
      id: 'tactic-remove-defender',
      title: 'Remove the defender',
      fen: '4k3/8/2p5/3n4/Q7/8/8/3RK3 w - - 0 1',
      objective: 'Win the knight by taking what defends it.',
      accept: { kind: 'exact-san', san: ['Qxc6+'] },
      solution: 'Qxc6+',
      successText:
        'The pawn on c6 was the knight\'s only defender. Taking it comes with check, so Black has no time to rescue the knight — and Rxd5 wins it next move.',
      retryText:
        'Taking the knight straight away just trades your rook for it. Look at what *defends* the knight, and whether you can take that instead.',
      body: [
        'Your rook on d1 attacks the black knight on d5, but the pawn on c6 defends it — take the knight and the pawn simply takes back.',
        'When a piece has exactly one defender, remove the defender first. Here the capture even comes with check, so Black gets no chance to reorganise.',
      ],
      hints: [
        'Count the defenders of d5. There is exactly one.',
        'Can your queen reach c6? Look along the a4 diagonal.',
      ],
    },

    /* --- practice ------------------------------------------------------ */
    {
      kind: 'drill',
      id: 'tactic-mate-in-one-drill',
      title: 'Drill: mate in one',
      fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
      objective: 'Find checkmate in one. Get 8 right.',
      drill: 'mate-in-one',
      target: 8,
      body: [
        'One move ends each position. Find it.',
        'Ask the three questions every time: can the king move, can anything block, can anything capture? If all three are no, it is mate.',
      ],
    },
    {
      kind: 'drill',
      id: 'tactic-best-capture-drill',
      title: 'Drill: find the best capture',
      fen: '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1',
      objective: 'Take the most valuable thing available — safely. Get 8 right.',
      drill: 'best-capture',
      target: 8,
      body: [
        'Each position has a capture worth making and usually some that are not.',
        'Count before you take: the biggest capture is not always the best one.',
      ],
    },
  ],
}
