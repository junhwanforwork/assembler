import { NextResponse } from "next/server"
import { createBuilderClient, getAuthedUserId } from "@/lib/supabase/builder"
import type { Project, ProjectDocument } from "@/lib/types/builder"
import type { ProjectGraph } from "@/lib/types/assembler"

function sessionId(req: Request): string | null {
  return req.headers.get("x-session-id")
}

type Ctx = { params: Promise<{ id: string }> }

// GET /api/projects/[id] — 단일 프로젝트 불러오기
export async function GET(req: Request, { params }: Ctx) {
  const sid = sessionId(req)
  if (!sid) return NextResponse.json({ error: "세션을 확인할 수 없어요." }, { status: 400 })
  const { id } = await params

  const supabase = await createBuilderClient(sid)
  const userId = await getAuthedUserId(supabase)
  // RLS에 더해 앱 레벨에서도 소유권을 강제한다 — RLS 단일 의존 시 IDOR 노출(정책 누락·미적용 사고 대비).
  // 로그인=user_id 소유(승계 후 세션이 달라도 접근), 익명=세션 소유.
  const found = supabase
    .from("wf_projects")
    .select("id, session_id, title, document, created_at, updated_at")
    .eq("id", id)
  const { data, error } = await (userId ? found.eq("user_id", userId) : found.eq("session_id", sid)).single()

  if (error || !data) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없어요." }, { status: 404 })
  }

  const project: Project = {
    id: data.id,
    sessionId: data.session_id,
    title: data.title,
    document: data.document as ProjectDocument,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
  return NextResponse.json({ project })
}

// PUT /api/projects/[id] — 문서 통째 저장
export async function PUT(req: Request, { params }: Ctx) {
  const sid = sessionId(req)
  if (!sid) return NextResponse.json({ error: "세션을 확인할 수 없어요." }, { status: 400 })
  const { id } = await params

  const body = (await req.json().catch(() => null)) as
    | { title?: string; document?: ProjectDocument | ProjectGraph }
    | null
  if (!body || !body.document) {
    return NextResponse.json({ error: "저장할 내용을 확인할 수 없어요." }, { status: 400 })
  }

  const supabase = await createBuilderClient(sid)
  const userId = await getAuthedUserId(supabase)
  // RLS + 앱 레벨 소유권 가드(타인 프로젝트 덮어쓰기 차단) — 로그인=user_id, 익명=세션.
  const target = supabase
    .from("wf_projects")
    .update({ title: body.title, document: body.document })
    .eq("id", id)
  const { error } = await (userId ? target.eq("user_id", userId) : target.eq("session_id", sid))

  if (error) {
    return NextResponse.json(
      { error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    )
  }
  return NextResponse.json({ saved: true })
}

// DELETE /api/projects/[id] — 프로젝트 삭제
export async function DELETE(req: Request, { params }: Ctx) {
  const sid = sessionId(req)
  if (!sid) return NextResponse.json({ error: "세션을 확인할 수 없어요." }, { status: 400 })
  const { id } = await params

  const supabase = await createBuilderClient(sid)
  const userId = await getAuthedUserId(supabase)
  // RLS + 앱 레벨 소유권 가드(타인 프로젝트 삭제 차단) — 로그인=user_id, 익명=세션.
  const target = supabase.from("wf_projects").delete().eq("id", id)
  const { error } = await (userId ? target.eq("user_id", userId) : target.eq("session_id", sid))

  if (error) {
    return NextResponse.json(
      { error: "삭제하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    )
  }
  return NextResponse.json({ deleted: true })
}
