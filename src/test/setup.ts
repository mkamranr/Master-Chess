import { afterEach } from 'vitest'

/**
 * Shared test setup.
 *
 * Most suites here are pure logic and run in the `node` environment, so every
 * DOM-touching step below is guarded. Only the suites that declare
 * `@vitest-environment jsdom` get a document at all.
 */
const hasDom = typeof globalThis.document !== 'undefined'

if (hasDom) {
  /**
   * Testing Library only registers its own automatic cleanup when Vitest runs
   * with `globals: true`. We import test helpers explicitly instead, so cleanup
   * has to be wired up by hand — without it every render accumulates in the
   * same document and `document.querySelector` starts resolving to the *first*
   * test's board instead of the current one.
   */
  const { cleanup } = await import('@testing-library/react')
  afterEach(() => {
    cleanup()
  })

  /**
   * jsdom implements no layout, so `document.elementFromPoint` does not exist
   * there at all. The board uses it to resolve a drag release back to a square.
   * Defining a null-returning stub gives tests something to spy on, and means a
   * test that forgets to stub it sees "dropped outside the board" rather than a
   * crash.
   */
  if (!document.elementFromPoint) {
    document.elementFromPoint = () => null
  }

  /**
   * jsdom 26 ships no `PointerEvent` constructor, so Testing Library silently
   * degrades pointer events to plain `Event`s and drops `button`, `pointerId`
   * and the client coordinates. That makes drag tests pass or fail for reasons
   * that have nothing to do with the board, so a minimal spec-shaped shim is
   * installed here instead.
   */
  if (typeof globalThis.PointerEvent === 'undefined') {
    class PointerEventShim extends MouseEvent {
      readonly pointerId: number
      readonly pointerType: string
      readonly isPrimary: boolean

      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params)
        this.pointerId = params.pointerId ?? 0
        this.pointerType = params.pointerType ?? 'mouse'
        this.isPrimary = params.isPrimary ?? true
      }
    }
    globalThis.PointerEvent = PointerEventShim as unknown as typeof PointerEvent
  }

  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
    Element.prototype.setPointerCapture = () => {}
    Element.prototype.hasPointerCapture = () => false
  }
}
