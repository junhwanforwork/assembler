'use client'
import { FeatureArea } from '@/types'

interface ImplAreaSidebarProps {
  featureAreas: FeatureArea[]
  visibleAreas: Set<string>
  onToggle: (name: string) => void
}

// P2: area navigation sidebar — currently a visual stub
export default function ImplAreaSidebar({ featureAreas, visibleAreas, onToggle }: ImplAreaSidebarProps) {
  if (!featureAreas.length) return null
  return (
    <aside className="flex flex-col gap-1">
      {featureAreas.map(area => (
        <button
          key={area.name}
          onClick={() => onToggle(area.name)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-colors"
          style={{
            background: visibleAreas.has(area.name) ? 'var(--bg-elevated)' : 'transparent',
            color: visibleAreas.has(area.name) ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
        >
          {area.name}
        </button>
      ))}
    </aside>
  )
}
