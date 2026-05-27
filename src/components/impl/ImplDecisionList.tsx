'use client'
import { useState } from 'react'
import { FeatureArea } from '@/types'
import ImplDecisionItem from './ImplDecisionItem'

interface ImplDecisionListProps {
  featureAreas: FeatureArea[]
  visibleAreas?: Set<string>
}

export default function ImplDecisionList({ featureAreas }: ImplDecisionListProps) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({ '0-0': true })

  if (!featureAreas.length) {
    return <p style={{ color: 'var(--text-muted)' }}>구현 방식 정보가 없어요</p>
  }

  return (
    <div>
      {featureAreas.map((area, ai) => (
        <div key={area.name} className="mb-8">
          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-muted)' }}
          >
            {area.name}
          </h3>
          <div className="flex flex-col gap-2">
            {area.decisions.map((decision, di) => (
              <ImplDecisionItem
                key={di}
                decision={decision}
                isOpen={openMap[`${ai}-${di}`] ?? false}
                onToggle={() =>
                  setOpenMap(prev => ({ ...prev, [`${ai}-${di}`]: !prev[`${ai}-${di}`] }))
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
