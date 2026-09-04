import type { Square } from '@/chess/game'
import { Position } from '@/chess/game'
import {
  CASTLING_RULE,
  CHECKMATE_RULE,
  CHECK_RULE,
  DRAW_RULES,
  EN_PASSANT_RULE,
  PIECE_RULES,
  PROMOTION_RULE,
  STALEMATE_RULE,
} from '@/chess/rules'
import { checkResponses } from '@/analysis/threats'
import { colorName, opposite } from '@/chess/values'
import { Badge, Hint, Prose, SquareChip } from '@/components/ui/primitives'
import { describePiece } from '@/components/board/PieceSVG'

/* ---------------------------------------------------------------------------
 * "The rule" — whichever rule the board is asking about right now.
 *
 * The panel is context-sensitive on purpose. A beginner does not need a rule
 * book; they need the one rule that explains the thing in front of them, at
 * the moment they meet it.
 * ------------------------------------------------------------------------ */

export function RulePanel({
  position,
  selected,
  demoBoard = false,
}: {
  position: Position
  selected: Square | null
  demoBoard?: boolean
}) {
  const status = position.status()

  // Game-ending states outrank everything else — unless the board is a bare
  // teaching diagram, where they are technically true but beside the point.
  if (status.isCheckmate && !demoBoard) {
    const winner = status.winner!
    return (
      <Prose>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>{CHECKMATE_RULE.name}</h3>
        <p>{CHECKMATE_RULE.short}</p>
        <p style={{ marginTop: 8 }}>
          <strong>{colorName(winner)} wins.</strong> {CHECKMATE_RULE.gotcha}
        </p>
      </Prose>
    )
  }

  if (status.isStalemate && !demoBoard) {
    return (
      <Prose>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>{STALEMATE_RULE.name}</h3>
        <p>{STALEMATE_RULE.short}</p>
        <Hint tone="warn">
          <span>{STALEMATE_RULE.gotcha}</span>
        </Hint>
      </Prose>
    )
  }

  if (status.isDraw && !demoBoard) {
    const rule = DRAW_RULES.find((r) =>
      status.reason === 'insufficient-material'
        ? r.name === 'Insufficient material'
        : status.reason === 'fifty-move'
          ? r.name === 'Fifty-move rule'
          : r.name === 'Threefold repetition',
    )
    return (
      <Prose>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>Draw — {rule?.name}</h3>
        <p>{rule?.detail}</p>
      </Prose>
    )
  }

  // Being in check is the most urgent rule there is.
  if (status.inCheck) return <CheckRule position={position} />

  if (selected) {
    const piece = position.pieceAt(selected)
    if (piece) return <PieceRule position={position} square={selected} />
  }

  return <TurnRule position={position} />
}

/* ------------------------------------------------------------------------ */

function CheckRule({ position }: { position: Position }) {
  const responses = checkResponses(position)
  const status = position.status()
  const options = [
    { label: 'Move the king', squares: responses.moveKing, note: 'to a square nothing attacks' },
    { label: 'Block the line', squares: responses.block, note: 'put something in the way' },
    { label: 'Capture the attacker', squares: responses.capture, note: 'take the checking piece' },
  ]

  return (
    <Prose>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h3 style={{ fontSize: 16 }}>{colorName(status.turn)} is in check</h3>
        {responses.isDoubleCheck ? <Badge tone="bad">Double check</Badge> : null}
      </div>
      <p>{CHECK_RULE.short}</p>

      <p style={{ marginTop: 12, marginBottom: 6, fontWeight: 600 }}>
        There are only three ways out, and here is what each one offers you:
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
        {options.map((option) => (
          <li key={option.label}>
            <strong>{option.label}</strong>{' '}
            <span style={{ color: 'var(--color-muted-foreground)' }}>— {option.note}:</span>{' '}
            {option.squares.length === 0 ? (
              <Badge tone="bad">not possible here</Badge>
            ) : (
              <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                {[...new Set(option.squares)].map((s) => (
                  <SquareChip key={s} square={s} />
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>

      {responses.isDoubleCheck ? (
        <Hint tone="bad">
          <span>
            Two pieces are checking at once, from{' '}
            {responses.checkers.map((c) => (
              <SquareChip key={c} square={c} />
            ))}
            . One move cannot answer two attackers, so blocking and capturing are both off the
            table — the king has to move.
          </span>
        </Hint>
      ) : (
        <Hint>
          <span>{CHECK_RULE.gotcha}</span>
        </Hint>
      )}
    </Prose>
  )
}

function PieceRule({ position, square }: { position: Position; square: Square }) {
  const piece = position.pieceAt(square)!
  const rule = PIECE_RULES[piece.type]
  const moves = position.legalMoves(square)
  const canCastle =
    piece.type === 'k' && moves.some((m) => m.isKingsideCastle() || m.isQueensideCastle())
  const canEnPassant = moves.some((m) => m.isEnPassant())
  const canPromote = moves.some((m) => m.promotion)
  const rights = position.castlingRights(piece.color)

  return (
    <Prose>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h3 style={{ fontSize: 16 }}>
          {describePiece(piece.type, piece.color)} on {square}
        </h3>
        <Badge tone="accent">{rule.value.split('.')[0]}</Badge>
      </div>

      <p>{rule.full}</p>

      <Hint>
        <span>
          <strong>Watch out: </strong>
          {rule.gotcha}
        </span>
      </Hint>

      <p style={{ marginTop: 12, color: 'var(--color-muted-foreground)', fontSize: 13 }}>
        {moves.length === 0
          ? 'This piece has no legal moves at all right now.'
          : `${moves.length} legal ${moves.length === 1 ? 'move' : 'moves'} from here — they are highlighted on the board.`}
      </p>

      {piece.type === 'k' ? (
        <CastlingConditions
          position={position}
          square={square}
          available={canCastle}
          kingside={rights.kingside}
          queenside={rights.queenside}
        />
      ) : null}

      {canEnPassant ? <SpecialNote rule={EN_PASSANT_RULE} /> : null}
      {canPromote ? <SpecialNote rule={PROMOTION_RULE} /> : null}
    </Prose>
  )
}

function SpecialNote({ rule }: { rule: typeof EN_PASSANT_RULE }) {
  return (
    <div style={{ marginTop: 14 }}>
      <h4 style={{ fontSize: 14, marginBottom: 6 }}>{rule.name} is available here</h4>
      <p style={{ fontSize: 13.5, marginTop: 0 }}>{rule.short}</p>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
        {rule.conditions.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <Hint tone="warn">
        <span>{rule.gotcha}</span>
      </Hint>
    </div>
  )
}

/**
 * Castling has five conditions and beginners trip on all of them, so rather
 * than describing the rule abstractly this checks each condition against the
 * position actually on the board.
 */
function CastlingConditions({
  position,
  square,
  available,
  kingside,
  queenside,
}: {
  position: Position
  square: Square
  available: boolean
  kingside: boolean
  queenside: boolean
}) {
  const piece = position.pieceAt(square)!
  const enemy = opposite(piece.color)
  const rank = piece.color === 'w' ? '1' : '8'
  const status = position.status()

  const throughSquares = kingside
    ? ([`f${rank}`, `g${rank}`] as Square[])
    : ([`d${rank}`, `c${rank}`] as Square[])

  const checks = [
    {
      label: 'Neither the king nor that rook has moved',
      ok: kingside || queenside,
    },
    {
      label: 'The squares between king and rook are empty',
      ok: throughSquares.every((s) => !position.pieceAt(s)),
    },
    { label: 'The king is not currently in check', ok: !status.inCheck },
    {
      label: 'The king does not pass through an attacked square',
      ok: !throughSquares.some((s) => position.isAttacked(s, enemy)),
    },
  ]

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <h4 style={{ fontSize: 14 }}>{CASTLING_RULE.name}</h4>
        {available ? (
          <Badge tone="good" icon={<span aria-hidden>▲</span>}>
            available now
          </Badge>
        ) : (
          <Badge tone="neutral">not available</Badge>
        )}
      </div>
      <p style={{ fontSize: 13.5, marginTop: 0 }}>{CASTLING_RULE.short}</p>
      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 4 }}>
        {checks.map((check) => (
          <li key={check.label} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
            <span
              aria-hidden="true"
              style={{ color: check.ok ? 'var(--color-success)' : 'var(--color-destructive)' }}
            >
              {check.ok ? '✓' : '✗'}
            </span>
            <span>
              {check.label}
              <span className="sr-only">{check.ok ? ' — satisfied' : ' — not satisfied'}</span>
            </span>
          </li>
        ))}
      </ul>
      <Hint tone="warn">
        <span>{CASTLING_RULE.gotcha}</span>
      </Hint>
    </div>
  )
}

function TurnRule({ position }: { position: Position }) {
  const status = position.status()
  const count = position.legalMoves().length

  return (
    <Prose>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>{colorName(status.turn)} to move</h3>
      <p>
        Pick up any {status.turn === 'w' ? 'white' : 'black'} piece to see exactly where it may go
        and what would happen if it went there. {colorName(status.turn)} has{' '}
        <strong>{count}</strong> legal {count === 1 ? 'move' : 'moves'} in this position.
      </p>
      <Hint>
        <span>
          Select a piece on the board — with a click, or with the arrow keys and Enter — and this
          panel will explain the rule that governs it.
        </span>
      </Hint>
    </Prose>
  )
}
