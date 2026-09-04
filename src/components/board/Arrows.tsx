import type { Square } from '@/chess/game'
import { fileIndex, rankIndex } from '@/chess/values'
import type { Orientation } from './boardModel'

export interface BoardArrow {
  from: Square
  to: Square
  color?: string
  /** A short label drawn at the arrow head, e.g. a move number. */
  label?: string
  dashed?: boolean
}

/** Centre of a square in a 0–8 coordinate space, honouring orientation. */
function centre(square: Square, orientation: Orientation) {
  const f = fileIndex(square)
  const r = rankIndex(square)
  return orientation === 'w'
    ? { x: f + 0.5, y: 7 - r + 0.5 }
    : { x: 7 - f + 0.5, y: r + 0.5 }
}

/**
 * Arrows drawn over the board. This is how the coach points at things —
 * "your opponent replies here" — without moving any pieces.
 *
 * Purely decorative for assistive technology: everything an arrow says is also
 * stated in words in the coach panel, so announcing the SVG would only repeat
 * it less clearly.
 */
export function Arrows({
  arrows,
  orientation,
}: {
  arrows: BoardArrow[]
  orientation: Orientation
}) {
  if (arrows.length === 0) return null

  return (
    <svg
      viewBox="0 0 8 8"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        {arrows.map((arrow, index) => (
          <marker
            key={index}
            id={`arrowhead-${index}`}
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 z" fill={arrow.color ?? 'var(--color-accent)'} />
          </marker>
        ))}
      </defs>
      {arrows.map((arrow, index) => {
        const a = centre(arrow.from, orientation)
        const b = centre(arrow.to, orientation)
        // Stop short of the centre so the head sits on the square, not over
        // the piece standing there.
        const dx = b.x - a.x
        const dy = b.y - a.y
        const length = Math.hypot(dx, dy) || 1
        const trim = 0.3
        const end = { x: b.x - (dx / length) * trim, y: b.y - (dy / length) * trim }

        return (
          <g key={index}>
            <line
              x1={a.x}
              y1={a.y}
              x2={end.x}
              y2={end.y}
              stroke={arrow.color ?? 'var(--color-accent)'}
              strokeWidth={0.14}
              strokeLinecap="round"
              strokeDasharray={arrow.dashed ? '0.25 0.2' : undefined}
              markerEnd={`url(#arrowhead-${index})`}
              opacity={0.9}
            />
            {arrow.label ? (
              <text
                x={end.x}
                y={end.y - 0.28}
                textAnchor="middle"
                fontSize={0.32}
                fill={arrow.color ?? 'var(--color-accent)'}
                style={{ fontWeight: 600, paintOrder: 'stroke', stroke: 'var(--color-background)', strokeWidth: 0.1 }}
              >
                {arrow.label}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}
