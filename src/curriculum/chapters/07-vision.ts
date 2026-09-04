import type { Chapter } from '../types'

export const chapterVision: Chapter = {
  id: 'vision',
  number: 7,
  title: 'Reading the board',
  outcome: 'See what is attacked, what is defended, and what is simply free.',
  requires: ['pieces'],
  lessons: [
    {
      kind: 'explain',
      id: 'vision-attack-defend',
      title: 'Attackers and defenders',
      fen: '4k3/8/2p5/8/3N4/8/8/4K3 b - - 0 1',
      body: [
        'Every square on the board is either covered by White, covered by Black, covered by both, or covered by nobody. Learning to see this is the single biggest jump a beginner makes.',
        'The white knight on d4 is attacked by the black pawn on c6 — pawns capture diagonally forward, and for Black that means downwards. Nothing of White\'s defends d4.',
        'A piece that is attacked and undefended is **hanging**. It can simply be taken for free. Open the Board Read panel: it lists every hanging piece for both sides at all times.',
      ],
      hints: ['Click the knight on d4 and read the attackers and defenders listed for that square.'],
    },
    {
      kind: 'explain',
      id: 'vision-counting',
      title: 'Counting an exchange',
      fen: '4k3/8/1p6/8/2R5/1P6/8/4K3 b - - 0 1',
      showControl: true,
      body: [
        'Here the black pawn on b6 attacks the white rook on c4, and the white pawn on b3 defends it. So the rook is attacked *and* defended — is it safe?',
        'No. Do the arithmetic: Black takes your rook (you lose 5), you take the pawn back (you win 1). Net, you are four pawns down. Being defended is not the same as being safe.',
        'The rule that follows: what matters is not whether a piece is defended, but whether the **cheapest attacker is worth less than the piece it attacks**. A rook defended by a pawn but attacked by a pawn is still lost material.',
      ],
      hints: ['Attacked by a pawn, worth 5 — the defence does not change the arithmetic.'],
    },
    {
      kind: 'do',
      id: 'vision-take-the-free-piece',
      title: 'Take what is free',
      fen: '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1',
      objective: 'Win material.',
      accept: { kind: 'wins-material', atLeast: 5 },
      solution: 'Rxd5',
      successText:
        'A whole queen for nothing. Before every single move you make, ask the same question: is anything of my opponent\'s simply undefended?',
      retryText:
        'Something of Black\'s is hanging. Check the Board Read panel — it will tell you what.',
      body: [
        'Black has left a piece completely undefended. Find it and take it.',
        'This is not a clever tactic. It is the habit of looking, and it wins more beginner games than anything else in this app.',
      ],
      hints: ['Which black piece is attacked by something of yours and defended by nothing?'],
    },
    {
      kind: 'do',
      id: 'vision-dont-take',
      title: 'Not every capture is good',
      fen: '4k3/8/2p5/3p4/8/8/8/3RK3 w - - 0 1',
      objective: 'Find a move that does not lose material.',
      accept: { kind: 'stays-safe' },
      solution: 'Rd4',
      successText:
        'Right — Rxd5 looks tempting but the c6 pawn just takes your rook back, trading 5 for 1. Declining a bad capture is a skill in itself.',
      retryText:
        'That gives material away. Look at what defends the pawn on d5 before taking it.',
      body: [
        'Your rook can take the pawn on d5. Work out what happens next before you do.',
        'Find any move that does not cost you material.',
      ],
      hints: [
        'What defends d5? Look for black pawns diagonally above it.',
        'Rook (5) for a pawn (1) is a terrible trade.',
      ],
    },
    {
      kind: 'explain',
      id: 'vision-centre',
      title: 'What "control the centre" means',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      showControl: true,
      highlights: { d4: 'hint', e4: 'hint', d5: 'hint', e5: 'hint' },
      body: [
        'People repeat "control the centre" without saying what it means. It means this: the four squares d4, e4, d5 and e5, and how many of your pieces cover them.',
        'A piece in the centre reaches more squares than the same piece at the edge — a knight on d4 has eight moves, a knight on a1 has two. Controlling central squares also denies them to your opponent.',
        'Turn on the heatmap and watch it change as the game develops. This is what an opening is actually fighting over.',
      ],
      hints: ['Knight on the rim, your future is grim — a real thing, and this is why.'],
    },
    {
      kind: 'drill',
      id: 'vision-who-attacks',
      title: 'Drill: who attacks this square?',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
      objective: 'Count the attackers of the highlighted square. Get 8 right.',
      drill: 'who-attacks',
      target: 8,
      body: [
        'A square will be highlighted. Say how many pieces of the named colour attack it.',
        'This is the calculation that underlies every exchange you will ever make.',
      ],
    },
    {
      kind: 'drill',
      id: 'vision-hanging-drill',
      title: 'Drill: spot the hanging piece',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
      objective: 'Click the piece that can be taken for free. Get 8 right.',
      drill: 'hanging-piece',
      target: 8,
      body: [
        'One piece in each position is loose. Find it.',
        'Do this until it is reflexive and you will stop losing pieces for nothing — which is how most beginner games are actually decided.',
      ],
    },
  ],
}
