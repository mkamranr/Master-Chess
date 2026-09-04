import { describe, expect, it } from 'vitest'
import { Position } from '@/chess/game'
import { detectMotifs, findPinsAndSkewers, motifsCreatedBy } from './motifs'

const kinds = (ms: { kind: string }[]) => ms.map((m) => m.kind)

describe('fork', () => {
  it('detects a knight forking the king and a rook', () => {
    // White knight c7 hits the black king on e8 and the rook on a8.
    const p = Position.fromFen('r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1')
    const fork = detectMotifs(p, 'w').find((m) => m.kind === 'fork')
    expect(fork).toBeDefined()
    expect(fork?.by).toBe('c7')
    expect(fork?.targets).toEqual(expect.arrayContaining(['a8', 'e8']))
  })

  it('detects a fork of two rooks with no check involved', () => {
    const p = Position.fromFen('r3r3/2N5/8/8/8/8/8/4K2k b - - 0 1')
    const fork = detectMotifs(p, 'w').find((m) => m.kind === 'fork')
    expect(fork).toBeDefined()
    expect(fork?.targets).toEqual(expect.arrayContaining(['a8', 'e8']))
  })

  it('does not call a queen attacking two defended pawns a fork', () => {
    // Queen d5 attacks the pawns on d7 and e6, but both are defended and both
    // are worth less than she is, so there is nothing to win.
    const p = Position.fromFen('4k3/3p4/4p3/3Q4/8/8/8/4K3 b - - 0 1')
    expect(kinds(detectMotifs(p, 'w'))).not.toContain('fork')
  })

  it('finds no fork in the starting position', () => {
    expect(kinds(detectMotifs(Position.start(), 'w'))).not.toContain('fork')
  })
})

describe('findPinsAndSkewers', () => {
  it('detects an absolute pin of a knight against the king', () => {
    // Black knight e5 is pinned to its king on e8 by the white rook on e1 —
    // chess.js confirms the knight has no legal moves at all.
    const p = Position.fromFen('4k3/8/8/4n3/8/8/8/4RK2 b - - 0 1')
    const pins = findPinsAndSkewers(p, 'w')
    const pin = pins.find((m) => m.kind === 'pin')
    expect(pin).toBeDefined()
    expect(pin?.by).toBe('e1')
    expect(pin?.targets[0]).toBe('e5')
    expect(p.legalMoves('e5')).toHaveLength(0)
  })

  it('detects a skewer: king in front, rook behind', () => {
    // White rook a1 checks the black king on a4 with the rook on a7 behind it.
    const p = Position.fromFen('8/r7/8/8/k7/8/8/R3K3 b - - 0 1')
    const skewer = findPinsAndSkewers(p, 'w').find((m) => m.kind === 'skewer')
    expect(skewer).toBeDefined()
    expect(skewer?.by).toBe('a1')
    expect(skewer?.targets).toEqual(['a4', 'a7'])
  })

  it('finds nothing when a friendly piece sits on the line', () => {
    const p = Position.fromFen('4k3/8/8/4n3/4P3/8/8/4RK2 b - - 0 1')
    expect(findPinsAndSkewers(p, 'w')).toHaveLength(0)
  })

  it('finds no pins in the starting position', () => {
    expect(findPinsAndSkewers(Position.start(), 'w')).toHaveLength(0)
    expect(findPinsAndSkewers(Position.start(), 'b')).toHaveLength(0)
  })
})

describe('double check', () => {
  it('detects a double check after a discovering knight check', () => {
    // Nd6+ checks with the knight while unveiling the rook on e1.
    const before = Position.fromFen('4k3/8/8/8/4N3/8/8/4RK2 w - - 0 1')
    const move = before.findMoveBySan('Nd6+')
    expect(move).not.toBeNull()
    const motifs = motifsCreatedBy(before, move!)
    const dc = motifs.find((m) => m.kind === 'double-check')
    expect(dc).toBeDefined()
    expect(dc?.targets).toEqual(expect.arrayContaining(['d6', 'e1']))
  })

  it('does not report a double check for an ordinary single check', () => {
    // Re8+ is a single check here: only the rook attacks the king on g8.
    const before = Position.fromFen('6k1/8/8/8/8/8/8/4R1K1 w - - 0 1')
    const move = before.findMoveBySan('Re8+')!
    expect(move).not.toBeNull()
    expect(kinds(motifsCreatedBy(before, move))).not.toContain('double-check')
  })
})

describe('discovered attack', () => {
  it('detects a bishop unveiled by a knight stepping aside', () => {
    // Bishop a1 sees nothing until the knight on d4 moves off the diagonal;
    // then it attacks the black rook on h8.
    const before = Position.fromFen('7r/8/8/8/3N4/8/8/B3K2k w - - 0 1')
    expect(before.attackers('h8', 'w')).toHaveLength(0)
    const move = before.findMoveBySan('Nf5')!
    const disc = motifsCreatedBy(before, move).find((m) => m.kind === 'discovered-attack')
    expect(disc).toBeDefined()
    expect(disc?.by).toBe('a1')
    expect(disc?.targets).toContain('h8')
  })

  it('does not report a discovery when the moved piece itself is the attacker', () => {
    const before = Position.fromFen('7r/8/8/8/8/8/8/4K2k w - - 0 1')
    const move = before.findMoveBySan('Kd2')!
    expect(kinds(motifsCreatedBy(before, move))).not.toContain('discovered-attack')
  })
})

describe('back rank', () => {
  it('flags a boxed-in king on the back rank', () => {
    // King g8 walled in by its own pawns on f7, g7 and h7.
    const p = Position.fromFen('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1')
    const motifs = detectMotifs(p, 'w')
    expect(kinds(motifs)).toContain('back-rank')
  })

  it('reports back-rank mate as available when Re8 delivers it', () => {
    const p = Position.fromFen('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1')
    const mate = detectMotifs(p, 'w').find((m) => m.kind === 'back-rank-mate')
    expect(mate).toBeDefined()
    expect(mate?.san).toBe('Re8#')
  })

  it('does not flag a king with a flight square', () => {
    // The h7 pawn is gone, so the king can step to h7.
    const p = Position.fromFen('6k1/5pp1/8/8/8/8/8/4R1K1 w - - 0 1')
    expect(kinds(detectMotifs(p, 'w'))).not.toContain('back-rank')
  })
})

describe('detectMotifs contract', () => {
  it('works regardless of whose turn the FEN says it is', () => {
    const white = Position.fromFen('r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1')
    expect(kinds(detectMotifs(white, 'w'))).toContain('fork')
  })

  it('returns motifs sorted with certain ones first', () => {
    const p = Position.fromFen('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1')
    const motifs = detectMotifs(p, 'w')
    const firstLikely = motifs.findIndex((m) => m.confidence === 'likely')
    const lastCertain = motifs.map((m) => m.confidence).lastIndexOf('certain')
    if (firstLikely !== -1 && lastCertain !== -1) {
      expect(lastCertain).toBeLessThan(firstLikely)
    }
  })

  it('every motif carries a name and a beginner-readable description', () => {
    const p = Position.fromFen('r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1')
    for (const m of detectMotifs(p, 'w')) {
      expect(m.name.length).toBeGreaterThan(2)
      expect(m.description.length).toBeGreaterThan(20)
    }
  })
})

describe('back-rank false positives', () => {
  it('does not claim a back-rank weakness in the starting position', () => {
    // Black's king has no flight square at move one, but no white heavy piece
    // can get anywhere near the eighth rank, so calling it a weakness is
    // noise that teaches the learner to distrust the coach.
    expect(kinds(detectMotifs(Position.start(), 'w'))).not.toContain('back-rank')
  })

  it('does not claim one when the back rank cannot be reached', () => {
    // King boxed in, White has a rook — but the rook is walled off by pawns
    // and has no route to the eighth rank.
    const p = Position.fromFen('6k1/5ppp/8/8/8/8/PPPPPPPP/R6K w - - 0 1')
    expect(kinds(detectMotifs(p, 'w'))).not.toContain('back-rank')
  })

  it('still reports one when a rook can actually get there', () => {
    const p = Position.fromFen('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1')
    expect(kinds(detectMotifs(p, 'w'))).toContain('back-rank')
  })
})
