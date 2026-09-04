import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PieceSymbol, Square } from '@/chess/game'
import type { MoveExplanation } from '@/analysis/explain'
import { controlMap } from '@/analysis/threats'
import { Board } from '@/components/board/Board'
import { nextArrows } from '@/components/board/chainArrows'
import type { BoardArrow } from '@/components/board/Arrows'
import { CoachPanel, type CoachTab } from '@/components/coach/CoachPanel'
import {
  LessonText,
  ObjectiveBar,
  useLessonSession,
} from '@/components/lesson/LessonRunner'
import { Badge, Panel } from '@/components/ui/primitives'
import { CHAPTERS } from '@/curriculum/index'
import { lessonSequence } from '@/curriculum/types'
import type { ChessEngine } from '@/engine/stockfish'
import { ChapterNav } from './ChapterNav'

export function LearnRoute({
  lessonId,
  onLessonChange,
  completed,
  onComplete,
  engine,
  engineReady,
}: {
  lessonId: string
  onLessonChange: (id: string) => void
  completed: string[]
  onComplete: (id: string) => void
  engine: ChessEngine | null
  engineReady: boolean
}) {
  const sequence = useMemo(() => lessonSequence(CHAPTERS), [])
  const index = Math.max(
    0,
    sequence.findIndex((entry) => entry.lesson.id === lessonId),
  )
  const entry = sequence[index]!
  const { lesson, chapter } = entry

  const { session, attempt, reset, showHint } = useLessonSession(lesson)
  const [selected, setSelected] = useState<Square | null>(null)
  const [preview, setPreview] = useState<MoveExplanation | null>(null)
  const [tab, setTab] = useState<CoachTab>('rule')
  const [showControl, setShowControl] = useState(false)
  const [chainArrows, setChainArrows] = useState<BoardArrow[]>([])

  // Lesson authors can ask for the heatmap to start on.
  useEffect(() => {
    setShowControl(lesson.showControl ?? false)
    setSelected(null)
    setPreview(null)
    setTab('rule')
    setChainArrows([])
  }, [lesson])

  // A lesson that sets a task is complete when the task is solved.
  useEffect(() => {
    if (session.state === 'solved') onComplete(lesson.id)
  }, [session.state, lesson.id, onComplete])

  const goTo = useCallback(
    (target: number) => {
      // Reading and practice lessons have no pass/fail gate, so moving on is
      // the only signal that the learner is done with them. Without this they
      // could never be completed at all and the course would sit at a
      // fraction of its real progress forever.
      if (lesson.kind === 'explain' || lesson.kind === 'drill') onComplete(lesson.id)
      const next = sequence[target]
      if (next) onLessonChange(next.lesson.id)
    },
    [sequence, onLessonChange, lesson, onComplete],
  )

  const handleMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      attempt(from, to, promotion)
      setPreview(null)
    },
    [attempt],
  )

  // Stable identity is essential here: an inline callback changed on every
  // render, which re-fired the coach panel's effect, which set this state,
  // which re-rendered — an infinite loop. `nextArrows` additionally returns
  // the existing array when nothing changed, so no render is triggered.
  const handleArrowsChange = useCallback((list: Array<{ from: string; to: string }>) => {
    setChainArrows((current) => nextArrows(current, list))
  }, [])

  const arrows: BoardArrow[] = useMemo(() => {
    if (chainArrows.length > 0 && tab === 'ifthen') return chainArrows
    return (lesson.arrows ?? []).map((a) => ({ ...a }))
  }, [chainArrows, tab, lesson])

  const map = useMemo(() => (showControl ? controlMap(session.position) : null), [
    showControl,
    session.position,
  ])

  const targetVerdicts = useMemo(() => {
    if (!preview) return undefined
    return { [preview.to]: preview.summary } as Partial<Record<Square, string>>
  }, [preview])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 260px) minmax(320px, 1fr) minmax(320px, 420px)',
        gap: 'var(--spacing-lg)',
        alignItems: 'start',
      }}
      className="learn-grid"
    >
      <ChapterNav
        chapters={CHAPTERS}
        currentLessonId={lesson.id}
        completed={completed}
        onSelect={onLessonChange}
      />

      <div style={{ display: 'grid', gap: 'var(--spacing-lg)', minWidth: 0 }}>
        <Panel
          title={lesson.title}
          subtitle={`Chapter ${chapter.number} · ${chapter.title}`}
          actions={
            <Badge tone="neutral">
              {index + 1} / {sequence.length}
            </Badge>
          }
        >
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            <LessonText paragraphs={lesson.body} />
            <ObjectiveBar
              lesson={lesson}
              session={session}
              onShowHint={showHint}
              onReset={reset}
              onNext={index + 1 < sequence.length ? () => goTo(index + 1) : undefined}
            />
          </div>
        </Panel>

        <Board
          position={session.position}
          orientation={lesson.orientation ?? 'w'}
          onMove={handleMove}
          onSelectSquare={setSelected}
          overlays={lesson.highlights}
          arrows={arrows}
          controlMap={map}
          lastMove={session.lastMoveSquares}
          targetVerdicts={targetVerdicts}
        />
      </div>

      <CoachPanel
        position={session.position}
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
        demoBoard={lesson.demoBoard}
      />
    </div>
  )
}
