import type { Chapter } from '../types'

export const chapterDraws: Chapter = {
  id: 'draws',
  number: 5,
  title: 'Draws',
  outcome: 'Know all five ways a game can end level — and how to avoid them when winning.',
  requires: ['check'],
  lessons: [
    {
      kind: 'explain',
      id: 'draw-overview',
      demoBoard: true,
      title: 'Five ways a game ends level',
      fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1',
      body: [
        'Not every game has a winner. There are exactly five ways to draw: stalemate, insufficient material, the fifty-move rule, threefold repetition, and simple agreement between the players.',
        'You have already met stalemate — no legal move, but not in check. This position shows the next one: **insufficient material**. Two bare kings cannot possibly checkmate each other, so the game is over the moment it arrives.',
        'Knowing these matters in both directions. When you are losing, a draw is half a point rescued; when you are winning, walking into one is a whole point thrown away.',
      ],
    },
    {
      kind: 'explain',
      id: 'draw-insufficient',
      demoBoard: true,
      title: 'Insufficient material',
      fen: '4k3/8/8/8/8/8/8/3BK3 w - - 0 1',
      body: [
        'King and a single bishop against a bare king is a draw. So is king and a single knight. Neither side can force checkmate no matter how long they try, so the game is declared drawn immediately.',
        'King and **two** knights cannot force it either, though that one is not automatic. King and rook, king and queen, or king and two bishops all can — those you must learn to win, and Chapter 9 covers them.',
        'The practical lesson: a lone extra bishop or knight is worth nothing at all in an endgame against a bare king. You need a pawn, or a rook, or better.',
      ],
      hints: [
        'Try to find a checkmate here with the bishop. There is not one, and there never will be.',
      ],
    },
    {
      kind: 'explain',
      id: 'draw-fifty-move',
      title: 'The fifty-move rule',
      fen: '4k3/8/8/8/8/8/3R4/4K3 w - - 0 1',
      body: [
        'If fifty moves pass for each side with no capture and no pawn move, either player may claim a draw. Nothing is progressing, so the game stops.',
        'The counter resets on every capture and every pawn move. In practice this rule only bites in endgames where one side is trying to convert a small advantage and cannot make anything happen.',
        'It is also your safety net: if you are defending a bad position with no pawns left, steering toward fifty quiet moves is a real strategy.',
      ],
    },
    {
      kind: 'explain',
      id: 'draw-repetition',
      title: 'Threefold repetition',
      fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
      body: [
        'If exactly the same position occurs three times, with the same player to move and the same options available, either player may claim a draw.',
        'The classic case is **perpetual check**: a losing side finds a way to check the enemy king forever, the king shuffles back and forth, and the position repeats. Half a point from a hopeless game.',
        'It does not have to be three times in a row — just three times in the game. And it is the *position* that must repeat, not the moves.',
      ],
      hints: [
        'Being a piece down with a perpetual check available is a much better place to be than it sounds.',
      ],
    },
    {
      kind: 'do',
      id: 'draw-take-the-draw',
      title: 'Find the saving check',
      fen: '6k1/6p1/8/8/8/7q/6P1/R4BKR b - - 0 1',
      objective: 'Black is well behind on material. Find a safe check.',
      accept: { kind: 'gives-check' },
      solution: 'Qe3+',
      successText:
        'Exactly the right instinct. When you are losing, look for checks first: a king that must keep answering checks never gets time to convert its advantage, and a repeating sequence of them is a draw.',
      retryText:
        'Look for a move that attacks the white king directly — being down material, a quiet move just loses slowly.',
      body: [
        'Black has a queen and a pawn against two rooks, a bishop and a pawn — about four points behind, and a quiet move just loses slowly.',
        'But the white king on g1 is short of shelter. Find a check that your opponent cannot simply capture. Then imagine White answering it and you checking again, and again — that is how a lost game becomes a draw by repetition.',
      ],
      hints: [
        'The f2 square in front of the white king is empty. What can reach the g1 king through it?',
        'Check along the third rank first, then look at the diagonal from there.',
      ],
    },
  ],
}
