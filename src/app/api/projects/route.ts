import { NextResponse } from "next/server"
import { createBuilderClient, getAuthedUserId } from "@/lib/supabase/builder"
import type { ProjectListItem } from "@/lib/types/builder"
import type { ProjectGraph } from "@/lib/types/assembler"

function sessionId(req: Request): string | null {
  return req.headers.get("x-session-id")
}

// GET /api/projects — 내 프로젝트 목록
export async function GET(req: Request) {
  const sid = sessionId(req)
  if (!sid) return NextResponse.json({ error: "세션을 확인할 수 없어요." }, { status: 400 })

  const supabase = await createBuilderClient(sid)
  const userId = await getAuthedUserId(supabase)
  // RLS dual-key의 앱-레벨 미러 — 로그인=내 user_id 소유, 익명=내 세션 소유.
  const owned = supabase.from("wf_projects").select("id, title, document, updated_at")
  const { data, error } = await (userId ? owned.eq("user_id", userId) : owned.eq("session_id", sid))
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: "프로젝트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    )
  }

  // document는 옛 빌더({screens})와 새 그래프({pages}) 둘 다 가능 — 둘 중 있는 쪽 개수.
  const items: ProjectListItem[] = (data ?? []).map((row) => {
    const doc = row.document as { screens?: unknown[]; pages?: unknown[] }
    return {
      id: row.id,
      title: row.title,
      screenCount: doc?.pages?.length ?? doc?.screens?.length ?? 0,
      updatedAt: row.updated_at,
    }
  })
  return NextResponse.json({ projects: items })
}

// POST /api/projects — 새 프로젝트 만들기
export async function POST(req: Request) {
  const sid = sessionId(req)
  if (!sid) return NextResponse.json({ error: "세션을 확인할 수 없어요." }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { title?: string; document?: ProjectGraph }
  const title = body.title?.trim() || "제목 없는 프로젝트"

  const supabase = await createBuilderClient(sid)
  const userId = await getAuthedUserId(supabase)
  // 생성 플로우는 document(ProjectGraph)를 함께 넘긴다 — 생성 결과를 한 번에 영속(유실 방지).
  // 로그인 사용자의 새 프로젝트는 user_id 소유로 만든다(insert with check: user_id=auth.uid()).
  const { data, error } = await supabase
    .from("wf_projects")
    .insert({
      session_id: sid,
      ...(userId ? { user_id: userId } : {}),
      title,
      ...(body.document ? { document: body.document } : {}),
    })
    .select("id")
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: "프로젝트를 만들지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    )
  }
  return NextResponse.json({ id: data.id }, { status: 201 })
}
