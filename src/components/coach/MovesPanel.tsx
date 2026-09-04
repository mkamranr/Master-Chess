import { useMemo } from 'react'
import type { Square } from '@/chess/game'
import { Position } from '@/chess/game'
import { explainMovesFrom } from '@/analysis/explain'
import type { MoveExplanation } from '@/analysis/explain'
import { Badge, Hint, Prose } from '@/components/ui/primitives'
import { describePiece } from '@/components/board/PieceSVG'
import { VERDICT_STYLE } from './verdictStyle'

/* ---------------------------------------------------------------------------
 * "Next possible moves" — every legal move for the selected piece, each with
 * a verdict so the learner can see at a glance which ones are safe.
 *
 * Sorted best-first. Motif detection is left off here: this list is about
 * cheap, instant verdicts for up to 27 moves, and the named tactics show up in
 * the If-Then panel for whichever single move the learner picks.
 * ------------------------------------------------------------------------ */

export function MovesPanel({
  position,
  selected,
  onPreview,
  previewSan,
}: {
  position: Position
  selected: Square | null
  onPreview?: (explanation: MoveExplanation) => void
  previewSan?: string | null
}) {
  const explanations = useMemo(
    () => (selected ? explainMovesFrom(position, selected) : []),
    [position, selected],
  )

  if (!selected) {
    return (
      <Prose>
        <p style={{ color: 'var(--color-muted-foreground)' }}>
          Select a piece to list every square it can legally reach, with a verdict on each one.
        </p>
      </Prose>
    )
  }

  const piece = position.pieceAt(selected)

  if (!piece) {
    return (
      <Prose>
        <p style={{ color: 'var(--color-muted-foreground)' }}>
          {selected} is an empty square. Select a piece instead.
        </p>
      </Prose>
    )
  }

  if (explanations.length === 0) {
    return (
      <Prose>
        <p>
          The {describePiece(piece.type, piece.color).toLowerCase()} on {selected} has{' '}
          <strong>no legal moves</strong>.
        </p>
        <Hint tone="warn">
          <span>
            That usually means one of two things: every square it could reach is blocked by your
            own pieces, or moving it would expose your king — which the rules do not allow.
          </span>
        </Hint>
      </Prose>
    )
  }

  return (
    <div>
      <p
        style={{
          margin: '0 0 var(--spacing-md)',
          fontSize: 13.5,
          color: 'var(--color-muted-foreground)',
        }}
      >
        {explanations.length} legal {explanations.length === 1 ? 'move' : 'moves'} for the{' '}
        {describePiece(piece.type, piece.color).toLowerCase()} on {selected}, best first.
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
        {explanations.map((explanation) => {
          const style = VERDICT_STYLE[explanation.staticVerdict]
          const isActive = previewSan === explanation.san
          return (
            <li key={explanation.san}>
              <button
                type="button"
                onClick={() => onPreview?.(explanation)}
                aria-pressed={isActive}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--spacing-sm)',
                  padding: '8px 10px',
                  minHeight: 44,
                  textAlign: 'left',
                  border: `1px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-muted)',
                  color: 'var(--color-foreground)',
                  fontFamily: 'var(--font-body)',
                  transition: 'background var(--dur-hover) var(--ease-out), border-color var(--dur-hover) var(--ease-out)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <code
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      fontWeight: 700,
                      minWidth: 52,
                    }}
                  >
                    {explanation.san}
                  </code>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: 'var(--color-muted-foreground)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {shortNote(explanation)}
                  </span>
                </span>
                <Badge tone={style.tone} icon={<span aria-hidden>{style.glyph}</span>}>
                  {style.label}
                </Badge>
              </button>
            </li>
          )
        })}
      </ul>

      <Hint>
        <span>
          Pick any move above to see the full if-then chain — what your opponent does next, and
          where you end up. Nothing is played until you move the piece on the board.
        </span>
      </Hint>
    </div>
  )
}

/** A very short clause for the list row; the full sentence lives in If-Then. */
function shortNote(explanation: MoveExplanation): string {
  const { flags, captureValue, netMaterial } = explanation
  if (flags.isCheckmate) return 'ends the game'
  if (flags.isStalemate) return 'draws immediately'
  if (flags.isCastle) return `castles ${flags.isCastle}`
  if (flags.isEnPassant) return 'en passant'
  if (flags.isPromotion) return 'promotes'
  if (captureValue > 0 && netMaterial > 0) return `wins ${netMaterial}`
  if (netMaterial < 0) return `costs ${Math.abs(netMaterial)}`
  if (flags.isCheck) return 'gives check'
  if (captureValue > 0) return 'trades evenly'
  return 'quiet move'
}
