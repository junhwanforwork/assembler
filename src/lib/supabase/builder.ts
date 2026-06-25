import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import type { Database as GeneratedDatabase } from "@/types/database.types"
import type { ProjectDocument } from "@/lib/types/builder"
import type { ProjectGraph } from "@/lib/types/assembler"

// document(jsonb)는 전환기 동안 옛 빌더(ProjectDocument)와 새 객체그래프(ProjectGraph) 둘 다 담는다.
// jsonb라 DB는 무관 — TS만 union으로 넓혀 ProjectGraph 저장 시 never로 안 떨어지게.
type ProjectDoc = ProjectDocument | ProjectGraph

// wf_projects 전용 타입드 클라이언트.
// database.types.ts는 자동 생성 파일이라 수동 수정하지 않고(=db.md 규칙),
// 생성된 Database 타입을 그대로 확장해 wf_projects 테이블만 추가한다.
// (Views/Functions/Enums 등 빈 스키마 shape를 직접 손으로 만들면 postgrest-js가
//  타입을 never로 떨궈서, 생성된 타입을 재사용하는 게 안전하다.)

// interface가 아닌 type으로 선언해야 한다. interface는 암묵적 인덱스 시그니처가 없어
// Record<string, unknown>(=postgrest의 GenericTable.Row 제약)에 할당되지 않아,
// 테이블 타입 추론이 통째로 never로 떨어진다.
export type WfProjectRow = {
  id: string
  session_id: string
  // 로그인 소유권(20260625000001). 익명 세션 행은 null, 가입 시 claim_session_projects 로 승계.
  user_id: string | null
  title: string
  document: ProjectDoc
  created_at: string
  updated_at: string
}

type PublicSchema = GeneratedDatabase["public"]

// public 스키마를 5개 키 명시 객체 리터럴로 구성한다.
// Omit & 교차 형태로 만들면 SupabaseClient의 Schema 제네릭이 모듈 경계에서
// deferred conditional로 never가 되어 .from() 결과가 never로 떨어진다.
type BuilderDB = {
  __InternalSupabase: GeneratedDatabase["__InternalSupabase"]
  public: {
    Tables: PublicSchema["Tables"] & {
      wf_projects: {
        Row: WfProjectRow
        Insert: { id?: string; session_id: string; user_id?: string | null; title?: string; document?: ProjectDoc }
        Update: { title?: string; document?: ProjectDoc; user_id?: string | null }
        Relationships: []
      }
    }
    Views: PublicSchema["Views"]
    // claim_session_projects(20260625000001) — 가입 직후 익명 세션 프로젝트를 계정으로 승계(반환=승계 건수).
    Functions: PublicSchema["Functions"] & {
      claim_session_projects: {
        Args: { p_session_id: string }
        Returns: number
      }
    }
    Enums: PublicSchema["Enums"]
    CompositeTypes: PublicSchema["CompositeTypes"]
  }
}

// RLS는 x-session-id 헤더로 소유권을 판별한다(saved_items 패턴 동일).
// 헤더만 맞으면 anon 키로 CRUD가 가능하므로 service_role이 필요 없다.
// 반환 타입에서 Schema 제네릭(4번째)을 BuilderDB["public"]로 직접 고정한다.
// 고정하지 않으면 모듈 경계에서 Schema가 deferred conditional로 never가 되어
// import한 쪽에서 .from() 결과가 never로 떨어진다.
type BuilderClient = SupabaseClient<BuilderDB, "public", "public", BuilderDB["public"]>

// 로그인 사용자 id(없으면 null) — RLS dual-key의 앱-레벨 미러. anon은 세션 가드를 그대로 쓴다.
// 인증 세션이 없으면 getUser()는 네트워크 없이 null을 돌려준다(익명 경로 비용 없음).
export async function getAuthedUserId(supabase: BuilderClient): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function createBuilderClient(sessionId: string): Promise<BuilderClient> {
  const cookieStore = await cookies()
  return createServerClient<BuilderDB>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
      global: { headers: { "x-session-id": sessionId } },
    }
  )
}
