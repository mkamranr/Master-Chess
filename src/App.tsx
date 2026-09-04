import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GameRecord } from '@/chess/game'
import { CHAPTERS } from '@/curriculum/index'
import { lessonCount, lessonSequence } from '@/curriculum/types'
import { Badge, Tabs } from '@/components/ui/primitives'
import { ChessEngine, type EngineState } from '@/engine/stockfish'
import {
  completionRatio,
  loadProgress,
  markCompleted,
  resetProgress,
  saveProgress,
  setLastLesson,
  type Progress,
} from '@/progress/store'
import { DrillRoute } from '@/routes/DrillRoute'
import { LearnRoute } from '@/routes/LearnRoute'
import { PlayRoute } from '@/routes/PlayRoute'
import { ReviewRoute } from '@/routes/ReviewRoute'
import { RoadmapRoute } from '@/routes/RoadmapRoute'

type Route = 'learn' | 'drill' | 'play' | 'review' | 'roadmap'

const ROUTES: Array<{ id: Route; label: string }> = [
  { id: 'learn', label: 'Learn' },
  { id: 'drill', label: 'Drill' },
  { id: 'play', label: 'Play' },
  { id: 'review', label: 'Review' },
  { id: 'roadmap', label: 'Roadmap' },
]

export function App() {
  const [route, setRoute] = useState<Route>('learn')
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [lastGame, setLastGame] = useState<GameRecord | null>(null)

  const sequence = useMemo(() => lessonSequence(CHAPTERS), [])
  const total = useMemo(() => lessonCount(CHAPTERS), [])
  const [lessonId, setLessonId] = useState<string>(
    () => loadProgress().lastLessonId ?? sequence[0]!.lesson.id,
  )

  /* --- the engine, created lazily ------------------------------------ */

  const [engine, setEngine] = useState<ChessEngine | null>(null)
  const [engineState, setEngineState] = useState<EngineState>('idle')

  const loadEngine = useCallback(() => {
    // Nothing here runs until the learner asks for a game, which is the whole
    // point: the rules chapters must never pay for a 7MB download.
    const instance = engine ?? new ChessEngine()
    setEngine(instance)
    instance.onStateChange(setEngineState)
    void instance.ready().catch(() => setEngineState('failed'))
  }, [engine])

  useEffect(() => () => engine?.dispose(), [engine])

  /* --- progress ------------------------------------------------------- */

  const updateProgress = useCallback((next: Progress) => {
    setProgress(saveProgress(next))
  }, [])

  const openLesson = useCallback(
    (id: string) => {
      setLessonId(id)
      setRoute('learn')
      setProgress((current) => saveProgress(setLastLesson(current, id)))
    },
    [],
  )

  const handleComplete = useCallback((id: string) => {
    setProgress((current) => {
      if (current.completed.includes(id)) return current
      return saveProgress(markCompleted(current, id))
    })
  }, [])

  const ratio = completionRatio(progress, total)
  const engineReady = engineState === 'ready' || engineState === 'searching'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-lg)',
          flexWrap: 'wrap',
          padding: 'var(--spacing-md) var(--spacing-xl)',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-card)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <Logo />
          <div>
            <h1 style={{ fontSize: 16, letterSpacing: -0.2 }}>Master Chess</h1>
            <p style={{ margin: 0, fontSize: 11.6, color: 'var(--color-muted-foreground)' }}>
              From no rules at all to a solid club player
            </p>
          </div>
        </div>

        <Badge tone="accent">{Math.round(ratio * 100)}% of the course</Badge>
        {engineState === 'loading' ? <Badge tone="neutral">Loading engine…</Badge> : null}
        {engineReady ? <Badge tone="good">Engine ready</Badge> : null}

        <nav aria-label="Sections" style={{ minWidth: 300 }}>
          <Tabs tabs={ROUTES} active={route} onChange={setRoute} label="Sections" />
        </nav>
      </header>

      <main style={{ flex: 1, padding: 'var(--spacing-xl)', minWidth: 0 }}>
        {route === 'learn' ? (
          <LearnRoute
            lessonId={lessonId}
            onLessonChange={openLesson}
            completed={progress.completed}
            onComplete={handleComplete}
            engine={engine}
            engineReady={engineReady}
          />
        ) : null}

        {route === 'drill' ? (
          <DrillRoute progress={progress} onProgressChange={updateProgress} />
        ) : null}

        {route === 'play' ? (
          <PlayRoute
            engine={engine}
            engineState={engineState}
            onLoadEngine={loadEngine}
            progress={progress}
            onProgressChange={updateProgress}
            onGameEnd={setLastGame}
          />
        ) : null}

        {route === 'review' ? <ReviewRoute game={lastGame} /> : null}

        {route === 'roadmap' ? (
          <RoadmapRoute
            progress={progress}
            onOpenLesson={openLesson}
            onReset={() => setProgress(resetProgress())}
          />
        ) : null}
      </main>

      <footer
        style={{
          padding: 'var(--spacing-md) var(--spacing-xl)',
          borderTop: '1px solid var(--color-border)',
          fontSize: 11.8,
          color: 'var(--color-muted-foreground)',
          display: 'flex',
          gap: 'var(--spacing-lg)',
          flexWrap: 'wrap',
        }}
      >
        <span>
          Move legality by chess.js (BSD-2-Clause). Analysis by Stockfish 18 (GPL-3.0), running
          locally in your browser.
        </span>
        <span style={{ marginLeft: 'auto' }}>
          Progress is stored only in this browser. Nothing is sent anywhere.
        </span>
      </footer>
    </div>
  )
}

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--color-primary)" />
      <g fill="var(--color-sq-light)">
        <rect x="6" y="6" width="5" height="5" />
        <rect x="16" y="6" width="5" height="5" />
        <rect x="11" y="11" width="5" height="5" />
        <rect x="21" y="11" width="5" height="5" />
        <rect x="6" y="16" width="5" height="5" />
        <rect x="16" y="16" width="5" height="5" />
        <rect x="11" y="21" width="5" height="5" />
        <rect x="21" y="21" width="5" height="5" />
      </g>
    </svg>
  )
}
