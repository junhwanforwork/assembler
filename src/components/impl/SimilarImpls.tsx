import { ImplWithProduct } from '@/types'
import ImplementationCard from '@/components/feed/ImplementationCard'

interface SimilarImplsProps {
  impls: ImplWithProduct[]
}

export default function SimilarImpls({ impls }: SimilarImplsProps) {
  if (!impls.length) return null
  return (
    <section className="mt-12">
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
        비슷한 구현
      </h3>
      <div className="impl-grid">
        {impls.map(impl => (
          <ImplementationCard key={impl.id} impl={impl} />
        ))}
      </div>
    </section>
  )
}
