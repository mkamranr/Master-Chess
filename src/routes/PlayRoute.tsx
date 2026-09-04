import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Color, PieceSymbol, Square } from '@/chess/game'
import {
  Position,
  currentPosition,
  movePairs,
  newGame,
  pushMove,
  undoMove,
  type GameRecord,
} from '@/chess/game'
import { explainMove, type MoveExplanation } from '@/analysis/explain'
import { controlMap, materialBalance } from '@/analysis/threats'
import { colorName, formatMaterial } from '@/chess/values'
import { Board } from '@/components/board/Board'
import { nextArrows } from '@/components/board/chainArrows'
import type { BoardArrow } from '@/components/board/Arrows'
import { CoachPanel, type CoachTab } from '@/components/coach/CoachPanel'
import { VERDICT_STYLE } from '@/components/coach/verdictStyle'
import { Badge, Button, Hint, Panel, Row } from '@/components/ui/primitives'
import type { ChessEngine } from '@/engine/stockfish'
import { splitLan } from '@/engine/uci'
import type { Progress } from '@/progress/store'

/* ---------------------------------------------------------------------------
 * Play a full game against the engine, with the coach watching.
 *
 * The engine is loaded only when a game actually starts — 7MB is not something
 * to spend on a learner who came to read Chapter 1.
 * ------------------------------------------------------------------------ */

const STRENGTH_LEVELS = [
  { elo: 500, label: 'Brand new', note: 'Plays almost randomly. Beat this first.' },
  { elo: 800, label: 'Beginner', note: 'Takes free pieces but misses tactics.' },
  { elo: 1100, label: 'Improving', note: 'Punishes obvious mistakes.' },
  { elo: 1400, label: 'Club player', note: 'Sees short tactics reliably.' },
  { elo: 1700, label: 'Strong club', note: 'You will need real technique.' },
  { elo: 2000, label: 'Expert', note: 'Genuinely hard.' },
] as const

type PendingMove = {
  from: Square
  to: Square
  promotion?: PieceSymbol
  explanation: MoveExplanation
}

export function PlayRoute({
  engine,
  engineState,
  onLoadEngine,
  progress,
  onProgressChange,
  onGameEnd,
}: {
  engine: ChessEngine | null
  engineState: string
  onLoadEngine: () => void
  progress: Progress
  onProgressChange: (next: Progress) => void
  onGameEnd: (game: GameRecord) => void
}) {
  const [game, setGame] = useState<GameRecord>(() => newGame())
  const [playerColor, setPlayerColor] = useState<Color>('w')
  const [selected, setSelected] = useState<Square | null>(null)
  const [preview, setPreview] = useState<MoveExplanation | null>(null)
  const [tab, setTab] = useState<CoachTab>('rule')
  const [showControl, setShowControl] = useState(false)
  const [pending, setPending] = useState<PendingMove | null>(null)
  const [thinking, setThinking] = useState(false)
  const [chainArrows, setChainArrows] = useState<BoardArrow[]>([])
  const [lastCoachNote, setLastCoachNote] = useState<string | null>(null)

  const position = useMemo(() => currentPosition(game), [game])
  const status = position.status()
  const lastEntry = game.history.at(-1)
  const engineReady = engineState === 'ready' || engineState === 'searching'

  // Keep the engine's strength in step with the chosen level.
  useEffect(() => {
    if (!engine || !engineReady) return
    void engine.setStrength(progress.opponentElo).catch(() => {})
  }, [engine, engineReady, progress.opponentElo])

  useEffect(() => {
    if (status.isGameOver) onGameEnd(game)
  }, [status.isGameOver, game, onGameEnd])

  /* --- the engine's turn --------------------------------------------- */

  // A ref guards against firing two searches for the same position if React
  // re-renders while one is already in flight.
  const searchingFor = useRef<string | null>(null)

  useEffect(() => {
    if (!engine || !engineReady) return
    if (status.isGameOver) return
    if (status.turn === playerColor) return

    const fen = position.fen()
    if (searchingFor.current === fen) return
    searchingFor.current = fen
    setThinking(true)

    let cancelled = false
    void engine
      .bestMove(fen, { depth: 10, movetime: 700 })
      .then((lan) => {
        if (cancelled || !lan) return
        const { from, to, promotion } = splitLan(lan)
        const move = position.findMove(from as Square, to as Square, promotion as PieceSymbol)
        if (move) setGame((current) => pushMove(current, move))
      })
      .catch(() => {
        /* Leave the position alone; the learner can undo or restart. */
      })
      .finally(() => {
        if (!cancelled) setThinking(false)
      })

    return () => {
      cancelled = true
    }
  }, [engine, engineReady, position, status.turn, status.isGameOver, playerColor])

  /* --- the learner's turn -------------------------------------------- */

  const commit = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const move = position.findMove(from, to, promotion)
      if (!move) return
      const explanation = explainMove(position, move, { includeMotifs: true })
      setGame((current) => pushMove(current, move))
      setPending(null)
      setPreview(null)
      setSelected(null)
      setLastCoachNote(progress.coachMode === 'explain' ? explanation.summary : null)
    },
    [position, progress.coachMode],
  )

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const move = position.findMove(from, to, promotion)
      if (!move) return
      const explanation = explainMove(position, move, { includeMotifs: false })

      // Warn before a move that hands material over — but only warn. The
      // learner may know something the material count does not, so this is a
      // question rather than a veto, and it is rendered inline: a browser
      // confirm() would freeze the page and cannot explain itself.
      if (progress.coachMode === 'warn' && explanation.netMaterial <= -2) {
        setPending({ from, to, promotion, explanation })
        return
      }
      commit(from, to, promotion)
    },
    [position, progress.coachMode, commit],
  )

  const restart = useCallback(
    (color: Color) => {
      setGame(newGame())
      setPlayerColor(color)
      setPending(null)
      setPreview(null)
      setSelected(null)
      setLastCoachNote(null)
      searchingFor.current = null
    },
    [],
  )

  const takeBack = useCallback(() => {
    // Undo both the engine's reply and the learner's move, so it is their turn.
    setGame((current) => {
      let next = undoMove(current)
      if (currentPosition(next).turn() !== playerColor) next = undoMove(next)
      return next
    })
    setPending(null)
    setPreview(null)
    searchingFor.current = null
  }, [playerColor])

  // See LearnRoute: a stable identity plus a bail-out on an unchanged list is
  // what keeps this from becoming a render loop.
  const handleArrowsChange = useCallback((list: Array<{ from: string; to: string }>) => {
    setChainArrows((current) => nextArrows(current, list))
  }, [])

  const map = useMemo(() => (showControl ? controlMap(position) : null), [showControl, position])
  const arrows = tab === 'ifthen' ? chainArrows : []

  if (!engineReady && engineState !== 'loading') {
    return <EngineGate engineState={engineState} onLoadEngine={onLoadEngine} />
  }

  return (
    <div
      className="learn-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 260px) minmax(320px, 1fr) minmax(320px, 420px)',
        gap: 'var(--spacing-lg)',
        alignItems: 'start',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
        <Panel title="Opponent" subtitle="Set it low and raise it as you win">
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12.5 }}>
              <span style={{ color: 'var(--color-muted-foreground)' }}>Strength</span>
              <select
                value={progress.opponentElo}
                onChange={(event) =>
                  onProgressChange({ ...progress, opponentElo: Number(event.target.value) })
                }
                style={selectStyle}
              >
                {STRENGTH_LEVELS.map((level) => (
                  <option key={level.elo} value={level.elo}>
                    {level.label} (~{level.elo})
                  </option>
                ))}
              </select>
            </label>
            <p style={{ margin: 0, fontSize: 12.4, color: 'var(--color-muted-foreground)' }}>
              {STRENGTH_LEVELS.find((l) => l.elo === progress.opponentElo)?.note}
            </p>

            <label style={{ display: 'grid', gap: 6, fontSize: 12.5 }}>
              <span style={{ color: 'var(--color-muted-foreground)' }}>Coach</span>
              <select
                value={progress.coachMode}
                onChange={(event) =>
                  onProgressChange({
                    ...progress,
                    coachMode: event.target.value as Progress['coachMode'],
                  })
                }
                style={selectStyle}
              >
                <option value="silent">Silent — just play</option>
                <option value="warn">Warn me before a blunder</option>
                <option value="explain">Explain every move</option>
              </select>
            </label>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Button onClick={() => restart('w')} variant="primary">
                New game as White
              </Button>
              <Button onClick={() => restart('b')}>As Black</Button>
              <Button onClick={takeBack} variant="ghost" disabled={game.history.length === 0}>
                Take back
              </Button>
            </div>
          </div>
        </Panel>

        <MoveList game={game} />
      </div>

      <div style={{ display: 'grid', gap: 'var(--spacing-md)', minWidth: 0 }}>
        <GameStatusBar
          position={position}
          playerColor={playerColor}
          thinking={thinking}
          note={lastCoachNote}
        />

        <Board
          position={position}
          orientation={playerColor}
          onMove={handleMove}
          movableFor={status.isGameOver ? 'none' : playerColor}
          onSelectSquare={setSelected}
          arrows={arrows}
          controlMap={map}
          lastMove={lastEntry ? { from: lastEntry.move.from, to: lastEntry.move.to } : null}
        />

        {pending ? (
          <BlunderWarning
            pending={pending}
            onConfirm={() => commit(pending.from, pending.to, pending.promotion)}
            onCancel={() => setPending(null)}
          />
        ) : null}
      </div>

      <CoachPanel
        position={position}
        selected={selected}
        preview={preview}
        onPreview={setPreview}
        engine={engine}
        engineReady={engineReady}
        showControl={showControl}
        onToggleControl={setShowControl}
        onArrowsChange={handleArrowsChange}
        activeTab={tab}
        onTabChange={setTab}
      />
    </div>
  )
}

/* ------------------------------------------------------------------------ */

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  minHeight: 40,
  background: 'var(--color-muted)',
  color: 'var(--color-foreground)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
}

/**
 * The engine download is explicit rather than automatic. It is 7MB, and a
 * learner on a phone connection deserves to be asked.
 */
function EngineGate({
  engineState,
  onLoadEngine,
}: {
  engineState: string
  onLoadEngine: () => void
}) {
  return (
    <Panel title="Play a game" subtitle="This is the one part that needs the chess engine">
      <div style={{ display: 'grid', gap: 'var(--spacing-lg)', maxWidth: '60ch' }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          Playing against an opponent uses Stockfish, which runs entirely in your browser — nothing
          is sent anywhere. It is a one-off download of roughly 7MB, so it is not fetched until you
          ask for it. Every lesson, drill and explanation in the rest of the app works without it.
        </p>
        {engineState === 'failed' ? (
          <Hint tone="bad">
            <span>
              The engine could not start. That usually means WebAssembly is blocked in this browser.
              The lessons and drills all still work — only playing a full game needs it.
            </span>
          </Hint>
        ) : null}
        <div>
          <Button onClick={onLoadEngine} variant="primary">
            {engineState === 'failed' ? 'Try loading again' : 'Load the engine and play'}
          </Button>
        </div>
      </div>
    </Panel>
  )
}

function GameStatusBar({
  position,
  playerColor,
  thinking,
  note,
}: {
  position: Position
  playerColor: Color
  thinking: boolean
  note: string | null
}) {
  const status = position.status()
  const yourTurn = status.turn === playerColor && !status.isGameOver

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {status.isGameOver ? (
          <Badge tone={status.winner === playerColor ? 'good' : status.winner ? 'bad' : 'neutral'}>
            {status.reason === 'checkmate'
              ? `Checkmate — ${colorName(status.winner!)} wins`
              : `Draw — ${status.reason?.replace('-', ' ')}`}
          </Badge>
        ) : (
          <Badge tone={yourTurn ? 'accent' : 'neutral'}>
            {thinking ? 'Opponent thinking…' : yourTurn ? 'Your move' : 'Opponent to move'}
          </Badge>
        )}
        {status.inCheck && !status.isCheckmate ? <Badge tone="bad">Check</Badge> : null}
      </div>
      {note ? (
        <Hint>
          <span>{note}</span>
        </Hint>
      ) : null}
    </div>
  )
}

/**
 * An inline card, never `window.confirm`. A browser dialog would block the
 * page thread — and more importantly, it could not show *why* the move is bad.
 */
function BlunderWarning({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingMove
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="alertdialog"
      aria-label="Move warning"
      className="card"
      style={{
        padding: 'var(--spacing-lg)',
        borderColor: 'color-mix(in srgb, var(--color-destructive) 45%, transparent)',
        display: 'grid',
        gap: 'var(--spacing-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Badge tone="bad" icon={<span aria-hidden>▼</span>}>
          Careful
        </Badge>
        <strong style={{ fontSize: 14 }}>
          {pending.explanation.san} looks like it costs {Math.abs(pending.explanation.netMaterial)}{' '}
          pawns
        </strong>
      </div>
      <p style={{ margin: 0, fontSize: 13.6, lineHeight: 1.55 }}>
        {pending.explanation.summary}
      </p>
      <p style={{ margin: 0, fontSize: 12.6, color: 'var(--color-muted-foreground)' }}>
        This is only a material count — if you are sacrificing on purpose, go ahead.
      </p>
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        <Button onClick={onCancel} variant="primary">
          Let me choose again
        </Button>
        <Button onClick={onConfirm} variant="danger">
          Play {pending.explanation.san} anyway
        </Button>
      </div>
    </div>
  )
}

function MoveList({ game }: { game: GameRecord }) {
  const rows = useMemo(() => movePairs(game), [game])
  const position = currentPosition(game)
  const material = useMemo(() => materialBalance(position).diff, [position])

  return (
    <Panel title="Moves" subtitle={`${game.history.length} played`} padded={false}>
      <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
        <Row label="Material">{formatMaterial(material)} for White</Row>
      </div>
      <div
        style={{ maxHeight: 320, overflowY: 'auto', padding: '0 var(--spacing-lg) var(--spacing-lg)' }}
      >
        {rows.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted-foreground)' }}>
            No moves yet.
          </p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, fontFamily: 'var(--font-mono)', fontSize: 12.8 }}>
            {rows.map((row) => (
              <li
                key={row.number}
                style={{ display: 'grid', gridTemplateColumns: '2.2em 1fr 1fr', gap: 6, padding: '2px 0' }}
              >
                <span style={{ color: 'var(--color-muted-foreground)' }}>{row.number}.</span>
                <span>{row.white?.move.san ?? ''}</span>
                <span>{row.black?.move.san ?? ''}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  )
}

export { VERDICT_STYLE }
