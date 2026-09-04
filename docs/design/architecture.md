# Master Chess — design

**Date:** 2026-09-04
**Status:** implemented

## The problem

Someone who knows no chess rules at all wants to become genuinely good, fast.
Existing apps mostly teach by drilling puzzles and letting you play; they rarely
answer the question a beginner actually has, which is not "is this move legal"
but **"if I play this, what happens to me?"**

## Scope

Rules → a solid club-player foundation (roughly 1200–1600): every rule, board
vision, the core tactical motifs, the essential mates and endgames.

An honest boundary worth recording: this is the realistic ceiling for a
self-contained app. Titled play takes years of competitive practice. The goal
here is to compress the part that *can* be compressed — the foundation almost
all beginners are missing — into days rather than months.

## The four teaching mechanisms

These map one-to-one onto what was asked for.

1. **The rule** (`RulePanel`) — context-sensitive. Select a knight, get the
   L-shape rule. Get checked, get the *three and only three* legal responses
   with the concrete squares for this position. Castling available, get all five
   conditions checked off live against the board.
2. **Next possible moves** (`MovesPanel`) — every legal move for the selected
   piece, each with a verdict badge (safe / wins material / loses material /
   check / mate), sorted best-first.
3. **What happens if I do this** (`IfThenPanel`) — the signature feature. Pick a
   candidate move *without committing* and get a plain-English if-then chain:
   your move, the likely reply, where you end up, plus an "And then?" button
   that walks deeper.
4. **Reading the board** (`BoardReadPanel`) — control heatmap, attacker and
   defender lists, live material ledger, hanging-piece list.

## Architecture

Pure logic in framework-free TypeScript; React only renders. This split is what
makes rule correctness testable.

```
src/chess/       game.ts — the ONLY file importing chess.js; values, rule text
src/analysis/    threats · motifs · explain · verdict · consequences
src/engine/      uci (pure parsing) · stockfish (worker wrapper, lazy)
src/curriculum/  types · acceptance · validate · chapters/01..12
src/progress/    localStorage + spaced repetition
src/components/  board · coach · lesson · ui
src/routes/      Learn · Drill · Play · Review · Roadmap
```

### Key decisions

- **`chess.js` owns the rules.** Move generation, castling, en passant,
  threefold, insufficient material and the fifty-move rule are exactly where
  homegrown engines quietly go wrong. One façade (`Position`) wraps it; nothing
  else imports it.
- **`.attackers()` is the linchpin.** Hanging pieces, defenders, pins, skewers
  and forks all derive from it. Note it reports *raw* attacks including pinned
  pieces, so the analysis layer filters pins itself — counting a pinned defender
  would tell a learner a piece is safe when it is free.
- **Two independent verdict scales.** A static, engine-free material verdict
  (available instantly, offline, used by every lesson) and an optional
  centipawn verdict from Stockfish. Nothing is ever gated behind the download.
- **Stockfish is lazy and opt-in.** The *lite single-threaded* build (~7MB) is
  used specifically because it needs no COOP/COEP headers. It loads only when
  the learner asks for a game.
- **Motifs carry a confidence.** `certain` for exact geometry or a verified
  mate; `likely` for judgement calls, which the UI hedges as "looks like". The
  coach must never assert a tactic it is guessing at.

## What the tests protect

- `threats` / `motifs` / `explain` — hand-verified positions, including
  pinned-defender and en-passant edge cases, and near-miss positions asserting
  *non*-detection.
- **`curriculum.test.ts` is the most valuable test here.** It walks all 86
  authored lessons and proves each position is legal, each solution is a legal
  move, and each solution satisfies the lesson's own acceptance rule. It caught
  twelve real content bugs during authoring, including two impossible positions
  where the side not to move was in check — something `validateFen` accepts.
- `Board.test.tsx` — all three input modes complete a move, plus the aria labels.
- `stockfish.test.ts` — UCI handshake and search lifecycle against a scripted
  transport, so CI never downloads the engine.

## Known limits

- The predicted reply in a static chain is a heuristic (material, then
  centrality). It is worded as a prediction, and the engine replaces it with the
  real principal variation when loaded.
- Puzzle lessons follow one recorded line; alternative defences are not modelled.
- Stockfish is GPL-3.0, shipped unmodified under `public/engine/` with its
  licence. Public distribution needs a deliberate licensing decision.
