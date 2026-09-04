import { useState } from 'react'
import type { Square } from '@/chess/game'
import { Position } from '@/chess/game'
import type { MoveExplanation } from '@/analysis/explain'
import type { ChessEngine } from '@/engine/stockfish'
import { Panel, Tabs } from '@/components/ui/primitives'
import { BoardReadPanel } from './BoardReadPanel'
import { IfThenPanel } from './IfThenPanel'
import { MovesPanel } from './MovesPanel'
import { RulePanel } from './RulePanel'

export type CoachTab = 'rule' | 'moves' | 'ifthen' | 'read'

const TABS: Array<{ id: CoachTab; label: string }> = [
  { id: 'rule', label: 'Rule' },
  { id: 'moves', label: 'Moves' },
  { id: 'ifthen', label: 'If-Then' },
  { id: 'read', label: 'Board read' },
]

/**
 * The coach, as four views onto the same position: the rule that applies, the
 * moves available, what follows from one of them, and how to read the board.
 */
export function CoachPanel({
  position,
  selected,
  preview,
  onPreview,
  engine,
  engineReady,
  showControl,
  onToggleControl,
  onArrowsChange,
  activeTab,
  onTabChange,
  demoBoard,
}: {
  position: Position
  selected: Square | null
  preview: MoveExplanation | null
  onPreview: (explanation: MoveExplanation | null) => void
  engine?: ChessEngine | null
  engineReady?: boolean
  showControl: boolean
  onToggleControl: (next: boolean) => void
  onArrowsChange?: (arrows: Array<{ from: string; to: string }>) => void
  activeTab?: CoachTab
  onTabChange?: (tab: CoachTab) => void
  demoBoard?: boolean
}) {
  const [internalTab, setInternalTab] = useState<CoachTab>('rule')
  const tab = activeTab ?? internalTab
  const setTab = onTabChange ?? setInternalTab

  return (
    <Panel
      title="Coach"
      subtitle="Everything about the position on the board right now"
      actions={null}
      padded={false}
    >
      <div style={{ padding: 'var(--spacing-md) var(--spacing-lg) 0' }}>
        <Tabs tabs={TABS} active={tab} onChange={setTab} label="Coach views" />
      </div>
      <div style={{ padding: 'var(--spacing-lg)' }}>
        {tab === 'rule' ? (
          <RulePanel position={position} selected={selected} demoBoard={demoBoard} />
        ) : null}
        {tab === 'moves' ? (
          <MovesPanel
            position={position}
            selected={selected}
            previewSan={preview?.san ?? null}
            onPreview={(explanation) => {
              onPreview(explanation)
              setTab('ifthen')
            }}
          />
        ) : null}
        {tab === 'ifthen' ? (
          <IfThenPanel
            position={position}
            preview={preview}
            engine={engine}
            engineReady={engineReady}
            onArrowsChange={onArrowsChange}
          />
        ) : null}
        {tab === 'read' ? (
          <BoardReadPanel
            position={position}
            selected={selected}
            showControl={showControl}
            onToggleControl={onToggleControl}
          />
        ) : null}
      </div>
    </Panel>
  )
}
