import { describe, expect, it } from 'vitest'
import { Position } from '@/chess/game'
import { ChessEngine, type EngineTransport } from '@/engine/stockfish'
import {
  buildEngineChain,
  buildStaticChain,
  chainOutcomeLabel,
  extendStaticChain,
  likelyReply,
} from './consequences'

// 1.e4 e5 2.Nf3 Nc6 — the classic position where Nxe5 just loses a knight.
const NXE5 = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1'
const NB5 = '4k3/8/2p5/8/8/2N5/8/4K3 w - - 0 1'

const chainFor = (fen: string, san: string, plies?: number) => {
  const p = Position.fromFen(fen)
  const move = p.findMoveBySan(san)
  if (!move) throw new Error(`${san} not legal in ${fen}`)
  return buildStaticChain(p, move, plies)
}

describe('likelyReply', () => {
  it('picks the recapture when a piece has just been grabbed', () => {
    const p = Position.fromFen(NXE5)
    const after = p.after(p.findMoveBySan('Nxe5')!)
    expect(likelyReply(after)?.san).toBe('Nxe5')
  })

  it('returns null in a finished position', () => {
    // Black is checkmated, so there is nothing to reply with.
    const mated = Position.fromFen('4R1k1/5ppp/8/8/8/8/8/6K1 b - - 0 1')
    expect(mated.status().isCheckmate).toBe(true)
    expect(likelyReply(mated)).toBeNull()
  })
})

describe('buildStaticChain', () => {
  it('shows that Nxe5 wins a pawn but loses the knight', () => {
    const chain = chainFor(NXE5, 'Nxe5')
    expect(chain.source).toBe('static')
    expect(chain.steps).toHaveLength(2)
    expect(chain.steps[0]?.san).toBe('Nxe5')
    expect(chain.steps[0]?.side).toBe('you')
    expect(chain.steps[1]?.san).toBe('Nxe5')
    expect(chain.steps[1]?.side).toBe('opponent')
    // Won a pawn, lost a knight: two pawns down overall.
    expect(chain.netMaterial).toBe(-2)
  })

  it('phrases the outcome as a readable if-then sentence', () => {
    const chain = chainFor(NXE5, 'Nxe5')
    expect(chain.narrative).toMatch(/^If you play Nxe5/)
    // A statically predicted reply is hedged, since it is our heuristic
    // guessing rather than the engine reporting.
    expect(chain.narrative).toMatch(/then Black would probably play Nxe5/)
    expect(chain.narrative).toMatch(/2 pawns down/)
  })

  it('shows a knight walking into a pawn as simply losing it', () => {
    const chain = chainFor(NB5, 'Nb5')
    expect(chain.steps[1]?.san).toBe('cxb5')
    expect(chain.netMaterial).toBe(-3)
    expect(chainOutcomeLabel(chain)).toBe('−3')
  })

  it('tracks material from the learner’s point of view when Black moves', () => {
    // Black to move; Black grabs a free white rook on h1, which also happens
    // to give check along the first rank — hence the '+' in the SAN.
    const p = Position.fromFen('4k3/8/8/8/8/8/7q/4K2R b - - 0 1')
    const move = p.findMoveBySan('Qxh1+')!
    expect(move).not.toBeNull()
    const chain = buildStaticChain(p, move, 1)
    expect(chain.learner).toBe('b')
    expect(chain.netMaterial).toBe(5)
    expect(chainOutcomeLabel(chain)).toBe('+5')
  })

  it('stops the chain when the game ends', () => {
    const chain = chainFor('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', 'Re8#', 4)
    expect(chain.steps).toHaveLength(1)
    expect(chain.steps[0]?.isCheckmate).toBe(true)
    expect(chain.canExtend).toBe(false)
    expect(chain.narrative).toMatch(/checkmate/)
    expect(chain.narrative).toMatch(/you win the game/)
    expect(chainOutcomeLabel(chain)).toBe('You win')
  })

  it('marks a check in the narrative', () => {
    const chain = chainFor('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'a8=Q+', 1)
    expect(chain.narrative).toMatch(/with check/)
  })

  it('gives each step a row label that does not repeat the move', () => {
    const chain = chainFor(NXE5, 'Nxe5')
    for (const step of chain.steps) {
      expect(step.rowLabel.length).toBeGreaterThan(3)
      expect(step.rowLabel).not.toContain(step.san)
    }
    expect(chain.steps[0]?.rowLabel).toBe('your move')
    expect(chain.steps[1]?.rowLabel).toMatch(/would probably reply/)
  })

  it('honours the requested chain length', () => {
    expect(chainFor(NXE5, 'Nxe5', 4).steps.length).toBeLessThanOrEqual(4)
    expect(chainFor(NXE5, 'Nxe5', 1).steps).toHaveLength(1)
  })
})

describe('extendStaticChain', () => {
  it('adds one more move to the line', () => {
    const chain = chainFor(NXE5, 'Nxe5', 2)
    const longer = extendStaticChain(chain)
    expect(longer.steps).toHaveLength(3)
    expect(longer.steps[2]?.side).toBe('you')
    expect(longer.narrative.length).toBeGreaterThan(chain.narrative.length)
  })

  it('is a no-op once the game has ended', () => {
    const mate = chainFor('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', 'Re8#', 1)
    const extended = extendStaticChain(mate)
    expect(extended.steps).toHaveLength(1)
    expect(extended.canExtend).toBe(false)
  })
})

describe('buildEngineChain', () => {
  function engineWithPv(pv: string[], scoreCp = 300) {
    const transport: EngineTransport = {
      post(command) {
        if (command === 'uci') return emit(['uciok'])
        if (command === 'isready') return emit(['readyok'])
        if (command.startsWith('go')) {
          return emit([
            `info depth 12 multipv 1 score cp ${scoreCp} pv ${pv.join(' ')}`,
            `bestmove ${pv[0] ?? '(none)'}`,
          ])
        }
      },
      subscribe(h) {
        handler = h
      },
      terminate() {},
    }
    let handler: ((line: string) => void) | null = null
    const emit = (lines: string[]) => lines.forEach((l) => handler?.(l))
    return new ChessEngine(() => transport)
  }

  it('walks the engine’s principal variation into steps', async () => {
    // After Nxe5 the engine says Nxe5 (recapture), then d2d4.
    const engine = engineWithPv(['c6e5', 'd2d4'])
    const p = Position.fromFen(NXE5)
    const chain = await buildEngineChain(engine, p, p.findMoveBySan('Nxe5')!, 4)

    expect(chain.source).toBe('engine')
    expect(chain.steps.map((s) => s.san)).toEqual(['Nxe5', 'Nxe5', 'd4'])
    expect(chain.netMaterial).toBe(-2)
  })

  it('flips the engine score into the learner’s point of view', async () => {
    // +300 for the side to move after our move — that side is the opponent,
    // so from the learner's seat it must read as −300.
    const engine = engineWithPv(['c6e5'], 300)
    const p = Position.fromFen(NXE5)
    const chain = await buildEngineChain(engine, p, p.findMoveBySan('Nxe5')!, 2)
    expect(chain.steps[0]?.evalAfter).toBe(-300)
  })

  it('stops cleanly if the principal variation cannot be followed', async () => {
    const engine = engineWithPv(['a1a8']) // not a legal move here
    const p = Position.fromFen(NXE5)
    const chain = await buildEngineChain(engine, p, p.findMoveBySan('Nxe5')!, 4)
    expect(chain.steps).toHaveLength(1)
  })
})

describe('predicted replies are plausible', () => {
  it('predicts a central reply rather than an arbitrary one', () => {
    // With no captures available every move is worth zero on material alone,
    // so an alphabetical tiebreak used to predict absurdities like Na6 in the
    // opening. A small centrality term keeps the guess believable.
    const afterE4 = Position.fromFen(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    )
    const reply = likelyReply(afterE4)
    expect(['e5', 'd5']).toContain(reply?.san)
  })

  it('does not send a knight to the rim when the centre is available', () => {
    const afterE4 = Position.fromFen(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    )
    expect(likelyReply(afterE4)?.san).not.toBe('Na6')
    expect(likelyReply(afterE4)?.san).not.toBe('Nh6')
  })

  it('still prefers a capture over any positional consideration', () => {
    const p = Position.fromFen(NXE5)
    const after = p.after(p.findMoveBySan('Nxe5')!)
    expect(likelyReply(after)?.san).toBe('Nxe5')
  })

  it('words a predicted reply as a prediction, not a fact', () => {
    const chain = chainFor(NXE5, 'd4')
    expect(chain.source).toBe('static')
    expect(chain.narrative).toMatch(/would probably play/)
  })

  it('states an engine reply as what it is', async () => {
    const transport = {
      post(command: string) {
        if (command === 'uci') return emit(['uciok'])
        if (command === 'isready') return emit(['readyok'])
        if (command.startsWith('go')) return emit(['info depth 8 score cp 10 pv c6e5', 'bestmove c6e5'])
      },
      subscribe(h: (line: string) => void) {
        handler = h
      },
      terminate() {},
    }
    let handler: ((line: string) => void) | null = null
    const emit = (lines: string[]) => lines.forEach((l) => handler?.(l))

    const engine = new ChessEngine(() => transport)
    const p = Position.fromFen(NXE5)
    const chain = await buildEngineChain(engine, p, p.findMoveBySan('Nxe5')!, 2)
    expect(chain.narrative).toMatch(/then Black plays/)
    expect(chain.narrative).not.toMatch(/would probably/)
  })
})
