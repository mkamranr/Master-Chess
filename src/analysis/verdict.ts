/* ---------------------------------------------------------------------------
 * Move quality.
 *
 * Two independent scales live here, and keeping them apart matters:
 *
 *  - `StaticVerdict` needs no engine. It answers "does this move win or lose
 *    material, right now, by counting?" That is the arithmetic a beginner can
 *    learn to do at the board, and it is available instantly and offline —
 *    every rules lesson relies on it.
 *
 *  - `EngineVerdict` needs Stockfish. It answers "how much worse than the best
 *    move is this?" in centipawns, which catches positional errors that lose
 *    nothing immediately.
 *
 * The coach shows the static verdict always and the engine verdict when the
 * engine has loaded, so nothing is ever gated behind a 7MB download.
 * ------------------------------------------------------------------------ */

export type StaticVerdict =
  | 'checkmate'
  | 'wins-material'
  | 'even-trade'
  | 'safe'
  | 'loses-material'
  | 'stalemate'

export type EngineVerdictKind =
  | 'best'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'

export interface EngineVerdict {
  kind: EngineVerdictKind
  /** How much worse than the engine's choice, in centipawns. */
  centipawnLoss: number
  label: string
  /** One line the coach can show verbatim. */
  advice: string
}

/**
 * Centipawn-loss thresholds. A pawn is 100 centipawns, so "mistake" starts at
 * a bit more than a pawn and "blunder" at roughly a piece — deliberately
 * forgiving at the top end, because a beginner being told every move is a
 * blunder learns nothing.
 */
export const CP_THRESHOLDS = {
  best: 10,
  good: 50,
  inaccuracy: 120,
  mistake: 300,
} as const

const LABELS: Record<EngineVerdictKind, string> = {
  best: 'Best move',
  good: 'Good move',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

const ADVICE: Record<EngineVerdictKind, string> = {
  best: 'This is the strongest move in the position. Nothing is better.',
  good: 'A good, solid move — close enough to best that the difference barely matters.',
  inaccuracy: 'Playable, but there was something clearly better. Worth seeing what.',
  mistake: 'This gives away a real advantage. Look at what you missed.',
  blunder: 'This loses something significant. Take it back and look again.',
}

export function classifyCentipawnLoss(centipawnLoss: number): EngineVerdict {
  const loss = Math.max(0, Math.round(centipawnLoss))
  let kind: EngineVerdictKind
  if (loss <= CP_THRESHOLDS.best) kind = 'best'
  else if (loss <= CP_THRESHOLDS.good) kind = 'good'
  else if (loss <= CP_THRESHOLDS.inaccuracy) kind = 'inaccuracy'
  else if (loss <= CP_THRESHOLDS.mistake) kind = 'mistake'
  else kind = 'blunder'

  return { kind, centipawnLoss: loss, label: LABELS[kind], advice: ADVICE[kind] }
}

/** True when a verdict is bad enough that the coach should interrupt. */
export function shouldWarn(kind: EngineVerdictKind): boolean {
  return kind === 'mistake' || kind === 'blunder'
}

export const STATIC_VERDICT_LABEL: Record<StaticVerdict, string> = {
  checkmate: 'Checkmate — you win',
  'wins-material': 'Wins material',
  'even-trade': 'Even trade',
  safe: 'Safe',
  'loses-material': 'Loses material',
  stalemate: 'Stalemate — the game is drawn',
}

/**
 * A score, in pawns, seen from the mover's side, turned into a verdict.
 * `netMaterial` is what you end up with after the opponent takes their best
 * capture back.
 */
export function classifyMaterial(netMaterial: number, captured: boolean): StaticVerdict {
  if (netMaterial > 0) return 'wins-material'
  if (netMaterial < 0) return 'loses-material'
  return captured ? 'even-trade' : 'safe'
}
