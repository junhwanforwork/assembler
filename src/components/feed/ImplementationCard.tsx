import { ImplWithProduct } from '@/types'
import Link from 'next/link'
import Image from 'next/image'

interface ImplementationCardProps {
  impl: ImplWithProduct
}

function isNew(createdAt: string | null): boolean {
  if (!createdAt) return false
  const diff = Date.now() - new Date(createdAt).getTime()
  return diff < 7 * 24 * 60 * 60 * 1000
}

const WIDE_DEVICES = new Set(['web', 'tablet_pos', 'dashboard'])

function deviceIcon(deviceType: string): string {
  switch (deviceType) {
    case 'mobile_app': return '📱'
    case 'web': return '🌐'
    case 'kiosk': return '🖥️'
    case 'tablet_pos': return '📟'
    case 'dashboard': return '📊'
    default: return '💻'
  }
}

function deviceLabel(deviceType: string): string {
  return deviceType.replace(/_/g, ' ')
}

export default function ImplementationCard({ impl }: ImplementationCardProps) {
  const isWide = WIDE_DEVICES.has(impl.device_type ?? '')
  const brandColor = impl.product?.brand_color ?? 'var(--bg-card)'
  const initial = impl.product?.name?.[0] ?? '?'
  const showNew = isNew(impl.created_at)

  return (
    <Link
      href={`/impl/${impl.id}`}
      className={`group block rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5${isWide ? ' impl-card-wide' : ''}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Brand area */}
      <div
        className={`relative flex items-center justify-center${isWide ? ' brand-area-landscape' : ' brand-area-portrait'}`}
        style={{ background: brandColor }}
      >
        {showNew && (
          <span
            className="absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'var(--new-green)', color: 'var(--text-inverse)' }}
          >
            NEW
          </span>
        )}
        {impl.product?.logo_url ? (
          <Image
            src={impl.product.logo_url}
            alt={impl.product.name}
            width={64}
            height={64}
            className="object-contain rounded-xl"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ background: 'var(--overlay-dark-alpha)', color: 'var(--text-inverse)' }}
          >
            {initial}
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="px-3 py-3 flex flex-col gap-1">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {impl.product?.name}
        </p>
        <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
          {impl.headline}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {impl.industry && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {impl.industry.icon} {impl.industry.name}
            </span>
          )}
          {impl.device_type && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {deviceIcon(impl.device_type)} {deviceLabel(impl.device_type)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
