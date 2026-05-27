'use client'
import { useState } from 'react'
import { ImplWithProduct } from '@/types'
import ImplDecisionList from './ImplDecisionList'
import ImplWhySection from './ImplWhySection'
import SimilarImpls from './SimilarImpls'

interface ImplDetailTabsProps {
  impl: ImplWithProduct
  similar: ImplWithProduct[]
}

type Tab = 'decisions' | 'why'

export default function ImplDetailTabs({ impl, similar }: ImplDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('decisions')

  return (
    <div>
      <div className="flex border-b mb-6" style={{ borderColor: 'var(--border-subtle)' }}>
        {(['decisions', 'why'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-3 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {tab === 'decisions' ? '구현 방식' : '왜 이렇게'}
          </button>
        ))}
      </div>

      {activeTab === 'decisions' && (
        <ImplDecisionList featureAreas={impl.feature_areas ?? []} />
      )}
      {activeTab === 'why' && (
        <ImplWhySection impl={impl} />
      )}

      <SimilarImpls impls={similar} />
    </div>
  )
}
