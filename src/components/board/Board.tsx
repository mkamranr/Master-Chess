import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Color, PieceSymbol, Square } from '@/chess/game'
import { Position } from '@/chess/game'
import { squareColor } from '@/chess/values'
import type { ControlMap } from '@/analysis/threats'
import type { BoardArrow } from './Arrows'
import { Arrows } from './Arrows'
import { PieceSVG, describePiece } from './PieceSVG'
import {
  type Orientation,
  type OverlayKind,
  OVERLAY_COLOR,
  boardLayout,
  describeSquare,
  edgeSquare,
  stepSquare,
} from './boardModel'

/* ---------------------------------------------------------------------------
 * The board.
 *
 * Three input methods, all first class:
 *   1. drag and drop            (pointer events, so it works with touch)
 *   2. click the piece, click the destination
 *   3. keyboard — arrows move a cursor, Enter picks up and puts down, Escape
 *      cancels, Home/End jump to the edge of a rank
 *
 * The keyboard and click paths are not a fallback bolted on afterwards. WCAG
 * 2.2 requires a single-pointer alternative to any drag operation, and a
 * learner who cannot drag must still be able to play every move in the app.
 * ------------------------------------------------------------------------ */

export interface PromotionRequest {
  from: Square
  to: Square
}

export interface BoardProps {
  position: Position
  orientation?: Orientation
  /** Called with a legal from/to. Return false to reject the move. */
  onMove?: (from: Square, to: Square, promotion?: PieceSymbol) => void
  /** Squares the learner is allowed to move from. Omit to allow the side to move. */
  movableFor?: Color | 'none'
  /** Extra highlights keyed by square, e.g. lesson hints. */
  overlays?: Partial<Record<Square, OverlayKind>>
  arrows?: BoardArrow[]
  /** Show the attacker/defender heatmap. */
  controlMap?: ControlMap | null
  /** Highlighted last move, drawn under everything else. */
  lastMove?: { from: Square; to: Square } | null
  /** Called whenever the selected square changes, so panels can follow along. */
  onSelectSquare?: (square: Square | null) => void
  /** Verdict text per destination square, spoken to screen readers. */
  targetVerdicts?: Partial<Record<Square, string>>
  showCoordinates?: boolean
  /** Disables interaction entirely, for a static illustration. */
  readOnly?: boolean
  maxSize?: number
}

export function Board({
  position,
  orientation = 'w',
  onMove,
  movableFor,
  overlays,
  arrows = [],
  controlMap = null,
  lastMove = null,
  onSelectSquare,
  targetVerdicts,
  showCoordinates = true,
  readOnly = false,
  maxSize = 640,
}: BoardProps) {
  const { files, ranks } = boardLayout(orientation)
  const [selected, setSelected] = useState<Square | null>(null)
  const [cursor, setCursor] = useState<Square>(orientation === 'w' ? 'e1' : 'e8')
  const [dragging, setDragging] = useState<Square | null>(null)
  const [dragOver, setDragOver] = useState<Square | null>(null)
  const [promotion, setPromotion] = useState<PromotionRequest | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const status = position.status()
  const allowedColor = movableFor === 'none' ? null : (movableFor ?? position.turn())

  // Selecting a square is cheap to recompute and always reflects the position
  // currently on screen, so there is no stale-highlight state to manage.
  const legalTargets = useMemo(() => {
    if (!selected) return new Map<Square, boolean>()
    const map = new Map<Square, boolean>()
    for (const move of position.legalMoves(selected)) {
      map.set(move.to, move.isCapture() || move.isEnPassant())
    }
    return map
  }, [position, selected])

  const checkSquare = useMemo(() => {
    if (!status.inCheck) return null
    return position.kingSquare(status.turn)
  }, [position, status])

  const clearSelection = useCallback(() => {
    setSelected(null)
    onSelectSquare?.(null)
  }, [onSelectSquare])

  const select = useCallback(
    (square: Square | null) => {
      setSelected(square)
      onSelectSquare?.(square)
    },
    [onSelectSquare],
  )

  /** Attempts a move, opening the promotion chooser when one is needed. */
  const tryMove = useCallback(
    (from: Square, to: Square) => {
      const candidates = position.legalMoves(from).filter((m) => m.to === to)
      if (candidates.length === 0) return false
      if (candidates.some((m) => m.promotion)) {
        setPromotion({ from, to })
        return true
      }
      onMove?.(from, to)
      clearSelection()
      return true
    },
    [position, onMove, clearSelection],
  )

  const canPickUp = useCallback(
    (square: Square) => {
      if (readOnly || !allowedColor) return false
      const piece = position.pieceAt(square)
      return !!piece && piece.color === allowedColor && position.legalMoves(square).length > 0
    },
    [position, allowedColor, readOnly],
  )

  /** Click-then-click: the pointer path that needs no dragging at all. */
  const handleSquareActivate = useCallback(
    (square: Square) => {
      if (readOnly) return
      if (selected) {
        if (square === selected) {
          clearSelection()
          return
        }
        if (tryMove(selected, square)) return
        // Not a legal target: treat it as picking up a different piece, or as
        // simply inspecting the square.
        select(canPickUp(square) ? square : square)
        return
      }
      select(square)
    },
    [readOnly, selected, tryMove, clearSelection, select, canPickUp],
  )

  /* --- keyboard ------------------------------------------------------- */

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const key = event.key
      const directions: Record<string, 'up' | 'down' | 'left' | 'right'> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
      }

      if (key in directions) {
        event.preventDefault()
        setCursor((current) => stepSquare(current, directions[key]!, orientation))
        return
      }
      if (key === 'Home' || key === 'End') {
        event.preventDefault()
        setCursor((current) => edgeSquare(current, key === 'Home' ? 'first' : 'last', orientation))
        return
      }
      if (key === 'Enter' || key === ' ') {
        event.preventDefault()
        handleSquareActivate(cursor)
        return
      }
      if (key === 'Escape') {
        event.preventDefault()
        if (promotion) setPromotion(null)
        else clearSelection()
      }
    },
    [orientation, cursor, handleSquareActivate, clearSelection, promotion],
  )

  // Keep the DOM focus on the cursor square so screen readers announce it.
  useEffect(() => {
    if (!gridRef.current?.contains(document.activeElement)) return
    const node = gridRef.current.querySelector<HTMLElement>(`[data-square="${cursor}"]`)
    node?.focus()
  }, [cursor])

  /* --- drag and drop -------------------------------------------------- */

  const handlePointerDown = useCallback(
    (square: Square) => (event: React.PointerEvent) => {
      if (!canPickUp(square)) return
      // Ignore secondary buttons (right-click, middle-click) but treat anything
      // else as a primary contact. Testing `button > 0` rather than
      // `button !== 0` keeps this working under event shims that omit the
      // field, without ever picking a piece up on a right-click.
      if (event.button > 0) return
      if (event.isPrimary === false) return
      setDragging(square)
      select(square)
      ;(event.target as HTMLElement).releasePointerCapture?.(event.pointerId)
    },
    [canPickUp, select],
  )

  const squareFromPoint = useCallback((x: number, y: number): Square | null => {
    const element = document.elementFromPoint(x, y)
    const holder = element?.closest<HTMLElement>('[data-square]')
    return (holder?.dataset.square as Square | undefined) ?? null
  }, [])

  useEffect(() => {
    if (!dragging) return

    const onMoveEvent = (event: PointerEvent) => {
      setDragOver(squareFromPoint(event.clientX, event.clientY))
    }
    const onUp = (event: PointerEvent) => {
      const target = squareFromPoint(event.clientX, event.clientY)
      setDragging(null)
      setDragOver(null)
      if (target && target !== dragging) tryMove(dragging, target)
    }
    const onCancel = () => {
      setDragging(null)
      setDragOver(null)
    }

    window.addEventListener('pointermove', onMoveEvent)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointermove', onMoveEvent)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [dragging, squareFromPoint, tryMove])

  /* --- render --------------------------------------------------------- */

  const overlayFor = (square: Square): OverlayKind | null => {
    if (overlays?.[square]) return overlays[square]!
    if (selected === square) return 'selected'
    if (checkSquare === square) return 'check'
    if (legalTargets.has(square)) return legalTargets.get(square) ? 'capture' : 'legal'
    if (lastMove && (lastMove.from === square || lastMove.to === square)) return 'lastmove'
    return null
  }

  const controlTint = (square: Square): string | null => {
    const entry = controlMap?.[square]
    if (!entry || entry.owner === 'neutral') return null
    if (entry.owner === 'white') return 'var(--color-ov-white-control)'
    if (entry.owner === 'black') return 'var(--color-ov-black-control)'
    return 'var(--color-ov-contested)'
  }

  return (
    <div style={{ width: '100%', maxWidth: maxSize, margin: '0 auto' }}>
      <div style={{ position: 'relative' }}>
        <div
          ref={gridRef}
          role="grid"
          aria-label={`Chess board, ${status.turn === 'w' ? 'White' : 'Black'} to move`}
          onKeyDown={handleKeyDown}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            aspectRatio: '1 / 1',
            width: '100%',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--color-border-strong)',
            touchAction: 'none',
          }}
        >
          {ranks.map((rank) => (
            <div key={rank} role="row" style={{ display: 'contents' }}>
              {files.map((file) => {
                const square = `${file}${rank}` as Square
                const piece = position.pieceAt(square)
                const overlay = overlayFor(square)
                const tint = controlTint(square)
                const isLight = squareColor(square) === 'light'
                const isCursor = cursor === square
                const isDragSource = dragging === square
                const isDropTarget = dragOver === square && legalTargets.has(square)

                return (
                  <div
                    key={square}
                    role="gridcell"
                    data-square={square}
                    tabIndex={isCursor ? 0 : -1}
                    aria-selected={selected === square}
                    aria-label={describeSquare({
                      square,
                      pieceLabel: piece ? describePiece(piece.type, piece.color) : null,
                      isLegalTarget: legalTargets.has(square),
                      isCapture: legalTargets.get(square) === true,
                      isSelected: selected === square,
                      verdict: targetVerdicts?.[square] ?? null,
                    })}
                    onClick={() => handleSquareActivate(square)}
                    onPointerDown={handlePointerDown(square)}
                    onFocus={() => setCursor(square)}
                    style={{
                      position: 'relative',
                      background: isLight ? 'var(--color-sq-light)' : 'var(--color-sq-dark)',
                      cursor: readOnly ? 'default' : canPickUp(square) ? 'grab' : 'pointer',
                      transition: 'background var(--dur-overlay) var(--ease-out)',
                      outline: isDropTarget ? '3px solid var(--color-accent)' : undefined,
                      outlineOffset: '-3px',
                    }}
                  >
                    {tint ? (
                      <span
                        aria-hidden="true"
                        style={{ position: 'absolute', inset: 0, background: tint }}
                      />
                    ) : null}

                    {overlay ? <SquareOverlay kind={overlay} hasPiece={!!piece} /> : null}

                    {piece && !isDragSource ? (
                      <span
                        aria-hidden="true"
                        style={{
                          position: 'absolute',
                          inset: '6%',
                          transition: 'opacity var(--dur-piece) var(--ease-out)',
                        }}
                      >
                        <PieceSVG type={piece.type} color={piece.color} />
                      </span>
                    ) : null}

                    {piece && isDragSource ? (
                      <span
                        aria-hidden="true"
                        style={{ position: 'absolute', inset: '6%', opacity: 0.3 }}
                      >
                        <PieceSVG type={piece.type} color={piece.color} />
                      </span>
                    ) : null}

                    {showCoordinates ? (
                      <Coordinate
                        square={square}
                        file={file}
                        rank={rank}
                        files={files}
                        ranks={ranks}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <Arrows arrows={arrows} orientation={orientation} />

        {promotion ? (
          <PromotionChooser
            color={position.turn()}
            onChoose={(type) => {
              onMove?.(promotion.from, promotion.to, type)
              setPromotion(null)
              clearSelection()
            }}
            onCancel={() => setPromotion(null)}
          />
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {status.inCheck && !status.isCheckmate
          ? `${status.turn === 'w' ? 'White' : 'Black'} is in check.`
          : ''}
        {status.isCheckmate ? 'Checkmate.' : ''}
        {status.isStalemate ? 'Stalemate. The game is drawn.' : ''}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------------ */

/**
 * Overlays never rely on colour alone: a legal empty square gets a dot, a
 * legal capture gets a ring around the piece, and check gets a filled glow.
 * The shape carries the meaning for anyone who cannot separate the hues.
 */
function SquareOverlay({ kind, hasPiece }: { kind: OverlayKind; hasPiece: boolean }) {
  const color = OVERLAY_COLOR[kind]

  if (kind === 'legal' && !hasPiece) {
    return (
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <span
          style={{
            width: '30%',
            height: '30%',
            borderRadius: '50%',
            background: color,
          }}
        />
      </span>
    )
  }

  if (kind === 'capture' || (kind === 'legal' && hasPiece)) {
    return (
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '4%',
          borderRadius: '50%',
          boxSizing: 'border-box',
          border: `4px solid ${OVERLAY_COLOR.capture}`,
        }}
      />
    )
  }

  if (kind === 'selected' || kind === 'hint') {
    return (
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          boxSizing: 'border-box',
          border: `4px solid ${color}`,
          background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
        }}
      />
    )
  }

  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, background: color }} />
  )
}

function Coordinate({
  file,
  rank,
  files,
  ranks,
}: {
  square: Square
  file: string
  rank: string
  files: string[]
  ranks: string[]
}) {
  const showFile = rank === ranks[ranks.length - 1]
  const showRank = file === files[0]
  if (!showFile && !showRank) return null

  const style: React.CSSProperties = {
    position: 'absolute',
    fontSize: 'clamp(9px, 1.6cqw, 12px)',
    fontWeight: 700,
    lineHeight: 1,
    color: 'var(--color-board-coord)',
    pointerEvents: 'none',
  }

  return (
    <>
      {showRank ? (
        <span aria-hidden="true" style={{ ...style, top: '4%', left: '5%' }}>
          {rank}
        </span>
      ) : null}
      {showFile ? (
        <span aria-hidden="true" style={{ ...style, bottom: '4%', right: '5%' }}>
          {file}
        </span>
      ) : null}
    </>
  )
}

const PROMOTION_CHOICES: PieceSymbol[] = ['q', 'r', 'b', 'n']

/**
 * An in-page chooser rather than a browser dialog. `window.confirm` and
 * friends block the page thread, and the promotion rule needs explaining
 * anyway — a beginner does not know a knight is even an option.
 */
function PromotionChooser({
  color,
  onChoose,
  onCancel,
}: {
  color: Color
  onChoose: (type: PieceSymbol) => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose what your pawn becomes"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'color-mix(in srgb, var(--color-background) 82%, transparent)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="card" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
        <p style={{ margin: '0 0 var(--spacing-md)', fontWeight: 600 }}>
          Your pawn reached the end — choose what it becomes
        </p>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center' }}>
          {PROMOTION_CHOICES.map((type) => (
            <button
              key={type}
              type="button"
              autoFocus={type === 'q'}
              onClick={() => onChoose(type)}
              style={{
                width: 56,
                height: 56,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--color-muted)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-md)',
                transition: 'background var(--dur-hover) var(--ease-out)',
              }}
            >
              <PieceSVG type={type} color={color} size={40} title={describePiece(type, color)} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            marginTop: 'var(--spacing-md)',
            background: 'none',
            border: 'none',
            color: 'var(--color-muted-foreground)',
            textDecoration: 'underline',
          }}
        >
          Cancel this move
        </button>
      </div>
    </div>
  )
}
