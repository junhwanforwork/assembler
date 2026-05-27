import { ImplWithProduct } from '@/types'
import ImplementationCard from './ImplementationCard'
import FilterBar from './FilterBar'

interface ImplementationGridProps {
  impls: ImplWithProduct[]
  total?: number
}

export default function ImplementationGrid({ impls, total = 0 }: ImplementationGridProps) {
  return (
    <div>
      <FilterBar total={total} />
      {impls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-base mb-2" style={{ color: 'var(--text-secondary)' }}>
            아직 이 조건에 맞는 구현이 없어요.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            다른 기능을 찾아볼까요?
          </p>
        </div>
      ) : (
        <div className="impl-grid">
          {impls.map(impl => (
            <ImplementationCard key={impl.id} impl={impl} />
          ))}
        </div>
      )}
    </div>
  )
}
