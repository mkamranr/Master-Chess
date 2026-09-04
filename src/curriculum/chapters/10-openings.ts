import type { Chapter } from '../types'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
const AFTER_QH5 = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3'
const ITALIAN = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'

export const chapterOpenings: Chapter = {
  id: 'openings',
  number: 10,
  title: 'Opening principles',
  outcome: 'Reach a healthy middlegame every time, and punish common traps.',
  requires: ['vision'],
  lessons: [
    {
      kind: 'explain',
      id: 'opening-principles',
      title: 'Five principles beat memorising lines',
      fen: START,
      showControl: true,
      highlights: { d4: 'hint', e4: 'hint', d5: 'hint', e5: 'hint' },
      body: [
        'You do not need opening theory to reach a good position. You need five principles: **take the centre**, **develop your pieces**, **castle early**, **do not move the same piece twice**, and **keep the queen home for now**.',
        'Every one of them is really the same idea in different clothes — get more of your pieces doing useful work, faster than your opponent does.',
        'Memorised lines fail the moment your opponent plays something you have not seen. Principles never do.',
      ],
    },
    {
      kind: 'do',
      id: 'opening-centre',
      title: 'Principle one: take the centre',
      fen: START,
      objective: 'Play a pawn to the centre.',
      accept: { kind: 'destination', squares: ['e4', 'd4'] },
      solution: 'e4',
      successText:
        'A central pawn does two jobs at once: it claims space, and it opens lines for your bishop and queen to come out. Turn on the heatmap and watch how much of the board you now cover.',
      retryText: 'Push a pawn to e4 or d4 — the two squares that fight for the centre directly.',
      body: [
        'The four central squares are d4, e4, d5 and e5. Whoever controls them controls where the pieces can go.',
        'Start with a pawn move that occupies one of them.',
      ],
      hints: ['e4 and d4 are the two moves that do this best.'],
    },
    {
      kind: 'do',
      id: 'opening-develop',
      title: 'Principle two: develop a piece',
      fen: AFTER_E4_E5,
      objective: 'Develop a knight toward the centre.',
      accept: { kind: 'exact-san', san: ['Nf3', 'Nc3'] },
      solution: 'Nf3',
      successText:
        'Nf3 develops toward the centre, prepares castling, and attacks the e5 pawn — three things in one move. That is what a good developing move looks like.',
      retryText:
        'Bring a knight out toward the middle. Nf3 or Nc3 — not Nh3 or Na3, which point at the edge.',
      body: [
        'A piece on its starting square does nothing. Get the knights and bishops out before you start attacking.',
        'Develop a knight — and prefer the square that points at the centre.',
      ],
      hints: [
        'Knight on the rim, your future is grim: prefer f3 and c3 over h3 and a3.',
        'Nf3 also happens to attack the black pawn on e5.',
      ],
    },
    {
      kind: 'do',
      id: 'opening-castle',
      title: 'Principle three: castle early',
      fen: ITALIAN,
      objective: 'Castle kingside.',
      accept: { kind: 'castles', side: 'kingside' },
      solution: 'O-O',
      successText:
        'King safe, rook activated. Aim to have castled within the first ten moves or so — most beginner disasters happen to kings still sitting on e1.',
      retryText: 'You have everything ready for castling. Move the king two squares to g1.',
      body: [
        'This is the Italian Game, reached by simply following the principles: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5.',
        'Both knights and a bishop are out, the centre is contested, and the path is clear. Time to tuck the king away.',
      ],
      hints: ['Select the king on e1 — g1 will be offered.'],
    },
    {
      kind: 'do',
      id: 'opening-refute-scholars',
      title: 'Refusing Scholar\'s Mate',
      fen: AFTER_QH5,
      objective: 'Defend f7 and gain time by attacking the queen.',
      accept: { kind: 'exact-san', san: ['g6'] },
      solution: 'g6',
      successText:
        'g6 defends f7 and kicks the queen at the same time. She must move again, and every move she spends running is a move you spend developing — which is exactly why bringing the queen out early is a mistake.',
      retryText:
        'f7 is attacked twice — by the queen on h5 and the bishop on c4 — and defended only by the king. Find a move that defends it and attacks the queen.',
      body: [
        'White has played 3. Qh5, threatening Qxf7 mate. Two pieces are aimed at f7 and only the king defends it. This is Scholar\'s Mate, and it ends more beginner games than any other pattern.',
        'Do not panic and do not play Nf6 — the queen would simply take on f7 with mate. Find the move that defends f7 **and** makes the queen retreat.',
        'This position is the best argument for the fifth principle there is: White\'s queen is out early, and Black is about to gain several free developing moves chasing her.',
      ],
      hints: [
        'Which black pawn can move to a square that guards f7?',
        'Look at the g-pawn. Where can it go that also touches the h5 queen?',
      ],
    },
    {
      kind: 'explain',
      id: 'opening-queen-early',
      title: 'Why the early queen fails',
      fen: AFTER_QH5,
      arrows: [
        { from: 'h5', to: 'f7', label: 'threat' },
        { from: 'c4', to: 'f7' },
      ],
      body: [
        'White\'s position looks aggressive and is actually worse. The queen is the most valuable piece, so anything at all can chase her — and she has to run, because trading her for a knight is a catastrophe.',
        'Every time she runs, White loses a move and Black gains one. After a few of those, Black has three pieces out and White has a queen on the run and nothing else developed.',
        'The general rule: **bring out your minor pieces first, castle, and let the queen come out when there is something for her to do.** Attacking before you have developed is how you lose to anyone who simply defends calmly.',
      ],
    },
    {
      kind: 'explain',
      id: 'opening-common-mistakes',
      title: 'The five commonest beginner openings mistakes',
      fen: START,
      body: [
        '**Moving too many pawns.** Each pawn move that does not fight for the centre or open a line for a piece is a move your opponent spends developing.',
        '**Moving the same piece repeatedly.** Chasing a small gain with one knight while your other pieces sleep loses the opening outright.',
        '**Bringing the queen out to attack early.** Covered above. It hands your opponent free moves.',
        '**Grabbing a pawn with the queen or a rook.** The famous one is taking a pawn on b2 or b7 with the queen and getting trapped. A pawn is worth one; being three moves behind is worth more.',
        '**Delaying castling.** The most expensive of the five. Get the king safe, then attack.',
      ],
    },
  ],
}
