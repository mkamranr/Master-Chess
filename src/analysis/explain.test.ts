import { describe, expect, it } from 'vitest'
import { Position } from '@/chess/game'
import { explainMove, explainMovesFrom } from './explain'

const explainSan = (fen: string | undefined, san: string) => {
  const p = fen ? Position.fromFen(fen) : Position.start()
  const move = p.findMoveBySan(san)
  if (!move) throw new Error(`${san} is not legal in ${p.fen()}`)
  return explainMove(p, move)
}

describe('flags and rule citation', () => {
  it('explains a double pawn push from the starting position', () => {
    const e = explainSan(undefined, 'e4')
    expect(e.flags.isDoublePawnPush).toBe(true)
    expect(e.flags.isCapture).toBe(false)
    expect(e.pieceLabel).toBe('Pawn')
    expect(e.rule).toMatch(/forward/i)
    expect(e.staticVerdict).toBe('safe')
  })

  it('identifies kingside castling', () => {
    const e = explainSan('4k3/8/8/8/8/8/8/4K2R w K - 0 1', 'O-O')
    expect(e.flags.isCastle).toBe('kingside')
    expect(e.rule).toMatch(/castl/i)
  })

  it('identifies en passant', () => {
    const e = explainSan('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', 'exd6')
    expect(e.flags.isEnPassant).toBe(true)
    // En passant still wins a pawn even though it is not flagged as a capture.
    expect(e.captureValue).toBe(1)
    expect(e.rule).toMatch(/passing|en passant/i)
  })

  it('identifies promotion', () => {
    const e = explainSan('4k3/P7/8/8/8/8/8/4K3 w - - 0 1', 'a8=Q+')
    expect(e.flags.isPromotion).toBe('q')
    expect(e.flags.isCheck).toBe(true)
    expect(e.rule).toMatch(/promot/i)
  })

  it('identifies checkmate and calls it a win', () => {
    const e = explainSan('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', 'Re8#')
    expect(e.flags.isCheckmate).toBe(true)
    expect(e.staticVerdict).toBe('checkmate')
    expect(e.summary).toMatch(/checkmate/i)
  })
})

describe('material arithmetic', () => {
  it('scores capturing a loose queen as winning nine pawns', () => {
    const e = explainSan('3q4/8/8/8/8/8/8/3RK2k w - - 0 1', 'Rxd8')
    expect(e.captureValue).toBe(9)
    expect(e.netMaterial).toBe(9)
    expect(e.staticVerdict).toBe('wins-material')
  })

  it('scores stepping a knight onto a pawn-guarded square as losing three', () => {
    // Nb5 walks onto a square the c6 pawn covers, with no defender.
    const e = explainSan('4k3/8/2p5/8/8/2N5/8/4K3 w - - 0 1', 'Nb5')
    expect(e.destination.attackedBy).toContain('c6')
    expect(e.destination.defendedBy).toHaveLength(0)
    expect(e.destination.safe).toBe(false)
    expect(e.netMaterial).toBe(-3)
    expect(e.staticVerdict).toBe('loses-material')
  })

  it('does not punish a safe developing move', () => {
    const e = explainSan(undefined, 'Nf3')
    expect(e.netMaterial).toBe(0)
    expect(e.destination.safe).toBe(true)
    expect(e.staticVerdict).toBe('safe')
  })
})

describe('consequences', () => {
  it('reports the threats a fork creates', () => {
    // Nc7 hits the rooks on a8 and e8 at once.
    const e = explainSan('r3r3/8/4N3/8/8/8/8/2K4k w - - 0 1', 'Nc7')
    expect(e.motifs.map((m) => m.kind)).toContain('fork')
    expect(e.createsThreats.map((t) => t.square)).toEqual(
      expect.arrayContaining(['a8', 'e8']),
    )
  })

  it('reports our own pieces left hanging', () => {
    const e = explainSan('4k3/8/2p5/8/8/2N5/8/4K3 w - - 0 1', 'Nb5')
    expect(e.leavesHanging.map((h) => h.square)).toContain('b5')
  })

  it('lists the squares a moving piece stops defending', () => {
    // The rook on e1 defends e4; sliding to a1 gives that up.
    const e = explainSan('4k3/8/8/8/4P3/8/8/4R1K1 w - - 0 1', 'Ra1')
    expect(e.abandons).toContain('e4')
  })

  it('always produces a non-empty, readable summary', () => {
    for (const [fen, san] of [
      [undefined, 'e4'],
      ['3q4/8/8/8/8/8/8/3RK2k w - - 0 1', 'Rxd8'],
      ['4k3/8/2p5/8/8/2N5/8/4K3 w - - 0 1', 'Nb5'],
      ['6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', 'Re8#'],
    ] as const) {
      const e = explainSan(fen, san)
      expect(e.summary.length).toBeGreaterThan(15)
      expect(e.summary).toMatch(/[.!]$/)
    }
  })
})

describe('explainMovesFrom', () => {
  it('explains every legal move for one piece', () => {
    const p = Position.start()
    const results = explainMovesFrom(p, 'g1')
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.san).sort()).toEqual(['Nf3', 'Nh3'])
  })

  it('returns an empty list for a square with no legal moves', () => {
    expect(explainMovesFrom(Position.start(), 'a1')).toHaveLength(0)
  })

  it('sorts the best options first', () => {
    // Rxd8 wins a queen; every other rook move wins nothing.
    const p = Position.fromFen('3q4/8/8/8/8/8/8/3RK2k w - - 0 1')
    const results = explainMovesFrom(p, 'd1')
    expect(results[0]?.san).toBe('Rxd8')
  })
})
