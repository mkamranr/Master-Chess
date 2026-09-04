import type { StaticVerdict } from '@/analysis/verdict'
import type { Tone } from '@/components/ui/primitives'

/**
 * How each verdict is shown. Every entry carries a word AND a glyph, so the
 * meaning survives for anyone who cannot separate the colours — the badge
 * never depends on hue alone.
 */
export const VERDICT_STYLE: Record<
  StaticVerdict,
  { tone: Tone; label: string; glyph: string; blurb: string }
> = {
  checkmate: {
    tone: 'good',
    label: 'Checkmate',
    glyph: '#',
    blurb: 'This ends the game in your favour.',
  },
  'wins-material': {
    tone: 'good',
    label: 'Wins material',
    glyph: '▲',
    blurb: 'You come out ahead on pieces.',
  },
  safe: {
    tone: 'info',
    label: 'Safe',
    glyph: '●',
    blurb: 'Nothing is lost and nothing is won.',
  },
  'even-trade': {
    tone: 'neutral',
    label: 'Even trade',
    glyph: '=',
    blurb: 'You swap pieces of equal value.',
  },
  'loses-material': {
    tone: 'bad',
    label: 'Loses material',
    glyph: '▼',
    blurb: 'Your opponent ends up ahead if they take.',
  },
  stalemate: {
    tone: 'warn',
    label: 'Stalemate',
    glyph: '½',
    blurb: 'The game would be drawn immediately.',
  },
}
