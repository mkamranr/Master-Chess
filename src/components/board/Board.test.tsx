// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Position } from '@/chess/game'
import { Board } from './Board'

/**
 * WCAG 2.2 requires a single-pointer alternative to any drag operation, so
 * every one of the three input paths is covered here as a first-class
 * requirement — not just the drag one.
 */

const cell = (square: string) =>
  document.querySelector<HTMLElement>(`[data-square="${square}"]`)!

afterEach(() => {
  vi.restoreAllMocks()
})

describe('click-then-click moves', () => {
  it('moves a pawn with two clicks and no dragging at all', () => {
    const onMove = vi.fn()
    render(<Board position={Position.start()} onMove={onMove} />)

    fireEvent.click(cell('e2'))
    fireEvent.click(cell('e4'))

    expect(onMove).toHaveBeenCalledWith('e2', 'e4')
  })

  it('deselects when the same square is clicked twice', () => {
    const onSelectSquare = vi.fn()
    render(<Board position={Position.start()} onSelectSquare={onSelectSquare} />)

    fireEvent.click(cell('e2'))
    fireEvent.click(cell('e2'))

    expect(onSelectSquare).toHaveBeenLastCalledWith(null)
  })

  it('does not fire a move for an illegal destination', () => {
    const onMove = vi.fn()
    render(<Board position={Position.start()} onMove={onMove} />)

    fireEvent.click(cell('e2'))
    fireEvent.click(cell('e5')) // three squares: not legal

    expect(onMove).not.toHaveBeenCalled()
  })

  it('refuses to pick up the side that is not to move', () => {
    const onMove = vi.fn()
    render(<Board position={Position.start()} onMove={onMove} />)

    fireEvent.click(cell('e7')) // a black pawn, but it is White's turn
    fireEvent.click(cell('e5'))

    expect(onMove).not.toHaveBeenCalled()
  })
})

describe('keyboard moves', () => {
  it('completes a move using only the keyboard', () => {
    const onMove = vi.fn()
    render(<Board position={Position.start()} onMove={onMove} />)

    // The cursor starts on e1 for White's orientation.
    const grid = screen.getByRole('grid')
    fireEvent.keyDown(grid, { key: 'ArrowUp' }) // e2
    fireEvent.keyDown(grid, { key: 'Enter' }) // pick the pawn up
    fireEvent.keyDown(grid, { key: 'ArrowUp' }) // e3
    fireEvent.keyDown(grid, { key: 'ArrowUp' }) // e4
    fireEvent.keyDown(grid, { key: 'Enter' }) // put it down

    expect(onMove).toHaveBeenCalledWith('e2', 'e4')
  })

  it('cancels a selection with Escape', () => {
    const onSelectSquare = vi.fn()
    render(<Board position={Position.start()} onSelectSquare={onSelectSquare} />)

    const grid = screen.getByRole('grid')
    fireEvent.keyDown(grid, { key: 'ArrowUp' })
    fireEvent.keyDown(grid, { key: 'Enter' })
    fireEvent.keyDown(grid, { key: 'Escape' })

    expect(onSelectSquare).toHaveBeenLastCalledWith(null)
  })

  it('moves the cursor the way the screen looks when the board is flipped', () => {
    render(<Board position={Position.start()} orientation="b" />)
    const grid = screen.getByRole('grid')
    // Flipped, the cursor starts on e8; pressing Up must go toward the top of
    // the screen, which for Black is e7.
    fireEvent.keyDown(grid, { key: 'ArrowUp' })
    expect(cell('e7').tabIndex).toBe(0)
  })

  it('keeps exactly one square in the tab order', () => {
    render(<Board position={Position.start()} />)
    const focusable = document.querySelectorAll('[data-square][tabindex="0"]')
    expect(focusable).toHaveLength(1)
  })
})

describe('drag and drop moves', () => {
  it('completes a move by dragging', () => {
    const onMove = vi.fn()
    render(<Board position={Position.start()} onMove={onMove} />)

    // jsdom has no layout, so point-to-element resolution is stubbed.
    vi.spyOn(document, 'elementFromPoint').mockImplementation(() => cell('e4'))

    fireEvent.pointerDown(cell('e2'), { button: 0, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 10, clientY: 10 })
    fireEvent.pointerUp(window, { clientX: 10, clientY: 10 })

    expect(onMove).toHaveBeenCalledWith('e2', 'e4')
  })

  it('drops harmlessly when released off the board', () => {
    const onMove = vi.fn()
    render(<Board position={Position.start()} onMove={onMove} />)
    vi.spyOn(document, 'elementFromPoint').mockImplementation(() => document.body)

    fireEvent.pointerDown(cell('e2'), { button: 0, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 0, clientY: 0 })

    expect(onMove).not.toHaveBeenCalled()
  })
})

describe('promotion', () => {
  it('asks what the pawn becomes instead of assuming a queen', () => {
    const onMove = vi.fn()
    const position = Position.fromFen('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
    render(<Board position={position} onMove={onMove} />)

    fireEvent.click(cell('a7'))
    fireEvent.click(cell('a8'))

    // Nothing is committed until a piece is chosen.
    expect(onMove).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()

    fireEvent.click(within(dialog).getByLabelText('White knight'))
    expect(onMove).toHaveBeenCalledWith('a7', 'a8', 'n')
  })
})

describe('accessibility', () => {
  it('labels every square with its name, colour and contents', () => {
    render(<Board position={Position.start()} />)
    // e1 is a dark square: d1 is light (the white queen starts on her own
    // colour), so the king beside her stands on a dark one.
    expect(cell('e1').getAttribute('aria-label')).toBe('E 1, dark square, White king')
    expect(cell('a1').getAttribute('aria-label')).toBe('A 1, dark square, White rook')
    expect(cell('e4').getAttribute('aria-label')).toBe('E 4, light square, empty')
  })

  it('announces which squares a selected piece can reach', () => {
    render(<Board position={Position.start()} />)
    fireEvent.click(cell('e2'))
    expect(cell('e4').getAttribute('aria-label')).toContain('can move here')
  })

  it('announces a capture as a capture', () => {
    // Black knight on d5 can be taken by the white pawn on e4.
    const position = Position.fromFen('4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1')
    render(<Board position={position} />)
    fireEvent.click(cell('e4'))
    expect(cell('d5').getAttribute('aria-label')).toContain('can capture here')
  })

  it('renders 64 grid cells', () => {
    render(<Board position={Position.start()} />)
    expect(document.querySelectorAll('[role="gridcell"]')).toHaveLength(64)
  })

  it('announces check in a live region', () => {
    const position = Position.fromFen('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1')
    render(<Board position={position} />)
    expect(screen.getByText(/White is in check/)).toBeTruthy()
  })

  it('exposes the side to move on the grid label', () => {
    render(<Board position={Position.start()} />)
    expect(screen.getByRole('grid').getAttribute('aria-label')).toContain('White to move')
  })
})

describe('read-only boards', () => {
  it('ignores interaction entirely', () => {
    const onMove = vi.fn()
    render(<Board position={Position.start()} onMove={onMove} readOnly />)
    fireEvent.click(cell('e2'))
    fireEvent.click(cell('e4'))
    expect(onMove).not.toHaveBeenCalled()
  })
})
