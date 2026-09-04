import type { Square } from '@/chess/game'
import type { BoardArrow } from './Arrows'

/* ---------------------------------------------------------------------------
 * Turning an if-then chain into board arrows.
 *
 * Extracted as pure functions for a specific reason: this ran as an inline
 * callback passed down to the coach panel, whose identity changed on every
 * render. That re-fired the panel's effect, which set state, which re-rendered
 * — an infinite loop that React reported as "Maximum update depth exceeded"
 * roughly twice a second. The pair below fixes it properly: `toBoardArrows`
 * is deterministic, and `sameArrows` lets the setter bail out when nothing has
 * actually changed, so an unstable callback identity can no longer cause a
 * loop even if one is reintroduced.
 * ------------------------------------------------------------------------ */

export interface ChainStepSquares {
  from: string
  to: string
}

/** The first arrow is solid (your move); later ones are dashed replies. */
export function toBoardArrows(steps: ChainStepSquares[]): BoardArrow[] {
  return steps.map((step, index) => ({
    from: step.from as Square,
    to: step.to as Square,
    label: String(index + 1),
    dashed: index > 0,
  }))
}

/** Structural equality, so an identical redraw does not trigger a state change. */
export function sameArrows(a: BoardArrow[], b: BoardArrow[]): boolean {
  if (a.length !== b.length) return false
  return a.every((arrow, index) => {
    const other = b[index]
    return (
      other !== undefined &&
      arrow.from === other.from &&
      arrow.to === other.to &&
      arrow.label === other.label &&
      arrow.dashed === other.dashed
    )
  })
}

/**
 * A state updater for the arrow list that returns the *existing* array when
 * the new one is equivalent. Returning the same reference is what stops React
 * from re-rendering, and therefore what breaks the loop.
 */
export function nextArrows(current: BoardArrow[], steps: ChainStepSquares[]): BoardArrow[] {
  const candidate = toBoardArrows(steps)
  return sameArrows(current, candidate) ? current : candidate
}
