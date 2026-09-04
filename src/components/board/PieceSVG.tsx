import type { ReactElement } from 'react'
import type { Color, PieceSymbol } from '@/chess/game'
import { PIECE_RULES } from '@/chess/rules'

/* ---------------------------------------------------------------------------
 * The piece set.
 *
 * These are drawn here rather than pulled from a font or an image set for
 * three reasons: the well-known free piece sets carry GPL/CC-BY-SA
 * obligations, Unicode chess glyphs render as colour emoji on some platforms,
 * and inline SVG lets the pieces take their fill and stroke from theme tokens
 * so they stay legible on any board colour.
 *
 * Shapes are geometric and flat on purpose — the design direction is
 * minimalism, and simple silhouettes stay readable down to phone-sized
 * squares, which is where a beginner most needs to tell a bishop from a pawn.
 * ------------------------------------------------------------------------ */

const BASE = <rect x="11.5" y="35.5" width="22" height="3.6" rx="1.4" />

function Pawn() {
  return (
    <>
      <circle cx="22.5" cy="13" r="5.6" />
      <path d="M22.5 17.4c-3.6 0-6.2 2.4-6.2 5.4 0 1.9 1 3.4 2.5 4.3-2.2 1.6-4.6 4.1-5.1 8.4h17.6c-.5-4.3-2.9-6.8-5.1-8.4 1.5-.9 2.5-2.4 2.5-4.3 0-3-2.6-5.4-6.2-5.4z" />
      {BASE}
    </>
  )
}

function Rook() {
  return (
    <>
      <path d="M13.2 18.6V10.5h4.1v4h3.1v-4h4.2v4h3.1v-4h4.1v8.1z" />
      <path d="M12.4 18.6h20.2v4.1H12.4z" />
      <path d="M14.6 22.7h15.8l1.4 12.8H13.2z" />
      {BASE}
      <path d="M16.5 26.5h12M16.2 30.5h12.6" fill="none" strokeWidth="1.1" />
    </>
  )
}

function Knight() {
  return (
    <>
      <path d="M12 17.2c0-3.2 2.9-6.2 7-7.4L21.1 6l2.7 4.3c4.5 1.6 7.5 5.6 8 11.6.5 5.9.9 10.3 1.2 13.6H14.6c0-4.4 1.9-8.2 5-11.2-3-.6-6.4-3-7.6-7.1z" />
      <circle cx="18.4" cy="15.4" r="1.25" style={{ fill: 'currentColor', stroke: 'none' }} />
      <path d="M13.6 16.4c1.6.9 3 1 4.3.5" fill="none" strokeWidth="1.1" />
      <path d="M22.6 11.8c2.6 2.4 4.1 5.6 4.6 9.6" fill="none" strokeWidth="1.1" />
      {BASE}
    </>
  )
}

function Bishop() {
  return (
    <>
      <circle cx="22.5" cy="7.6" r="2.3" />
      <path d="M22.5 10.2c-3.2 3.2-6.4 6.5-6.4 10.6 0 3.6 2.9 6.2 6.4 6.2s6.4-2.6 6.4-6.2c0-4.1-3.2-7.4-6.4-10.6z" />
      <path d="M15.2 35.5c.3-4.2 2.3-6.7 4.4-8.2h5.8c2.1 1.5 4.1 4 4.4 8.2z" />
      {BASE}
      <path d="M19.6 21.4 25.6 15.4" fill="none" strokeWidth="1.3" />
    </>
  )
}

function Queen() {
  return (
    <>
      <circle cx="9.4" cy="12.4" r="2.1" />
      <circle cx="16" cy="9.2" r="2.1" />
      <circle cx="22.5" cy="7.8" r="2.3" />
      <circle cx="29" cy="9.2" r="2.1" />
      <circle cx="35.6" cy="12.4" r="2.1" />
      <path d="M9.9 14.6 13.1 26h18.8l3.2-11.4-5.4 6-2.1-9.1-4 8.6-2.1-9.6-2.1 9.6-4-8.6-2.1 9.1z" />
      <path d="M13.1 26c-1 4.1 0 6.9 1 9.5h16.8c1-2.6 2-5.4 1-9.5z" />
      {BASE}
      <path d="M14.6 30.4h15.8" fill="none" strokeWidth="1.1" />
    </>
  )
}

function King() {
  return (
    <>
      <path d="M20.9 3.6h3.2v3.5h3.5v3.2h-3.5v3.5h-3.2v-3.5h-3.5V7.1h3.5z" />
      <path d="M22.5 14.4c-5.2 0-9 3.1-9.8 7.7l-.7 3.4h21l-.7-3.4c-.8-4.6-4.6-7.7-9.8-7.7z" />
      <path d="M13.4 25.5h18.2l-1.6 10H15z" />
      {BASE}
      <path d="M16.2 29.6h12.6" fill="none" strokeWidth="1.1" />
      <path d="M17.8 21.6c1.3-2.6 2.9-3.9 4.7-3.9s3.4 1.3 4.7 3.9" fill="none" strokeWidth="1.1" />
    </>
  )
}

const SHAPES: Record<PieceSymbol, () => ReactElement> = {
  p: Pawn,
  r: Rook,
  n: Knight,
  b: Bishop,
  q: Queen,
  k: King,
}

export interface PieceSVGProps {
  type: PieceSymbol
  color: Color
  /** Rendered size in pixels. */
  size?: number
  className?: string
  /**
   * Decorative by default: the square's own aria-label already names the piece,
   * so announcing it twice just makes the board noisier to listen to. Set a
   * title only when the piece is shown outside a labelled square.
   */
  title?: string
}

export function PieceSVG({ type, color, size, className, title }: PieceSVGProps) {
  const Shape = SHAPES[type]
  const isWhite = color === 'w'

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{
        display: 'block',
        width: size === undefined ? '100%' : undefined,
        height: size === undefined ? '100%' : undefined,
        fill: isWhite ? 'var(--color-piece-white)' : 'var(--color-piece-black)',
        stroke: isWhite ? 'var(--color-piece-white-edge)' : 'var(--color-piece-black-edge)',
        // `color` feeds currentColor, which the knight's eye uses so it stays
        // visible against both a light and a dark piece body.
        color: isWhite ? 'var(--color-piece-white-edge)' : 'var(--color-piece-black-edge)',
        strokeWidth: 1.5,
        strokeLinejoin: 'round',
        strokeLinecap: 'round',
        pointerEvents: 'none',
      }}
    >
      {title ? <title>{title}</title> : null}
      <g>
        <Shape />
      </g>
    </svg>
  )
}

/** Human-readable name, e.g. "White knight". Used for aria-labels and copy. */
export function describePiece(type: PieceSymbol, color: Color): string {
  return `${color === 'w' ? 'White' : 'Black'} ${PIECE_RULES[type].name.toLowerCase()}`
}
