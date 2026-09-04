import { useMemo, useState } from 'react'
import { Position, type GameRecord, type Square } from '@/chess/game'
import { explainMove, explainAllMoves } from '@/analysis/explain'
import { Board } from '@/components/board/Board'
import { VERDICT_STYLE } from '@/components/coach/verdictStyle'
import { Badge, Button, Hint, Panel, Prose, Row } from '@/components/ui/primitives'
import { colorName } from '@/chess/values'

/* ---------------------------------------------------------------------------
 * Post-game review.
 *
 * Every move is graded and, for the bad ones, the better alternative is shown
 * with a reason. This reuses `explainMove` and `explainAllMoves` rather than
 * duplicating the judgement — the review and the live coach must never
 * disagree about whether a move was a mistake.
 * ------------------------------------------------------------------------ */

interface GradedMove {
  ply: number
  san: string
  from: Square
  to: Square
  fenBefore: string
  fenAfter: string
  netMaterial: number
  verdict: keyof typeof VERDICT_STYLE
  summary: string
  /** The best available alternative, when the played move was not it. */
  better: { san: string; summary: string } | null
}

function gradeGame(game: GameRecord): GradedMove[] {
  return game.history.map((entry, index) => {
    const before = Position.fromFen(entry.fenBefore)
    const explanation = explainMove(before, entry.move, { includeMotifs: false })

    // Only look for an alternative when the move actually cost something —
    // ranking every legal move for every ply of a long game is expensive, and
    // pointless when the move was fine.
    let better: GradedMove['better'] = null
    if (explanation.netMaterial < 0) {
      const options = explainAllMoves(before)
      const best = options[0]
      if (best && best.san !== explanation.san && best.netMaterial > explanation.netMaterial) {
        better = { san: best.san, summary: best.summary }
      }
    }

    return {
      ply: index,
      san: entry.move.san,
      from: entry.move.from,
      to: entry.move.to,
      fenBefore: entry.fenBefore,
      fenAfter: entry.fenAfter,
      netMaterial: explanation.netMaterial,
      verdict: explanation.staticVerdict,
      summary: explanation.summary,
      better,
    }
  })
}

export function ReviewRoute({ game }: { game: GameRecord | null }) {
  const graded = useMemo(() => (game ? gradeGame(game) : []), [game])
  const [selectedPly, setSelectedPly] = useState<number | null>(null)

  if (!game || game.history.length === 0) {
    return (
      <Panel title="Review" subtitle="Nothing to review yet">
        <Prose>
          <p>
            Play a game in the <strong>Play</strong> tab and it will appear here afterwards, with
            every move graded and the mistakes explained.
          </p>
          <Hint>
            <span>
              Reviewing is where improvement actually happens. Playing teaches you slowly; looking
              at your own mistakes teaches you fast. Start with your worst move, not the most
              exciting moment.
            </span>
          </Hint>
        </Prose>
      </Panel>
    )
  }

  const worst = graded.reduce<GradedMove | null>(
    (worstSoFar, move) =>
      !worstSoFar || move.netMaterial < worstSoFar.netMaterial ? move : worstSoFar,
    null,
  )
  const selected = selectedPly === null ? null : graded[selectedPly]
  const position = Position.fromFen(selected?.fenAfter ?? game.startFen)

  return (
    <div
      className="learn-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 420px)',
        gap: 'var(--spacing-lg)',
        alignItems: 'start',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--spacing-md)', minWidth: 0 }}>
        <Board
          position={position}
          readOnly
          lastMove={selected ? { from: selected.from, to: selected.to } : null}
        />
        {selected ? (
          <div className="card" style={{ padding: 'var(--spacing-lg)', display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700 }}>
                {selected.san}
              </code>
              <Badge
                tone={VERDICT_STYLE[selected.verdict].tone}
                icon={<span aria-hidden>{VERDICT_STYLE[selected.verdict].glyph}</span>}
              >
                {VERDICT_STYLE[selected.verdict].label}
              </Badge>
            </div>
            <p style={{ margin: 0, fontSize: 13.8, lineHeight: 1.55 }}>{selected.summary}</p>
            {selected.better ? (
              <Hint tone="good">
                <span>
                  <strong>{selected.better.san} was better. </strong>
                  {selected.better.summary}
                </span>
              </Hint>
            ) : null}
          </div>
        ) : (
          <Hint>
            <span>Click any move in the list to see the position and the verdict.</span>
          </Hint>
        )}
      </div>

      <Panel title="Every move, graded" subtitle={`${graded.length} moves`} padded={false}>
        <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
          <Row label="Result">
            {(() => {
              const final = Position.fromFen(game.history.at(-1)!.fenAfter).status()
              if (final.isCheckmate) return `${colorName(final.winner!)} won by checkmate`
              if (final.isDraw) return `Drawn — ${final.reason?.replace('-', ' ')}`
              return 'Unfinished'
            })()}
          </Row>
          {worst && worst.netMaterial < 0 ? (
            <Row label="Worst move">
              <Button onClick={() => setSelectedPly(worst.ply)} variant="ghost">
                {worst.san} ({worst.netMaterial})
              </Button>
            </Row>
          ) : null}
        </div>

        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '0 var(--spacing-lg) var(--spacing-lg)',
            display: 'grid',
            gap: 3,
            maxHeight: 460,
            overflowY: 'auto',
          }}
        >
          {graded.map((move) => {
            const style = VERDICT_STYLE[move.verdict]
            const isActive = selectedPly === move.ply
            return (
              <li key={move.ply}>
                <button
                  type="button"
                  onClick={() => setSelectedPly(move.ply)}
                  aria-pressed={isActive}
                  style={{
                    display: 'flex',
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '7px 10px',
                    minHeight: 40,
                    border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: isActive
                      ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)'
                      : 'var(--color-muted)',
                    color: 'var(--color-foreground)',
                    fontFamily: 'var(--font-body)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--color-muted-foreground)',
                        minWidth: 34,
                      }}
                    >
                      {Math.floor(move.ply / 2) + 1}
                      {move.ply % 2 === 0 ? '.' : '…'}
                    </span>
                    <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
                      {move.san}
                    </code>
                  </span>
                  <Badge tone={style.tone} icon={<span aria-hidden>{style.glyph}</span>}>
                    {style.label}
                  </Badge>
                </button>
              </li>
            )
          })}
        </ul>
      </Panel>
    </div>
  )
}
