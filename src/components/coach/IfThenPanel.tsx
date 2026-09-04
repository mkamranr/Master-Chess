import { useEffect, useMemo, useState } from 'react'
import type { MoveExplanation } from '@/analysis/explain'
import { explainMove } from '@/analysis/explain'
import type { ConsequenceChain } from '@/analysis/consequences'
import {
  buildEngineChain,
  buildStaticChain,
  chainOutcomeLabel,
  extendStaticChain,
} from '@/analysis/consequences'
import { Position } from '@/chess/game'
import { pieceName } from '@/chess/values'
import type { Motif } from '@/analysis/motifs'
import { Badge, Button, Hint, Prose, SquareChip } from '@/components/ui/primitives'
import type { ChessEngine } from '@/engine/stockfish'
import { VERDICT_STYLE } from './verdictStyle'

/* ---------------------------------------------------------------------------
 * "What happens if I do this" — the Consequence Explorer.
 *
 * The signature feature. It answers the learner's actual question rather than
 * the rulebook's: not "is this legal" but "if I play this, what does my
 * opponent do to me, and where do I end up?"
 *
 * The static chain renders instantly with no engine. If Stockfish is already
 * loaded, the panel quietly upgrades to the real principal variation. Nothing
 * here is ever gated behind the 7MB download.
 * ------------------------------------------------------------------------ */

export function IfThenPanel({
  position,
  preview,
  engine,
  engineReady,
  onArrowsChange,
}: {
  position: Position
  preview: MoveExplanation | null
  engine?: ChessEngine | null
  engineReady?: boolean
  onArrowsChange?: (arrows: Array<{ from: string; to: string }>) => void
}) {
  const [chain, setChain] = useState<ConsequenceChain | null>(null)
  const [engineChain, setEngineChain] = useState<ConsequenceChain | null>(null)

  // Motifs are computed here, for this one move only — running them for every
  // legal move in the Moves panel would cost far more than it is worth.
  const detailed = useMemo(
    () => (preview ? explainMove(position, preview.move, { includeMotifs: true }) : null),
    [position, preview],
  )

  useEffect(() => {
    if (!preview) {
      setChain(null)
      setEngineChain(null)
      return
    }
    setEngineChain(null)
    setChain(buildStaticChain(position, preview.move, 2))
  }, [position, preview])

  // Upgrade to the engine's line when one is available. Guarded by a stale
  // check so a slow search cannot overwrite a newer selection.
  useEffect(() => {
    if (!preview || !engine || !engineReady) return
    let cancelled = false
    void buildEngineChain(engine, position, preview.move, 4)
      .then((result) => {
        if (!cancelled) setEngineChain(result)
      })
      .catch(() => {
        /* Static chain is already on screen; an engine failure changes nothing. */
      })
    return () => {
      cancelled = true
    }
  }, [position, preview, engine, engineReady])

  const shown = engineChain ?? chain

  useEffect(() => {
    if (!shown) {
      onArrowsChange?.([])
      return
    }
    onArrowsChange?.(shown.steps.map((s) => ({ from: s.from, to: s.to })))
  }, [shown, onArrowsChange])

  if (!preview || !shown || !detailed) {
    return (
      <Prose>
        <p style={{ color: 'var(--color-muted-foreground)' }}>
          Choose a move from the Moves list, or select a piece and hover a highlighted square, and
          this panel will spell out exactly what follows.
        </p>
        <Hint>
          <span>
            This is the part worth leaning on. Most beginner games are decided not by clever plans
            but by moves whose consequences nobody checked.
          </span>
        </Hint>
      </Prose>
    )
  }

  const style = VERDICT_STYLE[detailed.staticVerdict]

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700 }}>
          {detailed.san}
        </code>
        <Badge tone={style.tone} icon={<span aria-hidden>{style.glyph}</span>}>
          {style.label}
        </Badge>
        <Badge tone={shown.netMaterial < 0 ? 'bad' : shown.netMaterial > 0 ? 'good' : 'neutral'}>
          {chainOutcomeLabel(shown)}
        </Badge>
        <Badge tone={shown.source === 'engine' ? 'accent' : 'neutral'}>
          {shown.source === 'engine' ? 'engine line' : 'expected reply'}
        </Badge>
      </header>

      {/* The chain itself. */}
      <div>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>If you play this…</h3>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {shown.steps.map((step) => (
            <li
              key={step.ply}
              style={{
                display: 'flex',
                gap: 'var(--spacing-sm)',
                alignItems: 'baseline',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                background: step.side === 'you' ? 'var(--color-muted)' : 'transparent',
                border: `1px solid ${step.side === 'you' ? 'var(--color-border-strong)' : 'var(--color-border)'}`,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                  minWidth: 62,
                  color:
                    step.side === 'you' ? 'var(--color-accent)' : 'var(--color-muted-foreground)',
                }}
              >
                {step.side === 'you' ? 'you' : 'opponent'}
              </span>
              <span style={{ fontSize: 13.6, lineHeight: 1.5 }}>
                <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{step.san}</code>
                {' — '}
                {step.rowLabel}
              </span>
            </li>
          ))}
        </ol>

        <p style={{ marginTop: 'var(--spacing-md)', fontSize: 14, lineHeight: 1.6 }}>
          {shown.narrative}
        </p>

        {shown.canExtend && shown.source === 'static' ? (
          <div style={{ marginTop: 'var(--spacing-sm)' }}>
            <Button onClick={() => setChain((c) => (c ? extendStaticChain(c) : c))}>
              And then?
            </Button>
          </div>
        ) : null}
      </div>

      {/* The rule that permits it. */}
      <div>
        <h3 style={{ fontSize: 14, marginBottom: 6 }}>The rule behind it</h3>
        <p style={{ fontSize: 13.5, margin: 0, lineHeight: 1.55 }}>{detailed.rule}</p>
      </div>

      <SafetyBreakdown explanation={detailed} />

      {detailed.motifs.length > 0 ? <Motifs motifs={detailed.motifs} /> : null}
    </div>
  )
}

/* ------------------------------------------------------------------------ */

function SafetyBreakdown({ explanation }: { explanation: MoveExplanation }) {
  const { destination, createsThreats, leavesHanging, abandons } = explanation
  const nothingToSay =
    destination.attackedBy.length === 0 &&
    createsThreats.length === 0 &&
    leavesHanging.length === 0 &&
    abandons.length === 0

  if (nothingToSay) {
    return (
      <Hint tone="good">
        <span>
          Nothing is attacked, nothing is left loose, and nothing stops being defended. A calm,
          safe move.
        </span>
      </Hint>
    )
  }

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 8 }}>What changes</h3>
      <div style={{ display: 'grid', gap: 8, fontSize: 13.4 }}>
        {destination.attackedBy.length > 0 ? (
          <Line
            tone={destination.safe ? 'warn' : 'bad'}
            label={destination.safe ? 'Attacked but defended' : 'Lands on an attacked square'}
          >
            {explanation.to} is attacked from{' '}
            {destination.attackedBy.map((s) => (
              <SquareChip key={s} square={s} />
            ))}
            {destination.defendedBy.length > 0 ? (
              <>
                {' '}
                and defended by{' '}
                {destination.defendedBy.map((s) => (
                  <SquareChip key={s} square={s} />
                ))}
              </>
            ) : (
              <> and nothing of yours defends it</>
            )}
            .
          </Line>
        ) : null}

        {createsThreats.length > 0 ? (
          <Line tone="good" label="You start threatening">
            {createsThreats.map((t) => (
              <span key={t.square} style={{ marginRight: 6 }}>
                the {pieceName(t.piece.type)} on <SquareChip square={t.square} /> (worth{' '}
                {t.lossIfTaken})
              </span>
            ))}
          </Line>
        ) : null}

        {leavesHanging.length > 0 ? (
          <Line tone="bad" label="You leave loose">
            {leavesHanging.map((h) => (
              <span key={h.square} style={{ marginRight: 6 }}>
                your {pieceName(h.piece.type)} on <SquareChip square={h.square} /> (costs{' '}
                {h.lossIfTaken})
              </span>
            ))}
          </Line>
        ) : null}

        {abandons.length > 0 ? (
          <Line tone="warn" label="Stops defending">
            {abandons.map((s) => (
              <SquareChip key={s} square={s} />
            ))}
          </Line>
        ) : null}
      </div>
    </div>
  )
}

function Line({
  tone,
  label,
  children,
}: {
  tone: 'good' | 'bad' | 'warn'
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
      <Badge tone={tone}>{label}</Badge>
      <span style={{ lineHeight: 1.5 }}>{children}</span>
    </div>
  )
}

/**
 * Named patterns. `likely` motifs are hedged in the wording rather than
 * asserted — the coach should never claim a tactic it is only guessing at.
 */
function Motifs({ motifs }: { motifs: Motif[] }) {
  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Patterns worth naming</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {motifs.map((motif, index) => (
          <div
            key={`${motif.kind}-${index}`}
            style={{
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-muted)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <strong style={{ fontSize: 13.5 }}>{motif.name}</strong>
              {motif.confidence === 'likely' ? <Badge tone="neutral">looks like</Badge> : null}
            </div>
            <p style={{ margin: 0, fontSize: 13.2, lineHeight: 1.55 }}>{motif.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
