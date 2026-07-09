import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database as GeneratedDatabase } from "@/types/database.types"
import type { ActivityType, ApiStatus, DbColumn, HttpMethod, SourceKind, WorkspaceDesign } from "@/lib/types/assembler"
import type { AsmActivityRow, AsmApiNoteRow, AsmApiRow, AsmDbTableNoteRow, AsmDbTableRow, AsmProductRow, AsmWorkspaceRow } from "./assembler-rows"

// asm_* 테이블 전용 타입드 클라이언트.
// builder.ts(wf_projects)와 동일 패턴: 자동 생성 Database 타입을 손대지 않고(=db.md 규칙)
// 그대로 확장해 asm_* 테이블만 추가한다. Row는 type(객체 리터럴)이어야 never로 안 떨어진다.

type PublicSchema = GeneratedDatabase["public"]

type AsmProductInsert = { id?: string; session_id: string; user_id?: string | null; name?: string; description?: string }
type AsmProductUpdate = { name?: string; description?: string; user_id?: string | null }

type AsmWorkspaceInsert = {
  id?: string
  product_id: string
  name?: string
  is_main?: boolean
  design?: WorkspaceDesign
}
type AsmWorkspaceUpdate = { name?: string; is_main?: boolean; design?: WorkspaceDesign }

type AsmApiInsert = {
  id?: string
  product_id: string
  method: HttpMethod
  endpoint: string
  summary?: string
  status?: ApiStatus
  source: SourceKind
}
type AsmApiUpdate = { method?: HttpMethod; endpoint?: string; summary?: string; status?: ApiStatus; source?: SourceKind }

type AsmDbTableInsert = {
  id?: string
  product_id: string
  name: string
  description?: string
  columns?: DbColumn[]
  source: SourceKind
}
type AsmDbTableUpdate = { name?: string; description?: string; columns?: DbColumn[]; source?: SourceKind }

type AsmDbTableNoteInsert = {
  id?: string
  db_table_id: string
  product_id: string
  explanation: string
  grounded?: boolean
  is_user_edited?: boolean
  generated_at?: string
}
type AsmDbTableNoteUpdate = { explanation?: string; grounded?: boolean; is_user_edited?: boolean; generated_at?: string }

// API 해석 노트(ASM-064) — asm_db_table_notes와 동형(api_id 키).
type AsmApiNoteInsert = {
  id?: string
  api_id: string
  product_id: string
  explanation: string
  grounded?: boolean
  is_user_edited?: boolean
  generated_at?: string
}
type AsmApiNoteUpdate = { explanation?: string; grounded?: boolean; is_user_edited?: boolean; generated_at?: string }

// append-only 로그 — Insert만 실제로 쓰인다. Update는 타입 형식상 둠.
type AsmActivityInsert = {
  id?: string
  product_id: string
  workspace_id?: string | null
  type: ActivityType
  metadata?: Record<string, unknown>
}
type AsmActivityUpdate = { metadata?: Record<string, unknown> }

// public 스키마를 키 명시 객체 리터럴로 구성한다(Omit/교차는 모듈 경계에서 never로 떨어짐 — builder.ts 주석 참고).
type AssemblerDB = {
  __InternalSupabase: GeneratedDatabase["__InternalSupabase"]
  public: {
    Tables: PublicSchema["Tables"] & {
      asm_products: { Row: AsmProductRow; Insert: AsmProductInsert; Update: AsmProductUpdate; Relationships: [] }
      asm_workspaces: { Row: AsmWorkspaceRow; Insert: AsmWorkspaceInsert; Update: AsmWorkspaceUpdate; Relationships: [] }
      asm_apis: { Row: AsmApiRow; Insert: AsmApiInsert; Update: AsmApiUpdate; Relationships: [] }
      asm_db_tables: { Row: AsmDbTableRow; Insert: AsmDbTableInsert; Update: AsmDbTableUpdate; Relationships: [] }
      asm_db_table_notes: { Row: AsmDbTableNoteRow; Insert: AsmDbTableNoteInsert; Update: AsmDbTableNoteUpdate; Relationships: [] }
      asm_api_notes: { Row: AsmApiNoteRow; Insert: AsmApiNoteInsert; Update: AsmApiNoteUpdate; Relationships: [] }
      asm_activity: { Row: AsmActivityRow; Insert: AsmActivityInsert; Update: AsmActivityUpdate; Relationships: [] }
    }
    Views: PublicSchema["Views"]
    // check_rate_limit(20260702000002) — fixed window 카운터. 반환 0=허용, N>0=N초 후 재시도.
    Functions: PublicSchema["Functions"] & {
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: number
      }
    }
    Enums: PublicSchema["Enums"]
    CompositeTypes: PublicSchema["CompositeTypes"]
  }
}

// Schema 제네릭(4번째)을 직접 고정하지 않으면 모듈 경계에서 never로 떨어진다(builder.ts 동일).
export type AssemblerClient = SupabaseClient<AssemblerDB, "public", "public", AssemblerDB["public"]>

// 로그인 사용자 id(없으면 null). 익명 경로는 세션 헤더 가드를 쓰므로 비용 없음.
export async function getAuthedUserId(supabase: AssemblerClient): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// RLS는 x-session-id 헤더 + auth dual-key. anon 키로 CRUD 가능(service_role 불필요).
export async function createAssemblerClient(sessionId: string): Promise<AssemblerClient> {
  const cookieStore = await cookies()
  return createServerClient<AssemblerDB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
      global: { headers: { "x-session-id": sessionId } },
    }
  )
}
