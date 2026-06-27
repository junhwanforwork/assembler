import { createAssemblerClient } from "@/lib/supabase/assembler"
import { listActivity } from "@/lib/supabase/activity-repo"
import { getSessionId, jsonError, jsonOk } from "@/lib/api/http"

type Ctx = { params: Promise<{ id: string }> }

// 제품 활동 타임라인(최신순). 소유권은 부모 RLS에 위임 — 권한 밖이면 빈 목록.
export async function GET(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id } = await params
  const c = await createAssemblerClient(sessionId)
  try {
    return jsonOk({ activity: await listActivity(c, id) })
  } catch {
    return jsonError("server_error", 500)
  }
}
