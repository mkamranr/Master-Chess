// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LearnRoute } from './LearnRoute'

/**
 * Regression cover for a render loop found by running the app.
 *
 * The coach panel reports its if-then arrows upward through a callback. That
 * callback used to be an inline arrow function, so its identity changed on
 * every render; the panel's effect depends on it, so the effect re-fired, set
 * state, and re-rendered — forever. React reported it as "Maximum update depth
 * exceeded" roughly twice a second, and nothing in the unit suite noticed
 * because the loop only exists once the components are wired together.
 */

const noop = () => {}

function renderLesson(lessonId: string) {
  const errors: unknown[] = []
  const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(args[0])
  })
  const view = render(
    <LearnRoute
      lessonId={lessonId}
      onLessonChange={noop}
      completed={[]}
      onComplete={noop}
      engine={null}
      engineReady={false}
    />,
  )
  return { view, errors, spy }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('LearnRoute if-then wiring', () => {
  it('settles instead of looping when a move is previewed', () => {
    // "Take what is free": a rook and a loose queen, so the chain is non-empty.
    const { errors } = renderLesson('vision-take-the-free-piece')

    // Select the rook, open the Moves list, and preview the best move — the
    // exact sequence that used to start the loop.
    fireEvent.click(document.querySelector('[data-square="d1"]')!)
    fireEvent.click(screen.getByRole('tab', { name: 'Moves' }))
    fireEvent.click(screen.getByRole('button', { name: /Rxd5/ }))

    const loopErrors = errors.filter(
      (e) => typeof e === 'string' && e.includes('Maximum update depth'),
    )
    expect(loopErrors).toEqual([])
  })

  it('shows the chain it computed for that move', () => {
    renderLesson('vision-take-the-free-piece')
    fireEvent.click(document.querySelector('[data-square="d1"]')!)
    fireEvent.click(screen.getByRole('tab', { name: 'Moves' }))
    fireEvent.click(screen.getByRole('button', { name: /Rxd5/ }))

    // Previewing switches to the If-Then tab and narrates the consequence.
    expect(screen.getByText(/If you play Rxd5/)).toBeTruthy()
    expect(screen.getByText(/9 pawns ahead/)).toBeTruthy()
  })

  it('renders a reading lesson without looping either', () => {
    const { errors } = renderLesson('board-grid')
    const loopErrors = errors.filter(
      (e) => typeof e === 'string' && e.includes('Maximum update depth'),
    )
    expect(loopErrors).toEqual([])
    // The title appears both in the panel heading and in the chapter nav.
    expect(screen.getByRole('heading', { name: 'Sixty-four squares' })).toBeTruthy()
  })

  it('clears the chain without looping when the preview goes away', () => {
    const { errors } = renderLesson('vision-take-the-free-piece')
    fireEvent.click(document.querySelector('[data-square="d1"]')!)
    fireEvent.click(screen.getByRole('tab', { name: 'Moves' }))
    fireEvent.click(screen.getByRole('button', { name: /Rxd5/ }))
    // Playing the move on the board drops the preview, which reports an empty
    // arrow list — the other half of the loop.
    fireEvent.click(document.querySelector('[data-square="d1"]')!)
    fireEvent.click(document.querySelector('[data-square="d5"]')!)

    const loopErrors = errors.filter(
      (e) => typeof e === 'string' && e.includes('Maximum update depth'),
    )
    expect(loopErrors).toEqual([])
  })
})
