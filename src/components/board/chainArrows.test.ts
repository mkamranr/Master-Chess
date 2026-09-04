import { describe, expect, it } from 'vitest'
import { nextArrows, sameArrows, toBoardArrows } from './chainArrows'

describe('toBoardArrows', () => {
  it('numbers arrows and dashes everything after the first', () => {
    expect(toBoardArrows([{ from: 'e2', to: 'e4' }, { from: 'd7', to: 'd5' }])).toEqual([
      { from: 'e2', to: 'e4', label: '1', dashed: false },
      { from: 'd7', to: 'd5', label: '2', dashed: true },
    ])
  })

  it('handles an empty chain', () => {
    expect(toBoardArrows([])).toEqual([])
  })

  it('is deterministic', () => {
    const steps = [{ from: 'a1', to: 'a8' }]
    expect(toBoardArrows(steps)).toEqual(toBoardArrows(steps))
  })
})

describe('sameArrows', () => {
  it('treats structurally equal lists as equal', () => {
    const steps = [{ from: 'e2', to: 'e4' }]
    expect(sameArrows(toBoardArrows(steps), toBoardArrows(steps))).toBe(true)
  })

  it('notices a different destination', () => {
    expect(
      sameArrows(toBoardArrows([{ from: 'e2', to: 'e4' }]), toBoardArrows([{ from: 'e2', to: 'e3' }])),
    ).toBe(false)
  })

  it('notices a different length', () => {
    expect(sameArrows(toBoardArrows([{ from: 'e2', to: 'e4' }]), [])).toBe(false)
  })

  it('treats two empty lists as equal', () => {
    expect(sameArrows([], [])).toBe(true)
  })
})

describe('nextArrows', () => {
  /**
   * These are the loop guard. Returning the identical array reference is what
   * stops React re-rendering, and therefore what prevents the render loop that
   * "Maximum update depth exceeded" was reporting.
   */
  it('returns the SAME reference when nothing changed', () => {
    const current = toBoardArrows([{ from: 'e2', to: 'e4' }])
    expect(nextArrows(current, [{ from: 'e2', to: 'e4' }])).toBe(current)
  })

  it('returns the same reference for an unchanged empty list', () => {
    const current = toBoardArrows([])
    expect(nextArrows(current, [])).toBe(current)
  })

  it('returns a new list when the chain really changed', () => {
    const current = toBoardArrows([{ from: 'e2', to: 'e4' }])
    const next = nextArrows(current, [{ from: 'e2', to: 'e4' }, { from: 'd7', to: 'd5' }])
    expect(next).not.toBe(current)
    expect(next).toHaveLength(2)
  })

  it('stays stable across repeated identical updates', () => {
    let arrows = toBoardArrows([])
    const steps = [{ from: 'e2', to: 'e4' }, { from: 'd7', to: 'd5' }]
    arrows = nextArrows(arrows, steps)
    const afterFirst = arrows
    for (let i = 0; i < 25; i++) arrows = nextArrows(arrows, steps)
    expect(arrows).toBe(afterFirst)
  })
})
