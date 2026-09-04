import type { Chapter } from '../types'

export const chapterNotation: Chapter = {
  id: 'notation',
  number: 6,
  title: 'Reading and writing moves',
  outcome: 'Read any chess book, video or game record without help.',
  requires: ['check'],
  lessons: [
    {
      kind: 'explain',
      id: 'notation-basics',
      title: 'Algebraic notation',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      body: [
        'A move is written as the piece letter plus the destination square. **K** king, **Q** queen, **R** rook, **B** bishop, **N** knight (N, because K is taken). Pawns get no letter at all.',
        'So **Nf3** means "a knight moves to f3", and **e4** means "a pawn moves to e4".',
        'Captures add an **x**: Nxe5 is "knight takes on e5". A pawn capture names its starting file: exd5 is "the e-pawn takes on d5".',
        'Finally: **+** is check, **#** is checkmate, **O-O** is kingside castling, **O-O-O** is queenside, and **=Q** on the end of a pawn move means it promoted to a queen.',
      ],
      hints: ['Every move in this app is shown in this notation — you are already reading it.'],
    },
    {
      kind: 'do',
      id: 'notation-play-e4',
      title: 'Play "1. e4"',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      objective: 'Read the notation and play the move: e4.',
      accept: { kind: 'exact-san', san: ['e4'] },
      solution: 'e4',
      successText:
        'No piece letter means a pawn, and e4 is where it went. The most played first move in chess history.',
      retryText: 'e4 means "a pawn to e4". Which pawn can reach e4?',
      body: ['Books write the first move as "1. e4". Play it.'],
    },
    {
      kind: 'do',
      id: 'notation-play-nf3',
      title: 'Play "Nf3"',
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
      objective: 'Play Nf3.',
      accept: { kind: 'exact-san', san: ['Nf3'] },
      solution: 'Nf3',
      successText:
        'N is the knight. Note it also attacks the black pawn on e5 — good notation reading and good chess often coincide.',
      retryText: 'N stands for knight. Move a knight to f3.',
      body: [
        'The game so far: 1. e4 e5. Now play **Nf3**.',
        'Remember that N means knight, not king.',
      ],
      hints: ['Two knights exist, but only one can reach f3.'],
    },
    {
      kind: 'do',
      id: 'notation-disambiguate',
      title: 'When two pieces could go there',
      fen: '4k3/8/8/8/8/8/4K3/R6R w - - 0 1',
      objective: 'Play Rad1 — the a-file rook to d1.',
      accept: { kind: 'exact-san', san: ['Rad1'] },
      solution: 'Rad1',
      successText:
        'The extra letter told you which rook. Without it, "Rd1" would be ambiguous and therefore not a legal way to write the move.',
      retryText:
        'Rad1 means the rook on the a-file goes to d1 — not the one on h1.',
      body: [
        'Both rooks can reach d1. So notation adds the starting file to say which: **Rad1** is the a-file rook, **Rhd1** the h-file one.',
        'If the two pieces share a file instead, the starting rank is used — R1d2, R7d2.',
      ],
      hints: ['a for the a-file rook.'],
    },
    {
      kind: 'puzzle',
      id: 'notation-replay',
      title: 'Replay a famous opening trap',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      objective:
        'Play out the Scholar\'s Mate: 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#',
      line: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
      successText:
        'That is Scholar\'s Mate — four moves, and one of the commonest ways beginners lose. Chapter 10 shows you how to refuse it.',
      retryText: 'Follow the notation exactly. The next move is shown above the board.',
      body: [
        'Now read a whole game. Play each move in turn; the app will make the replies for you.',
        'Watch what the white queen and bishop are doing: both are aiming at **f7**, the weakest square in Black\'s starting position because only the king defends it.',
      ],
      hints: [
        'The moves in order: e4, e5, Bc4, Nc6, Qh5, Nf6, Qxf7#.',
        'Both white pieces converge on f7. Two attackers, one defender.',
      ],
    },
  ],
}
