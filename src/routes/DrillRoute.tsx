import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Color, Square } from '@/chess/game'
import { Position } from '@/chess/game'
import { ALL_SQUARES, colorName, squareColor } from '@/chess/values'
import { hangingPieces } from '@/analysis/threats'
import { explainAllMoves } from '@/analysis/explain'
import { Board } from '@/components/board/Board'
import { Badge, Button, Hint, Panel, Tabs } from '@/components/ui/primitives'
import { describePiece } from '@/components/board/PieceSVG'
import type { DrillKind } from '@/curriculum/types'
import type { Progress } from '@/progress/store'
import { drillAccuracy, recordDrill } from '@/progress/store'

/* ---------------------------------------------------------------------------
 * Drills — endless randomised repetition of one skill.
 *
 * Positions are generated rather than authored, so a drill never runs out and
 * never becomes a memory test. Each generator returns a question plus the way
 * to check an answer.
 * ------------------------------------------------------------------------ */

const DRILLS: Array<{ id: DrillKind; label: string; blurb: string }> = [
  { id: 'name-the-square', label: 'Name the square', blurb: 'Click the square that is called out.' },
  { id: 'square-colour', label: 'Light or dark?', blurb: 'Say the colour of the named square.' },
  { id: 'who-attacks', label: 'Who attacks it?', blurb: 'Count the attackers of a square.' },
  { id: 'hanging-piece', label: 'Spot the loose piece', blurb: 'Click the piece that is free to take.' },
  { id: 'mate-in-one', label: 'Mate in one', blurb: 'Find the move that ends it.' },
]

/** A grab-bag of real positions for the board-based drills. */
const DRILL_POSITIONS = [
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
  'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
  'rnbqkb1r/pp2pppp/3p4/2pP4/4P3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 1',
  'r2qkbnr/ppp2ppp/2np4/4p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 1',
  'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 1',
]

const MATE_IN_ONE = [
  { fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', san: 'Re8#' },
  { fen: '6k1/R7/8/8/8/8/8/1R4K1 w - - 0 1', san: 'Rb8#' },
  { fen: 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1', san: 'Qh8#' },
  { fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1', san: 'Rh8#' },
  { fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', san: 'Nf7#' },
  { fen: 'k7/8/1K6/8/8/8/8/2Q5 w - - 0 1', san: 'Qc8#' },
]

const HANGING = [
  { fen: '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1', square: 'd5' as Square },
  { fen: '4k3/8/8/2p5/3N4/8/8/4K3 b - - 0 1', square: 'd4' as Square },
  { fen: '4k3/8/8/1p6/2R5/8/8/4K3 b - - 0 1', square: 'c4' as Square },
  { fen: '4k3/8/4n3/8/8/8/4R3/4K3 w - - 0 1', square: 'e6' as Square },
]

const pick = <T,>(list: readonly T[], seed: number): T =>
  list[Math.abs(seed) % list.length] as T

interface Question {
  prompt: string
  fen: string
  /** Which square the learner should click, when the drill is click-based. */
  targetSquare?: Square
  /** Multiple-choice options, when the drill is answer-based. */
  choices?: string[]
  correctChoice?: string
  /** The move to play, for mate-in-one. */
  correctSan?: string
  highlight?: Square
  reveal: string
}

function makeQuestion(kind: DrillKind, seed: number): Question {
  switch (kind) {
    case 'name-the-square': {
      const square = pick(ALL_SQUARES, seed)
      return {
        prompt: `Click ${square}`,
        fen: '7k/8/8/8/8/8/8/K7 w - - 0 1',
        targetSquare: square,
        reveal: `${square} is the ${squareColor(square)} square on file ${square[0]}, rank ${square[1]}.`,
      }
    }
    case 'square-colour': {
      const square = pick(ALL_SQUARES, seed)
      const answer = squareColor(square)
      return {
        prompt: `Is ${square} a light or a dark square?`,
        fen: '7k/8/8/8/8/8/8/K7 w - - 0 1',
        choices: ['light', 'dark'],
        correctChoice: answer,
        reveal: `${square} is ${answer}. File ${square[0]} is the ${'abcdefgh'.indexOf(square[0]!) + 1}${ordinal('abcdefgh'.indexOf(square[0]!) + 1)} file and the rank is ${square[1]} — both odd or both even means dark.`,
      }
    }
    case 'who-attacks': {
      const fen = pick(DRILL_POSITIONS, seed)
      const position = Position.fromFen(fen)
      const square = pick(ALL_SQUARES, seed * 7 + 13)
      const color: Color = seed % 2 === 0 ? 'w' : 'b'
      const count = position.attackers(square, color).length
      return {
        prompt: `How many ${colorName(color)} pieces attack ${square}?`,
        fen,
        highlight: square,
        choices: ['0', '1', '2', '3 or more'],
        correctChoice: count >= 3 ? '3 or more' : String(count),
        reveal:
          position.attackers(square, color).length === 0
            ? `Nothing of ${colorName(color)}'s attacks ${square}.`
            : `${colorName(color)} attacks ${square} from ${position.attackers(square, color).join(', ')}.`,
      }
    }
    case 'hanging-piece': {
      const item = pick(HANGING, seed)
      const position = Position.fromFen(item.fen)
      const piece = position.pieceAt(item.square)
      return {
        prompt: 'Click the piece that can be taken for free.',
        fen: item.fen,
        targetSquare: item.square,
        reveal: piece
          ? `The ${describePiece(piece.type, piece.color).toLowerCase()} on ${item.square} is attacked and undefended.`
          : `${item.square} is the answer.`,
      }
    }
    case 'mate-in-one':
    case 'best-capture':
    default: {
      const item = pick(MATE_IN_ONE, seed)
      return {
        prompt: 'Find checkmate in one move.',
        fen: item.fen,
        correctSan: item.san,
        reveal: `${item.san} is mate.`,
      }
    }
  }
}

function ordinal(n: number): string {
  if (n === 1) return 'st'
  if (n === 2) return 'nd'
  if (n === 3) return 'rd'
  return 'th'
}

export function DrillRoute({
  progress,
  onProgressChange,
}: {
  progress: Progress
  onProgressChange: (next: Progress) => void
}) {
  const [kind, setKind] = useState<DrillKind>('name-the-square')
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 10_000))
  const [result, setResult] = useState<'none' | 'right' | 'wrong'>('none')

  const question = useMemo(() => makeQuestion(kind, seed), [kind, seed])
  const record = progress.drills[kind]
  const accuracy = drillAccuracy(record)

  useEffect(() => {
    setResult('none')
  }, [kind, seed])

  const answer = useCallback(
    (wasCorrect: boolean) => {
      if (result !== 'none') return
      setResult(wasCorrect ? 'right' : 'wrong')
      onProgressChange(recordDrill(progress, kind, wasCorrect))
    },
    [result, onProgressChange, progress, kind],
  )

  const next = useCallback(() => setSeed((s) => s + 1 + Math.floor(Math.random() * 97)), [])

  const position = useMemo(() => Position.fromFen(question.fen), [question])

  return (
    <div
      className="learn-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 1fr) minmax(300px, 400px)',
        gap: 'var(--spacing-lg)',
        alignItems: 'start',
      }}
    >
      <div style={{ display: 'grid', gap: 'var(--spacing-md)', minWidth: 0 }}>
        <Tabs
          tabs={DRILLS.map((d) => ({ id: d.id, label: d.label }))}
          active={kind}
          onChange={setKind}
          label="Drill type"
        />
        <Board
          position={position}
          readOnly={!question.targetSquare && !question.correctSan}
          overlays={question.highlight ? { [question.highlight]: 'hint' } : undefined}
          onSelectSquare={(square) => {
            if (!question.targetSquare || !square || result !== 'none') return
            answer(square === question.targetSquare)
          }}
          onMove={(from, to) => {
            if (!question.correctSan) return
            const move = position.findMove(from, to)
            answer(move?.san === question.correctSan)
          }}
          movableFor={question.correctSan ? position.turn() : 'none'}
        />
      </div>

      <Panel
        title={DRILLS.find((d) => d.id === kind)?.label ?? 'Drill'}
        subtitle={DRILLS.find((d) => d.id === kind)?.blurb}
      >
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge tone="accent">{question.prompt}</Badge>
            {accuracy !== null ? (
              <Badge tone={accuracy > 0.8 ? 'good' : accuracy > 0.5 ? 'warn' : 'bad'}>
                {Math.round(accuracy * 100)}% of {record?.attempts}
              </Badge>
            ) : null}
          </div>

          {question.choices ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {question.choices.map((choice) => (
                <Button
                  key={choice}
                  onClick={() => answer(choice === question.correctChoice)}
                  disabled={result !== 'none'}
                >
                  {choice}
                </Button>
              ))}
            </div>
          ) : null}

          {result === 'right' ? (
            <Hint tone="good">
              <span>Correct. {question.reveal}</span>
            </Hint>
          ) : null}
          {result === 'wrong' ? (
            <Hint tone="bad">
              <span>Not that one. {question.reveal}</span>
            </Hint>
          ) : null}

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Button onClick={next} variant={result === 'none' ? 'secondary' : 'primary'}>
              {result === 'none' ? 'Skip' : 'Next question'}
            </Button>
          </div>

          <p style={{ margin: 0, fontSize: 12.6, color: 'var(--color-muted-foreground)' }}>
            Drills never run out — positions are generated fresh each time, so this is practice
            rather than a memory test.
          </p>
        </div>
      </Panel>
    </div>
  )
}

/** Exposed for the Review screen, which grades a finished game. */
export { explainAllMoves, hangingPieces }
