import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// 쿠키 admin_token 이 ADMIN_PASSWORD 와 일치할 때만 어드민으로 인정한다.
// ADMIN_PASSWORD 미설정 시 둘 다 undefined 가 되어 통과하는 우회를 막기 위해 존재 여부를 먼저 본다.
export async function isAdminRequest(): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD
  if (!password) return false
  const cookieStore = await cookies()
  return cookieStore.get('admin_token')?.value === password
}

// 어드민 쓰기는 RLS 를 우회하는 service_role 키로 처리한다 (서버 전용).
// service_role 키가 없으면 anon 키로 폴백 — 로컬/미설정 환경 대비.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
