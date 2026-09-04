import { useState } from 'react'
import type { Chapter } from '@/curriculum/types'
import { Panel } from '@/components/ui/primitives'

/** The book's table of contents, with progress. */
export function ChapterNav({
  chapters,
  currentLessonId,
  completed,
  onSelect,
}: {
  chapters: Chapter[]
  currentLessonId: string
  completed: string[]
  onSelect: (lessonId: string) => void
}) {
  const currentChapter = chapters.find((c) => c.lessons.some((l) => l.id === currentLessonId))
  const [open, setOpen] = useState<string | null>(currentChapter?.id ?? chapters[0]?.id ?? null)

  return (
    <Panel title="Course" subtitle={`${chapters.length} chapters`} padded={false}>
      <nav aria-label="Course contents" style={{ padding: 'var(--spacing-sm)' }}>
        {chapters.map((chapter) => {
          const done = chapter.lessons.filter((l) => completed.includes(l.id)).length
          const isOpen = open === chapter.id
          const isCurrent = chapter.id === currentChapter?.id

          return (
            <div key={chapter.id} style={{ marginBottom: 2 }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : chapter.id)}
                aria-expanded={isOpen}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  minHeight: 40,
                  textAlign: 'left',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: isCurrent ? 'var(--color-muted)' : 'transparent',
                  color: 'var(--color-foreground)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13.2,
                  fontWeight: isCurrent ? 600 : 500,
                  transition: 'background var(--dur-hover) var(--ease-out)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 20,
                    height: 20,
                    flex: '0 0 auto',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    fontSize: 11,
                    fontWeight: 700,
                    background:
                      done === chapter.lessons.length
                        ? 'var(--color-success)'
                        : 'var(--color-muted)',
                    color:
                      done === chapter.lessons.length
                        ? 'var(--color-background)'
                        : 'var(--color-muted-foreground)',
                    border: '1px solid var(--color-border-strong)',
                  }}
                >
                  {done === chapter.lessons.length ? '✓' : chapter.number}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{chapter.title}</span>
                <span style={{ fontSize: 11, color: 'var(--color-muted-foreground)' }}>
                  {done}/{chapter.lessons.length}
                </span>
              </button>

              {isOpen ? (
                <ul style={{ listStyle: 'none', margin: '2px 0 6px', padding: '0 0 0 28px' }}>
                  {chapter.lessons.map((lesson) => {
                    const isActive = lesson.id === currentLessonId
                    const isDone = completed.includes(lesson.id)
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(lesson.id)}
                          aria-current={isActive ? 'page' : undefined}
                          style={{
                            display: 'flex',
                            width: '100%',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 8px',
                            minHeight: 34,
                            textAlign: 'left',
                            border: 'none',
                            borderLeft: `2px solid ${isActive ? 'var(--color-accent)' : 'transparent'}`,
                            background: 'transparent',
                            color: isActive
                              ? 'var(--color-foreground)'
                              : 'var(--color-muted-foreground)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 12.6,
                            fontWeight: isActive ? 600 : 400,
                            transition: 'color var(--dur-hover) var(--ease-out)',
                          }}
                        >
                          <span aria-hidden="true" style={{ opacity: isDone ? 1 : 0.25 }}>
                            {isDone ? '✓' : '·'}
                          </span>
                          <span>{lesson.title}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </div>
          )
        })}
      </nav>
    </Panel>
  )
}
