# Master Chess

A chessboard that explains itself — built for someone who does not know a single
chess rule yet, and wants to become genuinely good quickly.

The distinctive part is not the lessons. It is that before you commit any move,
you can ask **"what happens if I do this?"** and get an answer: the rule that
permits it, every legal alternative with a verdict, and an explicit if-then
chain showing your opponent's likely reply and where you end up.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm test           # 154 tests
npm run typecheck
npm run build
```

## What is in it

| Section | What it does |
|---|---|
| **Learn** | 86 lessons across 12 chapters, from "a board has 64 squares" to endgame technique |
| **Drill** | Five endless generated drills: square names, square colours, attacker counting, loose pieces, mate in one |
| **Play** | A full game against Stockfish at a strength you choose, with a coach that can warn you *before* a blunder |
| **Review** | Every move of your last game graded, with the better move and the reason |
| **Roadmap** | Where you are on the path, chapter by chapter |

### The curriculum

1. The board · 2. The pieces · 3. Special moves · 4. Check, checkmate and
stalemate · 5. Draws · 6. Reading and writing moves · 7. Reading the board ·
8. Tactics · 9. Mating patterns · 10. Opening principles · 11. Endgames ·
12. Playing a real game

## Three ways to move a piece

Drag it, click it then click the destination, or use the keyboard (arrow keys
move a cursor, Enter picks up and puts down, Escape cancels). All three are
first-class — WCAG 2.2 requires a single-pointer alternative to any drag, and a
learner who cannot drag must still be able to play every move.

## Accessibility

Every square is labelled for screen readers with its name, colour, contents and
— when a piece is selected — what moving there would do. Verdicts pair colour
with a glyph and a word, so nothing depends on hue alone. All rendered text
passes WCAG AA contrast (worst case 5.04:1). Squares are 44px at a 375px
viewport. `prefers-reduced-motion` is honoured.

No browser `alert`/`confirm` is used anywhere: the blunder warning and the
promotion chooser are in-page, which keeps the page responsive and lets them
explain themselves.

## Privacy and offline use

Progress lives in `localStorage` and nothing is sent anywhere. Stockfish runs
in a Web Worker in your own browser. The engine is a ~7MB one-off download and
is **not** fetched until you ask for a game — every lesson, drill and
explanation works without it.

## Licences

- Move legality: [chess.js](https://github.com/jhlywa/chess.js) — BSD-2-Clause.
- Analysis: [Stockfish 18](https://github.com/nmrugg/stockfish.js) — **GPL-3.0**,
  shipped unmodified in `public/engine/` with its licence text. If you intend to
  distribute this publicly, the GPL obligations need a deliberate decision.
- Piece graphics are drawn in this repo (`src/components/board/PieceSVG.tsx`) to
  avoid the GPL/CC-BY-SA terms attached to the common free piece sets.

The palette, type scale and the measured accessibility decisions are documented
in [`docs/design/design-system.md`](docs/design/design-system.md); the
architecture and the reasoning behind it are in
[`docs/design/architecture.md`](docs/design/architecture.md).
