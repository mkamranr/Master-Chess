import type { Chapter } from '../types'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const chapterPlaying: Chapter = {
  id: 'playing',
  number: 12,
  title: 'Playing a real game',
  outcome: 'Put it all together with a routine you can use on every move.',
  requires: ['openings', 'endgames', 'tactics'],
  lessons: [
    {
      kind: 'explain',
      id: 'play-checklist',
      title: 'A routine for every move',
      fen: START,
      body: [
        'You now know the rules, the tactics and the basic endgames. What remains is a habit — something to run through before every single move, until it becomes invisible.',
        '**One: what changed?** Look at your opponent\'s last move and ask what it now attacks. Most beginner losses are moves that ignore the previous move entirely.',
        '**Two: is anything of mine loose?** Check your own pieces for anything attacked and undefended. The Board Read panel lists these for you, but learn to see them.',
        '**Three: is anything of theirs loose?** The same question the other way round. Free pieces are the commonest way games are decided.',
        '**Four: what happens if I play my move?** Before you commit, look at their best reply. That is exactly what the If-Then panel is for — and doing it in your head is the skill this whole app exists to build.',
      ],
    },
    {
      kind: 'explain',
      id: 'play-vs-engine',
      title: 'Playing the coach',
      fen: START,
      body: [
        'Switch to the **Play** tab to play a full game against the engine, with the strength set wherever you like. Start low — around 800 — and raise it as you start winning.',
        'The coach has three settings. **Silent** plays a normal game. **Warn on blunder** stops you before a move that drops material and asks whether you are sure, which is the single fastest way to stop making the same mistake. **Explain every move** narrates as you go.',
        'The warning is a question, not a veto. If you think the coach is wrong, play the move anyway — sometimes a "blunder" is a sacrifice, and the app only counts material, not ideas.',
      ],
    },
    {
      kind: 'explain',
      id: 'play-review',
      title: 'Reviewing your own game',
      fen: START,
      body: [
        'When a game ends, the **Review** tab replays it with every move graded: best, good, inaccuracy, mistake, blunder. Click any move to see what you should have played instead and why.',
        'Review is where the improvement actually happens. Playing games teaches you slowly; looking at your own mistakes teaches you fast.',
        'One rule for reviewing: go to your **worst** move first, not the most exciting moment. The blunders are where the points went.',
      ],
    },
    {
      kind: 'explain',
      id: 'play-what-next',
      title: 'Where to go from here',
      fen: START,
      body: [
        'Finishing this course puts you on solid club-player foundations: you know every rule, you can read a board, you recognise the core tactical patterns, and you can finish a won game. That is genuinely most of what wins games below intermediate level.',
        'What takes you further is volume, and it is not complicated: **do tactics puzzles daily** — the Drill tab never runs out — **play longer games** so you have time to actually calculate, and **review every loss**.',
        'The habit from lesson one of this chapter is the whole thing. Before you move, ask what happens if you do. Nearly every game lost below club level is lost by skipping that question.',
      ],
    },
  ],
}
