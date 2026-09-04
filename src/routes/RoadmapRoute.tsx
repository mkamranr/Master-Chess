import { useMemo } from 'react'
import { CHAPTERS } from '@/curriculum/index'
import { lessonCount } from '@/curriculum/types'
import { Badge, Button, Hint, Panel, Prose } from '@/components/ui/primitives'
import type { Progress } from '@/progress/store'
import { completionRatio, drillAccuracy, dueReviews } from '@/progress/store'

/** The whole path from zero to club player, with the learner's place on it. */
export function RoadmapRoute({
  progress,
  onOpenLesson,
  onReset,
}: {
  progress: Progress
  onOpenLesson: (lessonId: string) => void
  onReset: () => void
}) {
  const total = useMemo(() => lessonCount(CHAPTERS), [])
  const ratio = completionRatio(progress, total)
  const due = dueReviews(progress)

  const nextLesson = useMemo(() => {
    for (const chapter of CHAPTERS) {
      for (const lesson of chapter.lessons) {
        if (!progress.completed.includes(lesson.id)) return { chapter, lesson }
      }
    }
    return null
  }, [progress.completed])

  return (
    <div style={{ display: 'grid', gap: 'var(--spacing-lg)', maxWidth: 1000, margin: '0 auto' }}>
      <Panel title="Your path to club level" subtitle={`${progress.completed.length} of ${total} lessons complete`}>
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
          <div>
            <div
              role="img"
              aria-label={`${Math.round(ratio * 100)} percent complete`}
              style={{
                height: 10,
                borderRadius: 999,
                background: 'var(--color-muted)',
                border: '1px solid var(--color-border-strong)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${ratio * 100}%`,
                  height: '100%',
                  background: 'var(--color-accent)',
                  transition: 'width var(--dur-panel) var(--ease-out)',
                }}
              />
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 12.6, color: 'var(--color-muted-foreground)' }}>
              {Math.round(ratio * 100)}% complete
            </p>
          </div>

          {nextLesson ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="primary" onClick={() => onOpenLesson(nextLesson.lesson.id)}>
                Continue: {nextLesson.lesson.title}
              </Button>
              <span style={{ fontSize: 12.6, color: 'var(--color-muted-foreground)' }}>
                Chapter {nextLesson.chapter.number} · {nextLesson.chapter.title}
              </span>
            </div>
          ) : (
            <Hint tone="good">
              <span>
                Every lesson complete. From here it is volume: tactics drills daily, longer games,
                and a review of every loss.
              </span>
            </Hint>
          )}

          {due.length > 0 ? (
            <Hint tone="warn">
              <span>
                {due.length} {due.length === 1 ? 'topic is' : 'topics are'} due for review:{' '}
                {due.slice(0, 4).map((d) => d.topic).join(', ')}. Spaced repetition is what makes
                tactics stick.
              </span>
            </Hint>
          ) : null}
        </div>
      </Panel>

      <Panel title="Chapters">
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {CHAPTERS.map((chapter) => {
            const done = chapter.lessons.filter((l) => progress.completed.includes(l.id)).length
            const complete = done === chapter.lessons.length
            const firstUnfinished =
              chapter.lessons.find((l) => !progress.completed.includes(l.id)) ?? chapter.lessons[0]!

            return (
              <li
                key={chapter.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-md)',
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-muted)',
                  border: '1px solid var(--color-border)',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    flex: '0 0 auto',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    fontWeight: 700,
                    fontSize: 12.5,
                    background: complete ? 'var(--color-success)' : 'var(--color-card)',
                    color: complete ? 'var(--color-background)' : 'var(--color-muted-foreground)',
                    border: '1px solid var(--color-border-strong)',
                  }}
                >
                  {complete ? '✓' : chapter.number}
                </span>
                <span style={{ flex: 1, minWidth: 200 }}>
                  <strong style={{ fontSize: 14 }}>{chapter.title}</strong>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12.8,
                      color: 'var(--color-muted-foreground)',
                    }}
                  >
                    {chapter.outcome}
                  </span>
                </span>
                <Badge tone={complete ? 'good' : 'neutral'}>
                  {done}/{chapter.lessons.length}
                </Badge>
                <Button onClick={() => onOpenLesson(firstUnfinished.id)}>
                  {complete ? 'Revisit' : done > 0 ? 'Resume' : 'Start'}
                </Button>
              </li>
            )
          })}
        </ol>
      </Panel>

      <Panel title="Drill accuracy" subtitle="Repetition is what makes patterns automatic">
        {Object.keys(progress.drills).length === 0 ? (
          <Prose>
            <p style={{ color: 'var(--color-muted-foreground)' }}>
              No drills attempted yet. The Drill tab has five, and none of them ever run out.
            </p>
          </Prose>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {Object.entries(progress.drills).map(([id, record]) => {
              const accuracy = drillAccuracy(record)
              return (
                <div
                  key={id}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.4 }}
                >
                  <span>{id.replace(/-/g, ' ')}</span>
                  <Badge
                    tone={
                      accuracy === null ? 'neutral' : accuracy > 0.8 ? 'good' : accuracy > 0.5 ? 'warn' : 'bad'
                    }
                  >
                    {accuracy === null ? 'no attempts' : `${Math.round(accuracy * 100)}% of ${record.attempts}`}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      <Panel title="Progress data" subtitle="Stored only in this browser">
        <Prose>
          <p style={{ fontSize: 13.4 }}>
            Everything you have done is saved in this browser's local storage. There is no account
            and nothing is sent anywhere. Clearing your browser data will clear it too.
          </p>
        </Prose>
        <div style={{ marginTop: 'var(--spacing-md)' }}>
          <Button variant="danger" onClick={onReset}>
            Reset all progress
          </Button>
        </div>
      </Panel>
    </div>
  )
}
