import type { Chapter } from '../types'

const EMPTY = '7k/8/8/8/8/8/8/K7 w - - 0 1'
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const chapterBoard: Chapter = {
  id: 'board',
  number: 1,
  title: 'The board',
  outcome: 'Name any square instantly and know how the pieces start.',
  lessons: [
    {
      kind: 'explain',
      id: 'board-grid',
      title: 'Sixty-four squares',
      fen: START,
      body: [
        'A chessboard is eight squares by eight squares — sixty-four in total, alternating light and dark.',
        'The eight columns are called **files** and are lettered a to h from left to right. The eight rows are called **ranks** and are numbered 1 to 8, counting away from White.',
        'White always sits at the 1 end and Black at the 8 end. Every diagram in this app is drawn from White\'s side unless it says otherwise, so rank 1 is at the bottom.',
      ],
      hints: [
        'The letters run along the bottom edge of the board and the numbers up the left edge — look for them now.',
      ],
    },
    {
      kind: 'explain',
      id: 'board-naming',
      title: 'Every square has a name',
      fen: EMPTY,
      demoBoard: true,
      highlights: { e4: 'hint', a1: 'hint', h8: 'hint' },
      body: [
        'A square is named by its file letter followed by its rank number — always in that order. The highlighted square in the middle is **e4**: file e, rank 4.',
        'The bottom-left corner is **a1** and the top-right is **h8**. Those two are worth memorising as anchors; everything else you can count from them.',
        'This naming is not decoration. It is how every chess book, every video and every game record refers to positions, and you cannot read any of them without it.',
      ],
      hints: ['Letter first, then number. "4e" is not a square; "e4" is.'],
    },
    {
      kind: 'explain',
      id: 'board-colours',
      title: 'Light squares and dark squares',
      fen: EMPTY,
      demoBoard: true,
      highlights: { a1: 'hint', h8: 'hint' },
      body: [
        'The corner nearest White\'s left hand, **a1**, is a dark square. So is **h8**, diagonally opposite — both highlighted here.',
        'There is a quick rule for any square: if the file letter and the rank number are both odd or both even, the square is dark. a1 (1st file, rank 1 — both odd) is dark. b1 (2nd file, rank 1 — one even, one odd) is light.',
        'Square colour matters more than it sounds. A bishop can never leave its own colour, so half the board is permanently beyond it. Many endgames are drawn purely because a bishop is on the wrong colour.',
      ],
    },
    {
      kind: 'drill',
      id: 'board-name-drill',
      title: 'Drill: name the square',
      fen: EMPTY,
      demoBoard: true,
      objective: 'Click the square that is called out. Get 10 right.',
      drill: 'name-the-square',
      target: 10,
      body: [
        'Board vision starts here. Until square names are automatic, every calculation costs you extra effort.',
        'A square will be named; click it. Do not count up from a1 — try to see it directly.',
      ],
    },
    {
      kind: 'drill',
      id: 'board-colour-drill',
      title: 'Drill: light or dark?',
      fen: EMPTY,
      demoBoard: true,
      objective: 'Say whether the named square is light or dark. Get 10 right.',
      drill: 'square-colour',
      target: 10,
      body: [
        'Strong players know a square\'s colour without looking. It is how they spot that an opponent\'s bishop can never defend a particular square.',
      ],
    },
    {
      kind: 'explain',
      id: 'board-setup',
      title: 'How the pieces start',
      fen: START,
      body: [
        'Pawns fill the second rank. Behind them, from the corners inwards: rook, knight, bishop, then the queen and king in the middle.',
        'The one people get wrong is the king and queen. The rule is **the queen starts on her own colour** — the white queen on the light square d1, the black queen on the dark square d8. The king takes the square beside her.',
        'Notice that the two kings face each other on the e-file and the two queens on the d-file. The board is set up as a mirror, not a rotation.',
      ],
      hints: ['"Queen on her own colour" settles it every time.'],
    },
  ],
}
