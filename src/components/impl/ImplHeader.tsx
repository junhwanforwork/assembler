import { ImplWithProduct } from '@/types'
import Image from 'next/image'
import SaveButton from './SaveButton'

interface ImplHeaderProps {
  impl: ImplWithProduct
}

function deviceIcon(type: string): string {
  switch (type) {
    case 'mobile_app': return '📱 Mobile'
    case 'web': return '🌐 Web'
    case 'kiosk': return '🖥️ Kiosk'
    case 'tablet_pos': return '📟 Tablet POS'
    case 'dashboard': return '📊 Dashboard'
    default: return `💻 ${type}`
  }
}

export default function ImplHeader({ impl }: ImplHeaderProps) {
  return (
    <div>
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl font-bold"
          style={{ background: impl.product?.brand_color ?? 'var(--bg-elevated)', color: 'var(--text-inverse)' }}
        >
          {impl.product?.logo_url ? (
            <Image
              src={impl.product.logo_url}
              alt={impl.product.name}
              width={48}
              height={48}
              className="object-contain"
            />
          ) : (
            impl.product?.name?.[0] ?? '?'
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                {impl.product?.name}
              </p>
              <h1 className="text-2xl font-bold break-keep" style={{ color: 'var(--text-primary)' }}>
                {impl.headline}
              </h1>
              <div className="flex gap-2 mt-2 flex-wrap">
                {impl.industry && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    {impl.industry.icon} {impl.industry.name}
                  </span>
                )}
                {impl.device_type && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    {deviceIcon(impl.device_type)}
                  </span>
                )}
                {impl.feature_type && (
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    {impl.feature_type.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <SaveButton
                implId={impl.id}
                featureSlug={impl.feature_type?.slug}
                featureName={impl.feature_type?.name}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
