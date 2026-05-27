import { cookies } from 'next/headers'
import AdminAuthGate from './AdminAuthGate'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  const isAuthed = token === process.env.ADMIN_PASSWORD

  if (!isAuthed) {
    return <AdminAuthGate />
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  )
}
