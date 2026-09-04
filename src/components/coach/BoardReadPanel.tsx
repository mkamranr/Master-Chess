import { useMemo } from 'react'
import type { Square } from '@/chess/game'
import { Position } from '@/chess/game'
import {
  hangingPieces,
  materialBalance,
  opponentThreats,
  squareReport,
} from '@/analysis/threats'
import { PIECE_VALUE, colorName, formatMaterial, opposite, pieceName } from '@/chess/values'
import { Badge, Hint, Row, SquareChip } from '@/components/ui/primitives'
import { PieceSVG, describePiece } from '@/components/board/PieceSVG'

/* ---------------------------------------------------------------------------
 * "Reading the board" — the panel that teaches board vision.
 *
 * Three questions, always answerable: who is winning on material, what is
 * loose right now, and who controls the square I am looking at. These are the
 * habits that separate a player who sees the board from one who only sees
 * their own plan.
 * ------------------------------------------------------------------------ */

export function BoardReadPanel({
  position,
  selected,
  showControl,
  onToggleControl,
}: {
  position: Position
  selected: Square | null
  showControl: boolean
  onToggleControl: (next: boolean) => void
}) {
  const balance = useMemo(() => materialBalance(position), [position])
  const status = position.status()
  const loose = useMemo(
    () => ({
      white: hangingPieces(position, 'w'),
      black: hangingPieces(position, 'b'),
    }),
    [position],
  )
  const threats = useMemo(() => opponentThreats(position), [position])
  const report = useMemo(
    () => (selected ? squareReport(position, selected) : null),
    [position, selected],
  )

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
      <section>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Material</h3>
        <MaterialBar white={balance.white} black={balance.black} />
        <Row label="White">{balance.white} pawns of material</Row>
        <Row label="Black">{balance.black} pawns of material</Row>
        <Row label="Balance">
          <Badge tone={balance.diff === 0 ? 'neutral' : balance.diff > 0 ? 'good' : 'bad'}>
            {balance.diff === 0 ? 'level' : `${formatMaterial(balance.diff)} for White`}
          </Badge>
        </Row>
        <CapturedPieces position={position} />
      </section>

      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <h3 style={{ fontSize: 14 }}>Square control</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
            <input
              type="checkbox"
              checked={showControl}
              onChange={(event) => onToggleControl(event.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--color-accent)' }}
            />
            Show heatmap on board
          </label>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted-foreground)' }}>
          The heatmap tints every square by who covers it. Controlling the four central squares is
          what "fighting for the centre" actually means — it is not a slogan, it is these squares.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap', fontSize: 12.5 }}>
          <Legend color="var(--color-ov-white-control)" label="White only" />
          <Legend color="var(--color-ov-black-control)" label="Black only" />
          <Legend color="var(--color-ov-contested)" label="Contested" />
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 14, marginBottom: 8 }}>Loose pieces right now</h3>
        <LooseList label="White" items={loose.white} />
        <LooseList label="Black" items={loose.black} />
        {loose.white.length === 0 && loose.black.length === 0 ? (
          <Hint tone="good">
            <span>Nothing is hanging for either side. Every piece that is attacked is defended
            well enough.</span>
          </Hint>
        ) : null}
      </section>

      {threats.length > 0 ? (
        <section>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>
            What {colorName(opposite(status.turn))} is threatening
          </h3>
          <Hint tone="warn">
            <span>
              If you did nothing at all, {colorName(opposite(status.turn))} could take{' '}
              {threats.slice(0, 3).map((t) => (
                <span key={t.square} style={{ marginRight: 6 }}>
                  your {pieceName(t.piece.type)} on <SquareChip square={t.square} />
                </span>
              ))}
              . Deal with the biggest one first.
            </span>
          </Hint>
        </section>
      ) : null}

      {report ? <SquareDetail position={position} report={report} /> : null}
    </div>
  )
}

/* ------------------------------------------------------------------------ */

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span
        aria-hidden="true"
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          background: color,
          border: '1px solid var(--color-border-strong)',
        }}
      />
      {label}
    </span>
  )
}

function MaterialBar({ white, black }: { white: number; black: number }) {
  const total = white + black || 1
  const whiteShare = (white / total) * 100

  return (
    <div
      role="img"
      aria-label={`Material: White ${white}, Black ${black}`}
      style={{
        display: 'flex',
        height: 10,
        borderRadius: 999,
        overflow: 'hidden',
        border: '1px solid var(--color-border-strong)',
        marginBottom: 'var(--spacing-sm)',
      }}
    >
      <span style={{ width: `${whiteShare}%`, background: 'var(--color-piece-white)' }} />
      <span style={{ flex: 1, background: 'var(--color-piece-black)' }} />
    </div>
  )
}

/**
 * What each side has captured, derived by comparing the board against a full
 * starting army. Beginners find this far easier to read than a number.
 */
function CapturedPieces({ position }: { position: Position }) {
  const START_COUNTS = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 } as const

  const missing = (color: 'w' | 'b') => {
    const have = position.piecesOf(color)
    return (Object.keys(START_COUNTS) as Array<keyof typeof START_COUNTS>)
      .flatMap((type) => {
        const count = have.filter((p) => p.type === type).length
        const gone = Math.max(0, START_COUNTS[type] - count)
        return Array.from({ length: gone }, () => type)
      })
      .filter((type) => type !== 'k')
      .sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a])
  }

  const rows = [
    { label: 'White has captured', pieces: missing('b'), color: 'b' as const },
    { label: 'Black has captured', pieces: missing('w'), color: 'w' as const },
  ]

  return (
    <div style={{ marginTop: 'var(--spacing-md)', display: 'grid', gap: 6 }}>
      {rows.map((row) => (
        <div
          key={row.label}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}
        >
          <span style={{ color: 'var(--color-muted-foreground)', minWidth: 128 }}>
            {row.label}
          </span>
          {row.pieces.length === 0 ? (
            <span style={{ color: 'var(--color-muted-foreground)' }}>nothing yet</span>
          ) : (
            <span style={{ display: 'flex', gap: 1 }}>
              {row.pieces.map((type, index) => (
                <PieceSVG
                  key={`${type}-${index}`}
                  type={type}
                  color={row.color}
                  size={18}
                  title={describePiece(type, row.color)}
                />
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function LooseList({
  label,
  items,
}: {
  label: string
  items: ReturnType<typeof hangingPieces>
}) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ margin: '0 0 4px', fontSize: 12.5, color: 'var(--color-muted-foreground)' }}>
        {label}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
        {items.map((item) => (
          <li
            key={item.square}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.2 }}
          >
            <Badge tone="bad" icon={<span aria-hidden>▼</span>}>
              −{item.lossIfTaken}
            </Badge>
            <span>
              {pieceName(item.piece.type)} on <SquareChip square={item.square} />
              {item.undefended ? ' is completely undefended' : ' is defended, but not well enough'}
              , attacked from{' '}
              {item.attackers.map((s) => (
                <SquareChip key={s} square={s} />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SquareDetail({
  position,
  report,
}: {
  position: Position
  report: ReturnType<typeof squareReport>
}) {
  const piece = report.piece

  return (
    <section>
      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Square {report.square}</h3>
      <Row label="Colour">{report.squareColor} square</Row>
      <Row label="Occupied by">
        {piece ? describePiece(piece.type, piece.color) : 'nothing'}
      </Row>
      <Row label="White attacks it from">
        {report.whiteAttackers.length === 0 ? (
          'nowhere'
        ) : (
          <span style={{ display: 'inline-flex', gap: 3, flexWrap: 'wrap' }}>
            {report.whiteAttackers.map((s) => (
              <SquareChip key={s} square={s} />
            ))}
          </span>
        )}
      </Row>
      <Row label="Black attacks it from">
        {report.blackAttackers.length === 0 ? (
          'nowhere'
        ) : (
          <span style={{ display: 'inline-flex', gap: 3, flexWrap: 'wrap' }}>
            {report.blackAttackers.map((s) => (
              <SquareChip key={s} square={s} />
            ))}
          </span>
        )}
      </Row>

      {report.pin ? (
        <Hint tone="warn">
          <span>
            This piece is <strong>pinned</strong> by the enemy piece on{' '}
            <SquareChip square={report.pin.pinnedBy} />, against your{' '}
            {pieceName(position.pieceAt(report.pin.shieldedSquare)?.type ?? 'k')} on{' '}
            <SquareChip square={report.pin.shieldedSquare} />. It can only move along that line.
          </span>
        </Hint>
      ) : null}

      {report.isHanging ? (
        <Hint tone="bad">
          <span>
            This piece can be taken for a profit of {report.lossIfTaken}. Either defend it, move
            it, or make a bigger threat elsewhere.
          </span>
        </Hint>
      ) : null}
    </section>
  )
}
