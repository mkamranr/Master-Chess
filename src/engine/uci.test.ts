import { describe, expect, it } from 'vitest'
import { eloToOptions, normaliseScore, parseBestMove, parseInfoLine } from './uci'

describe('parseInfoLine', () => {
  it('parses a centipawn line with its principal variation', () => {
    const line = parseInfoLine(
      'info depth 12 seldepth 18 multipv 1 score cp 34 nodes 90210 nps 900000 time 100 pv e2e4 e7e5 g1f3',
    )
    expect(line).toEqual({
      depth: 12,
      multipv: 1,
      scoreCp: 34,
      mateIn: null,
      pv: ['e2e4', 'e7e5', 'g1f3'],
    })
  })

  it('parses a mate score', () => {
    const line = parseInfoLine('info depth 5 multipv 1 score mate 3 pv e1e8')
    expect(line?.mateIn).toBe(3)
    expect(line?.scoreCp).toBeNull()
  })

  it('parses being mated as a negative mate distance', () => {
    expect(parseInfoLine('info depth 5 score mate -2 pv h7h8')?.mateIn).toBe(-2)
  })

  it('defaults multipv to 1 when the engine omits it', () => {
    expect(parseInfoLine('info depth 4 score cp 12 pv d2d4')?.multipv).toBe(1)
  })

  it('ignores lines with no score, such as currmove chatter', () => {
    expect(parseInfoLine('info depth 1 currmove e2e4 currmovenumber 1')).toBeNull()
    expect(parseInfoLine('info string NNUE evaluation using nn-9067e33176e')).toBeNull()
  })

  it('ignores non-info lines', () => {
    expect(parseInfoLine('uciok')).toBeNull()
    expect(parseInfoLine('bestmove e2e4 ponder e7e5')).toBeNull()
  })
})

describe('parseBestMove', () => {
  it('extracts the best move', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4')
  })

  it('extracts a promotion move', () => {
    expect(parseBestMove('bestmove a7a8q')).toBe('a7a8q')
  })

  it('returns null when the engine has no move', () => {
    expect(parseBestMove('bestmove (none)')).toBeNull()
  })

  it('returns null for other lines', () => {
    expect(parseBestMove('info depth 3 score cp 10 pv e2e4')).toBeNull()
  })
})

describe('normaliseScore', () => {
  it('leaves a white-to-move score alone', () => {
    expect(normaliseScore(50, 'w')).toBe(50)
  })

  it('flips a black-to-move score into White’s perspective', () => {
    expect(normaliseScore(50, 'b')).toBe(-50)
  })
})

describe('eloToOptions', () => {
  it('uses Skill Level below the engine’s supported Elo floor', () => {
    const options = eloToOptions(800)
    expect(options.some((o) => o.name === 'Skill Level')).toBe(true)
    expect(options.some((o) => o.name === 'UCI_Elo')).toBe(false)
    // The limiter must be switched off explicitly, not merely left unset:
    // a UCI_Elo from a previously selected level would otherwise still apply.
    expect(options).toEqual(
      expect.arrayContaining([{ name: 'UCI_LimitStrength', value: 'false' }]),
    )
  })

  it('uses UCI_Elo at and above the supported floor', () => {
    const options = eloToOptions(1600)
    expect(options).toEqual(
      expect.arrayContaining([
        { name: 'UCI_LimitStrength', value: 'true' },
        { name: 'UCI_Elo', value: '1600' },
      ]),
    )
  })

  it('turns the limiter off entirely for full strength', () => {
    const options = eloToOptions(null)
    expect(options).toEqual([{ name: 'UCI_LimitStrength', value: 'false' }])
  })

  it('never emits an Elo below the engine floor', () => {
    for (const elo of [1, 400, 1319]) {
      const emitted = eloToOptions(elo).find((o) => o.name === 'UCI_Elo')
      expect(emitted).toBeUndefined()
    }
  })
})
