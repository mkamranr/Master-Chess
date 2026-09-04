import type { Color } from '@/chess/game'

/* ---------------------------------------------------------------------------
 * UCI — the text protocol chess engines speak.
 *
 * Kept as pure functions with no worker involved, so the parsing is fully
 * unit-testable without downloading a 7MB engine in CI.
 * ------------------------------------------------------------------------ */

export interface EngineLine {
  depth: number
  /** 1 for the best line, 2 for the second best, and so on. */
  multipv: number
  /** Score in centipawns from the side-to-move's point of view, or null for a mate score. */
  scoreCp: number | null
  /** Moves to mate; negative means the side to move is getting mated. */
  mateIn: number | null
  /** The principal variation as LAN moves, e.g. ['e2e4', 'e7e5']. */
  pv: string[]
}

export interface UciOption {
  name: string
  value: string
}

/**
 * Stockfish's `UCI_Elo` option only goes down to 1320. Below that the correct
 * lever is `Skill Level` (0–20), which weakens the search itself. Asking for
 * `UCI_Elo 600` is silently ignored, which would hand a raw beginner a
 * full-strength opponent — so the floor is enforced here.
 */
export const MIN_UCI_ELO = 1320
export const MAX_UCI_ELO = 3190

/** Parses one `info` line. Returns null for lines that carry no evaluation. */
export function parseInfoLine(line: string): EngineLine | null {
  if (!line.startsWith('info ')) return null
  const tokens = line.split(/\s+/)

  const depthIndex = tokens.indexOf('depth')
  const scoreIndex = tokens.indexOf('score')
  const pvIndex = tokens.indexOf('pv')
  if (scoreIndex === -1 || depthIndex === -1) return null

  const scoreType = tokens[scoreIndex + 1]
  const scoreValue = Number(tokens[scoreIndex + 2])
  if (!scoreType || Number.isNaN(scoreValue)) return null

  const multipvIndex = tokens.indexOf('multipv')

  return {
    depth: Number(tokens[depthIndex + 1]) || 0,
    multipv: multipvIndex === -1 ? 1 : Number(tokens[multipvIndex + 1]) || 1,
    scoreCp: scoreType === 'cp' ? scoreValue : null,
    mateIn: scoreType === 'mate' ? scoreValue : null,
    pv: pvIndex === -1 ? [] : tokens.slice(pvIndex + 1).filter(Boolean),
  }
}

/** Extracts the move from a `bestmove` line; null when there is none. */
export function parseBestMove(line: string): string | null {
  if (!line.startsWith('bestmove')) return null
  const move = line.split(/\s+/)[1]
  if (!move || move === '(none)') return null
  return move
}

/**
 * Engine scores arrive from the side-to-move's point of view. The UI shows
 * everything from White's, so a black-to-move score has to be flipped —
 * getting this wrong inverts every evaluation on Black's turn.
 */
export function normaliseScore(score: number, turn: Color): number {
  return turn === 'w' ? score : -score
}

/**
 * Options that set the engine to roughly `targetElo`. Pass null for full
 * strength.
 */
export function eloToOptions(targetElo: number | null): UciOption[] {
  if (targetElo === null) {
    return [{ name: 'UCI_LimitStrength', value: 'false' }]
  }

  if (targetElo < MIN_UCI_ELO) {
    // Map the 0–20 Skill Level range across the sub-1320 band. Skill Level 0
    // is roughly 800-strength and still beatable by an improving beginner.
    const span = MIN_UCI_ELO - 400
    const ratio = Math.min(1, Math.max(0, (targetElo - 400) / span))
    const skill = Math.round(ratio * 8) // keep it genuinely weak: 0–8
    return [
      { name: 'UCI_LimitStrength', value: 'false' },
      { name: 'Skill Level', value: String(skill) },
    ]
  }

  return [
    { name: 'Skill Level', value: '20' },
    { name: 'UCI_LimitStrength', value: 'true' },
    { name: 'UCI_Elo', value: String(Math.min(MAX_UCI_ELO, Math.round(targetElo))) },
  ]
}

/** Turns a LAN move string into from/to/promotion parts. */
export function splitLan(lan: string): { from: string; to: string; promotion?: string } {
  const from = lan.slice(0, 2)
  const to = lan.slice(2, 4)
  const promotion = lan.slice(4, 5)
  return promotion ? { from, to, promotion } : { from, to }
}
