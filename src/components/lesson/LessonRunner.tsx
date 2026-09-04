import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PieceSymbol, Square } from '@/chess/game'
import { Position } from '@/chess/game'
import { moveSatisfies, describeAcceptance } from '@/curriculum/acceptance'
import type { DoLesson, Lesson, PuzzleLesson } from '@/curriculum/types'
import { Badge, Button, Hint, Prose } from '@/components/ui/primitives'

/* ---------------------------------------------------------------------------
 * Running one lesson.
 *
 * Holds the position the learner is working in, judges their moves against the
 * lesson's acceptance rule, and reveals hints one at a time on request. Hints
 * are never forced: a learner who wants to struggle should be allowed to.
 * ------------------------------------------------------------------------ */

export type LessonState = 'reading' | 'trying' | 'wrong' | 'solved'

export interface LessonSession {
  position: Position
  state: LessonState
  /** How far through a puzzle line the learner has got. */
  ply: number
  hintsShown: number
  lastMoveSquares: { from: Square; to: Square } | null
  attempts: number
}

export function useLessonSession(lesson: Lesson) {
  const [session, setSession] = useState<LessonSession>(() => initial(lesson))

  // Restart cleanly whenever the lesson changes.
  useEffect(() => {
    setSession(initial(lesson))
  }, [lesson])

  const reset = useCallback(() => setSession(initial(lesson)), [lesson])

  const showHint = useCallback(() => {
    setSession((s) => ({ ...s, hintsShown: s.hintsShown + 1 }))
  }, [])

  const attempt = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      setSession((current) => {
        if (current.state === 'solved') return current
        const move = current.position.findMove(from, to, promotion)
        if (!move) return current

        const attempts = current.attempts + 1
        const lastMoveSquares = { from, to }

        if (lesson.kind === 'do') {
          const ok = moveSatisfies(current.position, move, lesson.accept)
          return {
            ...current,
            position: ok ? current.position.after(move) : current.position,
            state: ok ? 'solved' : 'wrong',
            attempts,
            lastMoveSquares: ok ? lastMoveSquares : current.lastMoveSquares,
          }
        }

        if (lesson.kind === 'puzzle') {
          const expected = lesson.line[current.ply]
          if (move.san !== expected) {
            return { ...current, state: 'wrong', attempts }
          }
          // Correct: play it, then play the scripted reply for the opponent.
          let position = current.position.after(move)
          let ply = current.ply + 1
          const reply = lesson.line[ply]
          if (reply) {
            const replyMove = position.findMoveBySan(reply)
            if (replyMove) {
              position = position.after(replyMove)
              ply += 1
            }
          }
          return {
            ...current,
            position,
            ply,
            attempts,
            lastMoveSquares,
            state: ply >= lesson.line.length ? 'solved' : 'trying',
          }
        }

        // Explain and drill lessons let the learner move freely to explore.
        return {
          ...current,
          position: current.position.after(move),
          attempts,
          lastMoveSquares,
          state: 'trying',
        }
      })
    },
    [lesson],
  )

  return { session, attempt, reset, showHint }
}

function initial(lesson: Lesson): LessonSession {
  return {
    position: Position.fromFen(lesson.fen),
    state: lesson.kind === 'explain' ? 'reading' : 'trying',
    ply: 0,
    hintsShown: 0,
    lastMoveSquares: null,
    attempts: 0,
  }
}

/* ------------------------------------------------------------------------ */

/** Very light markdown: **bold** only, which is all the lesson text uses. */
export function LessonText({ paragraphs }: { paragraphs: string[] }) {
  return (
    <Prose>
      {paragraphs.map((paragraph, index) => (
        <p key={index} style={{ marginTop: index === 0 ? 0 : 10, marginBottom: 0 }}>
          {renderBold(paragraph)}
        </p>
      ))}
    </Prose>
  )
}

function renderBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, index) =>
    chunk.startsWith('**') && chunk.endsWith('**') ? (
      <strong key={index}>{chunk.slice(2, -2)}</strong>
    ) : (
      <span key={index}>{chunk}</span>
    ),
  )
}

export function ObjectiveBar({
  lesson,
  session,
  onShowHint,
  onReset,
  onNext,
}: {
  lesson: Lesson
  session: LessonSession
  onShowHint: () => void
  onReset: () => void
  onNext?: () => void
}) {
  const objective = useMemo(() => {
    if (lesson.kind === 'do') return lesson.objective
    if (lesson.kind === 'puzzle') return lesson.objective
    if (lesson.kind === 'drill') return lesson.objective
    return 'Read through, and move pieces freely to explore.'
  }, [lesson])

  const hints = lesson.hints ?? []
  const hasMoreHints = session.hintsShown < hints.length
  const solved = session.state === 'solved'

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          flexWrap: 'wrap',
        }}
      >
        <Badge tone={solved ? 'good' : 'accent'} icon={<span aria-hidden>{solved ? '✓' : '→'}</span>}>
          {solved ? 'Solved' : 'Your task'}
        </Badge>
        <span style={{ fontSize: 13.8, fontWeight: 500 }}>{objective}</span>
      </div>

      {lesson.kind === 'puzzle' && !solved ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted-foreground)' }}>
          Move {Math.floor(session.ply / 2) + 1} of {Math.ceil(lesson.line.length / 2)} — next in
          the line:{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            {lesson.line[session.ply]}
          </code>
        </p>
      ) : null}

      {session.state === 'wrong' ? (
        <Hint tone="warn">
          <span>{retryTextFor(lesson) ?? 'Not quite. Try a different move.'}</span>
        </Hint>
      ) : null}

      {solved ? (
        <Hint tone="good">
          <span>{successTextFor(lesson) ?? 'Correct.'}</span>
        </Hint>
      ) : null}

      {session.hintsShown > 0 ? (
        <div style={{ display: 'grid', gap: 6 }}>
          {hints.slice(0, session.hintsShown).map((hint, index) => (
            <Hint key={index}>
              <span>
                <strong>Hint {index + 1}: </strong>
                {hint}
              </span>
            </Hint>
          ))}
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        {hasMoreHints ? (
          <Button onClick={onShowHint}>
            {session.hintsShown === 0 ? 'Show a hint' : 'Another hint'}
          </Button>
        ) : null}
        <Button onClick={onReset} variant="ghost">
          Reset position
        </Button>
        {solved && onNext ? (
          <Button onClick={onNext} variant="primary">
            Next lesson →
          </Button>
        ) : null}
        {!solved && lesson.kind !== 'explain' ? (
          <span
            style={{
              fontSize: 12.5,
              color: 'var(--color-muted-foreground)',
              alignSelf: 'center',
            }}
          >
            {lesson.kind === 'do' ? describeAcceptance((lesson as DoLesson).accept) : ''}
          </span>
        ) : null}
        {lesson.kind === 'explain' && onNext ? (
          <Button onClick={onNext} variant="primary">
            Next lesson →
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function retryTextFor(lesson: Lesson): string | undefined {
  if (lesson.kind === 'do') return (lesson as DoLesson).retryText
  if (lesson.kind === 'puzzle') return (lesson as PuzzleLesson).retryText
  return undefined
}

function successTextFor(lesson: Lesson): string | undefined {
  if (lesson.kind === 'do') return (lesson as DoLesson).successText
  if (lesson.kind === 'puzzle') return (lesson as PuzzleLesson).successText
  return undefined
}
