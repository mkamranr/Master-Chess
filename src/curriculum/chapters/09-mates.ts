import type { Chapter } from '../types'

export const chapterMates: Chapter = {
  id: 'mates',
  number: 9,
  title: 'Mating patterns',
  outcome: 'Finish won games: deliver the four mates every player must know.',
  requires: ['check'],
  lessons: [
    {
      kind: 'explain',
      id: 'mate-why-patterns',
      title: 'Why patterns, not calculation',
      fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
      body: [
        'Strong players do not calculate most checkmates. They recognise them. There are perhaps a dozen shapes that account for the overwhelming majority of finishes, and once you know them you see them instantly.',
        'Every mate is built from the same two ingredients: the king is attacked, and every square it could run to is covered — often by its own pieces.',
        'This chapter drills the four you cannot do without: the back rank, the two-rook ladder, king and queen against a bare king, and king and rook against a bare king. The last two you will need in real games more often than you expect.',
      ],
    },
    {
      kind: 'do',
      id: 'mate-back-rank',
      title: 'Back-rank mate',
      fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
      objective: 'Mate on the back rank.',
      accept: { kind: 'delivers-mate' },
      solution: 'Re8#',
      successText:
        'The commonest mate in chess. The pawns that were sheltering the king have become the bars of its cage.',
      retryText: 'Get a rook onto the eighth rank, where the king cannot escape forward.',
      body: [
        'The black king sits behind its own unmoved pawns on f7, g7 and h7. It has no way forward.',
        'That means any check along the eighth rank is mate — provided nothing can block or capture.',
        'The defensive lesson is just as important: this is why players spend a move on h3 or g3 to give their king an escape square. It is not a wasted move.',
      ],
      hints: ['The eighth rank is completely empty apart from the king.'],
    },
    {
      kind: 'do',
      id: 'mate-ladder',
      title: 'The two-rook ladder',
      fen: '6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1',
      objective: 'Mate with the two rooks.',
      accept: { kind: 'delivers-mate' },
      solution: 'Rb8#',
      successText:
        'One rook takes the rank the king is on, the other takes the rank in front of it. Two rooks alone can force this against any lone king, from anywhere on the board.',
      retryText:
        'One rook already covers the seventh rank. Where must the other go to attack the king with no escape?',
      body: [
        'The rook on a7 covers the whole seventh rank, so the black king cannot come forward. It is stuck on the eighth.',
        'Bring the other rook to the eighth rank and it is over.',
        'This is the **ladder mate**, and it is a technique rather than a trick: with two rooks you alternate — check on one rank, the king retreats, check on the next — walking it to the edge. It works every time.',
      ],
      hints: ['The seventh rank is already sealed off. Attack along the eighth.'],
    },
    {
      kind: 'do',
      id: 'mate-queen',
      title: 'King and queen against a bare king',
      fen: 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1',
      objective: 'Mate with king and queen.',
      accept: { kind: 'delivers-mate' },
      solution: 'Qh8#',
      successText:
        'Note what did the work: the **king** covered a7 and b7, and the queen only had to deliver the check. A queen alone can never mate — she always needs the king.',
      retryText:
        'The white king already covers a7 and b7. You only need to attack a8 and cover b8, and the eighth rank does both.',
      body: [
        'This is the endgame you will reach most often after promoting a pawn, and beginners routinely draw it by stalemate. Learn it properly once.',
        'The white king on b6 already takes away a7 and b7. All that remains is to attack the king while covering b8.',
        'Beware: several natural-looking queen moves here give **stalemate** instead. The Moves panel labels them, so check before you play.',
      ],
      hints: [
        'The queen can reach the eighth rank in one move.',
        'Which file is completely clear all the way to rank 8?',
      ],
    },
    {
      kind: 'do',
      id: 'mate-rook',
      title: 'King and rook against a bare king',
      fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1',
      objective: 'Mate with king and rook.',
      accept: { kind: 'delivers-mate' },
      solution: 'Rh8#',
      successText:
        'Same picture as the queen mate: the king does the containing, the rook delivers the blow. King and rook against a bare king is always a win, and it is worth practising until it is automatic.',
      retryText: 'The kings are already face to face across the a-file. Attack along the eighth rank.',
      body: [
        'Harder than the queen version in general — but from this position it is the same idea.',
        'The two kings stand in a standoff, with the white king taking away every square the black king wants. The rook only has to arrive.',
      ],
      hints: ['Send the rook to the eighth rank.'],
    },
    {
      kind: 'do',
      id: 'mate-smothered',
      title: 'Smothered mate',
      fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
      objective: 'Mate with the knight.',
      accept: { kind: 'delivers-mate' },
      solution: 'Nf7#',
      successText:
        'Smothered mate: the king is suffocated entirely by its own pieces, and the knight — the one piece that cannot be blocked — delivers the check. Beautiful, and it happens more often than you would think.',
      retryText:
        'Look for a knight move that checks the king on h8. Then confirm every escape square is blocked by a black piece.',
      body: [
        'The black king on h8 is hemmed in by its own rook on g8 and pawns on g7 and h7. Every escape square is occupied by a friend.',
        'A knight check cannot be blocked, and here it cannot be captured either. Find it.',
      ],
      hints: [
        'Which squares does a knight attack h8 from? f7 and g6.',
        'Check whether Black can capture on the square you choose.',
      ],
    },
    {
      kind: 'explain',
      id: 'mate-two-questions',
      title: 'The habit that finds mates',
      fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
      body: [
        'When you think a move might be mate, ask three questions in order, every time: **Can the king move? Can anything block? Can anything capture the checking piece?**',
        'If all three answers are no, it is checkmate. If any answer is yes, it is not — no matter how crushing it looks.',
        'This is not a beginner\'s crutch. It is exactly what strong players do, only faster. The Moves panel in this app runs the same check for you and marks genuine mates with a **#**, so you can confirm your own answer against it while the habit forms.',
      ],
    },
  ],
}
