import { describe, expect, it } from 'vitest'
import { Position } from '@/chess/game'
import {
  controlMap,
  defendersOf,
  hangingPieces,
  isPinned,
  materialBalance,
  pinInfo,
  squareReport,
} from './threats'

describe('materialBalance', () => {
  it('is level in the starting position', () => {
    const balance = materialBalance(Position.start())
    expect(balance.white).toBe(39)
    expect(balance.black).toBe(39)
    expect(balance.diff).toBe(0)
  })

  it('counts a missing black knight as +3 for White', () => {
    const p = Position.fromFen('rnbqkb1r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(materialBalance(p).diff).toBe(3)
  })

  it('excludes kings from the count', () => {
    const p = Position.fromFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1')
    expect(materialBalance(p).white).toBe(0)
    expect(materialBalance(p).black).toBe(0)
  })
})

describe('defendersOf', () => {
  it('reports a rook defending a pawn along the file', () => {
    const p = Position.fromFen('4k3/8/8/8/4P3/8/8/4RK2 w - - 0 1')
    expect(defendersOf(p, 'e4')).toContain('e1')
  })

  it('does NOT count a defender that is pinned to its own king', () => {
    // White king e1, white rook e2 pinned by the black queen on e8, white pawn
    // d2. chess.js lists e2 as a raw attacker of d2, but the rook may only
    // move along the e-file, so it does not really defend d2.
    const p = Position.fromFen('4q2k/8/8/8/8/8/3PR3/4K3 w - - 0 1')
    expect(p.attackers('d2', 'w')).toContain('e2')
    expect(defendersOf(p, 'd2')).not.toContain('e2')
    // The king on e1 does defend d2, so the square is not undefended.
    expect(defendersOf(p, 'd2')).toContain('e1')
  })

  it('still counts a pinned piece as a defender along its own pin line', () => {
    // The same pin, but e4 lies on the pin line where the rook may legally
    // move, so it genuinely defends it.
    const p = Position.fromFen('4q2k/8/8/8/8/8/4R3/4K3 w - - 0 1')
    expect(defendersOf(p, 'e4')).toContain('e2')
  })
})

describe('isPinned / pinInfo', () => {
  it('detects an absolute pin against the king', () => {
    const p = Position.fromFen('4q2k/8/8/8/8/8/4R3/4K3 w - - 0 1')
    expect(isPinned(p, 'e2')).toBe(true)
    const info = pinInfo(p, 'e2')
    expect(info?.pinnedBy).toBe('e8')
    expect(info?.shieldedSquare).toBe('e1')
  })

  it('reports no pin when another piece blocks the line', () => {
    const p = Position.fromFen('4q2k/8/8/4p3/8/8/4R3/4K3 w - - 0 1')
    expect(isPinned(p, 'e2')).toBe(false)
  })

  it('reports no pin for a piece not on a line to its king', () => {
    const p = Position.fromFen('4q2k/8/8/8/8/8/1R6/4K3 w - - 0 1')
    expect(isPinned(p, 'b2')).toBe(false)
  })

  it('reports no pin for an empty square', () => {
    expect(isPinned(Position.start(), 'e4')).toBe(false)
  })
})

describe('hangingPieces', () => {
  it('flags an undefended attacked piece', () => {
    // White knight d4, attacked by the black pawn on c5, undefended.
    const p = Position.fromFen('4k3/8/8/2p5/3N4/8/8/4K3 b - - 0 1')
    const hanging = hangingPieces(p, 'w')
    expect(hanging.map((h) => h.square)).toContain('d4')
    const knight = hanging.find((h) => h.square === 'd4')
    expect(knight?.defenders).toHaveLength(0)
    expect(knight?.lossIfTaken).toBe(3)
  })

  it('does not flag an even trade of pawn for pawn', () => {
    const p = Position.fromFen('4k3/8/8/2p5/3P4/2P5/8/4K3 b - - 0 1')
    expect(hangingPieces(p, 'w').map((h) => h.square)).not.toContain('d4')
  })

  it('flags a defended piece when the attacker is worth less', () => {
    // Black pawn b5 attacks the white rook on c4; the rook is defended by the
    // pawn on b3, but pawn-takes-rook still wins four pawns of material.
    const p = Position.fromFen('4k3/8/8/1p6/2R5/1P6/8/4K3 b - - 0 1')
    const found = hangingPieces(p, 'w').find((h) => h.square === 'c4')
    expect(found).toBeDefined()
    expect(found?.lossIfTaken).toBe(4)
  })

  it('finds nothing in the starting position', () => {
    expect(hangingPieces(Position.start(), 'w')).toHaveLength(0)
    expect(hangingPieces(Position.start(), 'b')).toHaveLength(0)
  })

  it('never reports the king as hanging', () => {
    const p = Position.fromFen('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1')
    expect(hangingPieces(p, 'w').map((h) => h.square)).not.toContain('e1')
  })
})

describe('controlMap', () => {
  it('marks e4 as contested when both sides cover it', () => {
    // White knight c3 and black knight f6 both attack e4.
    const p = Position.fromFen('4k3/8/5n2/8/8/2N5/8/4K3 w - - 0 1')
    const map = controlMap(p)
    expect(map.e4?.white).toBe(1)
    expect(map.e4?.black).toBe(1)
    expect(map.e4?.owner).toBe('contested')
  })

  it('marks a square only White covers as white-controlled', () => {
    const p = Position.fromFen('4k3/8/8/8/8/2N5/8/4K3 w - - 0 1')
    expect(controlMap(p).e4?.owner).toBe('white')
  })

  it('marks a square neither side covers as neutral', () => {
    const p = Position.fromFen('4k3/8/8/8/8/2N5/8/4K3 w - - 0 1')
    expect(controlMap(p).h8?.owner).toBe('neutral')
  })

  it('gives every one of the 64 squares an entry', () => {
    expect(Object.keys(controlMap(Position.start()))).toHaveLength(64)
  })
})

describe('squareReport', () => {
  it('describes an empty square with its colour and coverage', () => {
    // In the starting position nothing attacks e4 yet, but three white pieces
    // cover f3 — a fact the board-reading lesson leans on.
    const report = squareReport(Position.start(), 'f3')
    expect(report.square).toBe('f3')
    expect(report.squareColor).toBe('light')
    expect(report.piece).toBeNull()
    expect(report.whiteAttackers).toEqual(expect.arrayContaining(['e2', 'g2', 'g1']))
  })

  it('confirms nothing attacks e4 in the starting position', () => {
    expect(squareReport(Position.start(), 'e4').whiteAttackers).toHaveLength(0)
  })

  it('describes an occupied square with its attackers and defenders', () => {
    const p = Position.fromFen('4k3/8/8/2p5/3N4/8/8/4K3 b - - 0 1')
    const report = squareReport(p, 'd4')
    expect(report.piece?.type).toBe('n')
    expect(report.blackAttackers).toContain('c5')
    expect(report.isHanging).toBe(true)
  })
})
