import { describe, expect, it, vi } from 'vitest'
import { ChessEngine, type EngineTransport } from './stockfish'

/**
 * A scripted stand-in for the WASM engine. It speaks just enough UCI to
 * exercise the wrapper, which keeps the 7MB engine out of the test run
 * entirely while still covering the handshake, option plumbing and search
 * lifecycle.
 */
function scriptedTransport(script: Record<string, string[]> = {}) {
  const sent: string[] = []
  let handler: ((line: string) => void) | null = null
  let terminated = false

  const emit = (lines: string[]) => {
    for (const line of lines) handler?.(line)
  }

  const transport: EngineTransport = {
    post(command) {
      sent.push(command)
      if (command === 'uci') return emit(['id name Stockfish 18', 'uciok'])
      if (command === 'isready') return emit(['readyok'])
      if (command.startsWith('go')) {
        return emit(
          script.go ?? [
            'info depth 1 multipv 1 score cp 20 pv e2e4',
            'info depth 12 multipv 1 score cp 34 pv e2e4 e7e5 g1f3',
            'bestmove e2e4 ponder e7e5',
          ],
        )
      }
    },
    subscribe(h) {
      handler = h
    },
    terminate() {
      terminated = true
    },
  }

  return { transport, sent, isTerminated: () => terminated }
}

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('ChessEngine handshake', () => {
  it('completes the UCI handshake and reports ready', async () => {
    const { transport, sent } = scriptedTransport()
    const engine = new ChessEngine(() => transport)
    await engine.ready()
    expect(engine.getState()).toBe('ready')
    expect(sent).toContain('uci')
    expect(sent).toContain('isready')
  })

  it('boots only once even when several callers race', async () => {
    const make = vi.fn(() => scriptedTransport().transport)
    const engine = new ChessEngine(make)
    await Promise.all([engine.ready(), engine.ready(), engine.ready()])
    expect(make).toHaveBeenCalledTimes(1)
  })

  it('reports failure when the worker cannot be created', async () => {
    const engine = new ChessEngine(() => {
      throw new Error('no WebAssembly here')
    })
    await expect(engine.ready()).rejects.toThrow('no WebAssembly here')
    expect(engine.getState()).toBe('failed')
  })

  it('emits state transitions for the UI to follow', async () => {
    const { transport } = scriptedTransport()
    const engine = new ChessEngine(() => transport)
    const seen: string[] = []
    engine.onStateChange((s) => seen.push(s))
    await engine.ready()
    await engine.analyse({ fen: START })
    expect(seen).toEqual(['loading', 'ready', 'searching', 'ready'])
  })
})

describe('ChessEngine analysis', () => {
  it('returns the best move and keeps the deepest line', async () => {
    const { transport } = scriptedTransport()
    const engine = new ChessEngine(() => transport)
    const result = await engine.analyse({ fen: START, depth: 12 })

    expect(result.bestMove).toBe('e2e4')
    expect(result.turn).toBe('w')
    expect(result.depth).toBe(12)
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0]?.scoreCp).toBe(34)
    expect(result.lines[0]?.pv).toEqual(['e2e4', 'e7e5', 'g1f3'])
  })

  it('reads the side to move out of the FEN', async () => {
    const { transport } = scriptedTransport()
    const engine = new ChessEngine(() => transport)
    const black = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
    expect((await engine.analyse({ fen: black })).turn).toBe('b')
  })

  it('keeps multiple lines apart by multipv slot', async () => {
    const { transport } = scriptedTransport({
      go: [
        'info depth 10 multipv 1 score cp 30 pv e2e4',
        'info depth 10 multipv 2 score cp 18 pv d2d4',
        'info depth 10 multipv 3 score cp 5 pv g1f3',
        'bestmove e2e4',
      ],
    })
    const engine = new ChessEngine(() => transport)
    const result = await engine.analyse({ fen: START, multiPv: 3 })
    expect(result.lines.map((l) => l.multipv)).toEqual([1, 2, 3])
    expect(result.lines.map((l) => l.pv[0])).toEqual(['e2e4', 'd2d4', 'g1f3'])
  })

  it('handles a position with no legal move', async () => {
    const { transport } = scriptedTransport({ go: ['bestmove (none)'] })
    const engine = new ChessEngine(() => transport)
    const result = await engine.analyse({ fen: START })
    expect(result.bestMove).toBeNull()
    expect(result.lines).toHaveLength(0)
  })

  it('sends MultiPV and the position before searching', async () => {
    const { transport, sent } = scriptedTransport()
    const engine = new ChessEngine(() => transport)
    await engine.analyse({ fen: START, multiPv: 2, depth: 8 })
    expect(sent).toContain('setoption name MultiPV value 2')
    expect(sent).toContain(`position fen ${START}`)
    expect(sent.some((c) => c.startsWith('go depth 8'))).toBe(true)
  })
})

describe('ChessEngine strength', () => {
  it('uses Skill Level for a beginner-level opponent', async () => {
    const { transport, sent } = scriptedTransport()
    const engine = new ChessEngine(() => transport)
    await engine.setStrength(800)
    expect(sent.some((c) => c.startsWith('setoption name Skill Level value'))).toBe(true)
    expect(sent).toContain('setoption name UCI_LimitStrength value false')
  })

  it('uses UCI_Elo for a club-level opponent', async () => {
    const { transport, sent } = scriptedTransport()
    const engine = new ChessEngine(() => transport)
    await engine.setStrength(1600)
    expect(sent).toContain('setoption name UCI_LimitStrength value true')
    expect(sent).toContain('setoption name UCI_Elo value 1600')
  })

  it('exposes the options actually in force', async () => {
    const { transport } = scriptedTransport()
    const engine = new ChessEngine(() => transport)
    await engine.setStrength(null)
    expect(engine.getAppliedOptions()).toEqual([
      { name: 'UCI_LimitStrength', value: 'false' },
    ])
  })
})

describe('ChessEngine teardown', () => {
  it('quits and terminates the worker on dispose', async () => {
    const { transport, sent, isTerminated } = scriptedTransport()
    const engine = new ChessEngine(() => transport)
    await engine.ready()
    engine.dispose()
    expect(sent).toContain('quit')
    expect(isTerminated()).toBe(true)
    expect(engine.getState()).toBe('idle')
  })
})
