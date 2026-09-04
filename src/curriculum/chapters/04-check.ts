import type { Chapter } from '../types'

export const chapterCheck: Chapter = {
  id: 'check',
  number: 4,
  title: 'Check, checkmate and stalemate',
  outcome: 'Recognise check instantly and know the only three ways out.',
  requires: ['special'],
  lessons: [
    {
      kind: 'explain',
      id: 'check-what-is-it',
      title: 'Check: your king is attacked',
      fen: '4r2R/8/8/2k5/8/8/R7/4K3 w - - 0 1',
      arrows: [{ from: 'e8', to: 'e1', label: 'check' }],
      body: [
        'The black rook on e8 is attacking the white king on e1 straight down the open e-file. That is **check**.',
        'You cannot ignore check. Your very next move must deal with it, and if you have no move that does, the game is over.',
        'There are exactly three ways to answer a check — and in this position, remarkably, all three are available. The Rule panel lists each one with the concrete squares.',
      ],
    },
    {
      kind: 'do',
      id: 'check-move-king',
      title: 'Answer one: move the king',
      fen: '4r2R/8/8/2k5/8/8/R7/4K3 w - - 0 1',
      objective: 'Get out of check by moving the king.',
      accept: { kind: 'escapes-check', via: 'move-king' },
      solution: 'Kf2',
      successText:
        'The simplest answer: step off the attacked line. Note the king had to leave the e-file entirely — moving to e2 would still be check.',
      retryText: 'This lesson wants a king move specifically. Try again with the king on e1.',
      body: ['Move the king off the e-file so the rook no longer attacks it.'],
      hints: ['Any square not on the e-file will do: d1, f1, d2 or f2.'],
    },
    {
      kind: 'do',
      id: 'check-block',
      title: 'Answer two: block the line',
      fen: '4r2R/8/8/2k5/8/8/R7/4K3 w - - 0 1',
      objective: 'Get out of check by putting a piece in the way.',
      accept: { kind: 'escapes-check', via: 'block' },
      solution: 'Re2',
      successText:
        'Your rook interposed on e2, breaking the line. The king is untouched but no longer attacked.',
      retryText: 'To block, put a piece on a square between the rook on e8 and your king on e1.',
      body: [
        'Instead of moving the king, put something between it and the attacker.',
        'This only works against pieces that travel in lines — rooks, bishops and queens. You can never block a knight, because it jumps.',
      ],
      hints: ['Your rook on a2 can reach the e-file along the second rank.'],
    },
    {
      kind: 'do',
      id: 'check-capture',
      title: 'Answer three: capture the attacker',
      fen: '4r2R/8/8/2k5/8/8/R7/4K3 w - - 0 1',
      objective: 'Get out of check by capturing the checking piece.',
      accept: { kind: 'escapes-check', via: 'capture' },
      solution: 'Rxe8',
      successText:
        'No attacker, no check — and you won a rook doing it. Always check whether the checking piece can simply be taken.',
      retryText: 'The piece giving check is the black rook on e8. Can anything of yours take it?',
      body: ['The cleanest answer of all: remove the piece that is doing the checking.'],
      hints: ['Your rook on h8 shares the eighth rank with the black rook.'],
    },
    {
      kind: 'explain',
      id: 'check-double',
      title: 'Double check: only the king can move',
      fen: '4k3/8/3N4/8/8/8/8/4RK2 b - - 0 1',
      arrows: [
        { from: 'd6', to: 'e8', label: '1' },
        { from: 'e1', to: 'e8', label: '2' },
      ],
      body: [
        'Two pieces are checking the black king at once: the knight on d6 and the rook on e1.',
        'Blocking cannot help — no single move blocks two different lines. Capturing cannot help either — no single move captures two pieces.',
        'So against a double check, **the king must move**. It is the one situation where two of the three answers are ruled out automatically, which is why double check is so dangerous.',
      ],
      hints: ['Select the black king and count its options. They are all king moves.'],
    },
    {
      kind: 'do',
      id: 'check-mate-back-rank',
      title: 'Checkmate: check with no way out',
      fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
      objective: 'Deliver checkmate in one move.',
      accept: { kind: 'delivers-mate' },
      solution: 'Re8#',
      successText:
        'Checkmate. The rook checks along the eighth rank, the king cannot move because its own pawns block f7, g7 and h7, nothing can block, and nothing can take the rook. Game over.',
      retryText:
        'Close — that was not mate. Look for a check where the king has no escape, nothing can block, and nothing can capture.',
      body: [
        '**Checkmate** is simply check with no legal answer: the king cannot move, the line cannot be blocked, and the attacker cannot be captured.',
        'The game ends immediately. The king is never actually captured.',
        'This is the commonest mating pattern in all of chess — the back-rank mate. The pawns that were protecting the king are now the walls of its cage.',
      ],
      hints: [
        'Where can your rook go on the eighth rank?',
        'Ask the three questions: can the king move? can anything block? can anything capture?',
      ],
    },
    {
      kind: 'explain',
      id: 'check-stalemate',
      title: 'Stalemate: no moves, no check, no winner',
      fen: 'k7/8/1Q6/8/8/8/8/7K b - - 0 1',
      body: [
        'Black has no legal move at all. The king on a8 cannot go to a7, b7 or b8 — the queen covers all three. But the king is **not in check**: nothing is attacking a8.',
        'That is **stalemate**, and it is a draw. Half a point each. White, despite being a whole queen up, has thrown the win away.',
        'This is the cruellest rule in chess for beginners, and it catches everyone at least once. When you are winning easily, always leave your opponent a legal move.',
      ],
      hints: [
        'Compare: in checkmate the king is attacked and stuck. In stalemate it is only stuck.',
      ],
    },
    {
      kind: 'do',
      id: 'check-avoid-stalemate',
      title: 'Win it instead of drawing it',
      fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1',
      objective: 'Find checkmate in one — and avoid stalemating instead.',
      accept: { kind: 'delivers-mate' },
      solution: 'Qc8#',
      successText:
        'Checkmate. The queen covers the eighth rank and a7 at once, and the king on a8 is genuinely attacked. Compare that with the near-identical stalemate you just saw.',
      retryText:
        'That move does not mate. Careful — some queen moves here leave Black with no move but no check, which is stalemate and only a draw.',
      body: [
        'Same idea as the last position, but now White has a king nearby and there is a win available.',
        'Find the move that actually delivers checkmate. One very natural queen move — Qc7 — leaves Black with no legal move but no check either, which is stalemate and only a draw. The Moves panel flags that explicitly, so compare the two before you commit.',
      ],
      hints: [
        'Mate needs the king to be *attacked* as well as stuck.',
        'Look for a queen move that gives check along the eighth rank.',
      ],
    },
  ],
}
