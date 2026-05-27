import { ImplWithProduct } from '@/types'

interface ImplWhySectionProps {
  impl: ImplWithProduct
}

export default function ImplWhySection({ impl }: ImplWhySectionProps) {
  return (
    <section className="flex flex-col gap-6">
      {impl.plain_notes && (
        <div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {impl.plain_notes}
          </p>
        </div>
      )}

      {(impl.pros?.length || impl.cons?.length) && (
        <div className="grid grid-cols-2 gap-4">
          {!!impl.pros?.length && (
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                이런 곳에 맞아요
              </h4>
              <ul className="flex flex-col gap-1">
                {impl.pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--positive)' }}>✓</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!!impl.cons?.length && (
            <div>
              <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                이런 곳엔 안 맞아요
              </h4>
              <ul className="flex flex-col gap-1">
                {impl.cons.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--accent)' }}>✗</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {impl.best_for && (
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
            이런 서비스에 딱 맞아요
          </p>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{impl.best_for}</p>
        </div>
      )}
    </section>
  )
}
