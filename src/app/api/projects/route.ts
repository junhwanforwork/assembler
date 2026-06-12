import { NextResponse } from "next/server"
import { createBuilderClient } from "@/lib/supabase/builder"
import type { ProjectDocument, ProjectListItem } from "@/lib/types/builder"

function sessionId(req: Request): string | null {
  return req.headers.get("x-session-id")
}

// GET /api/projects — 내 프로젝트 목록
export async function GET(req: Request) {
  const sid = sessionId(req)
  if (!sid) return NextResponse.json({ error: "세션을 확인할 수 없어요." }, { status: 400 })

  const supabase = await createBuilderClient(sid)
  const { data, error } = await supabase
    .from("wf_projects")
    .select("id, title, document, updated_at")
    .order("updated_at", { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: "프로젝트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    )
  }

  const items: ProjectListItem[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    screenCount: (row.document as ProjectDocument)?.screens?.length ?? 0,
    updatedAt: row.updated_at,
  }))
  return NextResponse.json({ projects: items })
}

// POST /api/projects — 새 프로젝트 만들기
export async function POST(req: Request) {
  const sid = sessionId(req)
  if (!sid) return NextResponse.json({ error: "세션을 확인할 수 없어요." }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { title?: string }
  const title = body.title?.trim() || "제목 없는 프로젝트"

  const supabase = await createBuilderClient(sid)
  const { data, error } = await supabase
    .from("wf_projects")
    .insert({ session_id: sid, title })
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
