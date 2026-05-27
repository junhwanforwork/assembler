import Link from 'next/link'
import GNBSavedBadge from './GNBSavedBadge'

export default function GNB() {
  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 h-14 border-b"
      style={{ background: 'var(--bg-base)', borderColor: 'var(--border-subtle)' }}
    >
      <Link
        href="/"
        className="font-semibold text-base tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        HowCloud
      </Link>
      <GNBSavedBadge />
    </nav>
  )
}
