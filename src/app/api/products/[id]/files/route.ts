import { runGenerate } from "@/lib/generate/run"
import { designCounts } from "@/lib/types/design"
import { createAssemblerClient } from "@/lib/supabase/assembler"
import { createWorkspace, getProduct, listApis, listDbTables, updateDesign } from "@/lib/supabase/assembler-repo"
import { safeLogActivity } from "@/lib/supabase/activity-repo"
import { getSessionId, jsonError, jsonOk, jsonServerError, MAX_IDEA_LENGTH } from "@/lib/api/http"

type Ctx = { params: Promise<{ id: string }> }

// 파일명 = 아이디어 한 줄 요약(과하게 길면 자른다).
function fileNameFromIdea(idea: string): string {
  const oneLine = idea.trim().replace(/\s+/g, " ")
  return oneLine.length > 50 ? `${oneLine.slice(0, 50)}…` : oneLine
}

// 프롬프트 → 파일 생성(원자적): 생성 → 워크스페이스 + design 저장 → 파일 요약 반환.
// 이 프로젝트(메인)의 코드-진실을 참조로 넘긴다.
export async function POST(request: Request, { params }: Ctx) {
  const sessionId = getSessionId(request)
  if (!sessionId) return jsonError("missing_session", 400)
  const { id: productId } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError("invalid_body", 400)
  }
  const idea = (body as { idea?: unknown })?.idea
  if (typeof idea !== "string" || idea.trim().length === 0 || idea.length > MAX_IDEA_LENGTH) return jsonError("invalid_idea", 400)

  const c = await createAssemblerClient(sessionId)

  let apis, dbTables
  try {
    if (!(await getProduct(c, productId))) return jsonError("not_found", 404)
    ;[apis, dbTables] = await Promise.all([listApis(c, productId), listDbTables(c, productId)])
  } catch (err) {
    return jsonServerError("products/[id]/files", err)
  }

  const result = await runGenerate(idea.trim(), apis, dbTables)
  if (!result.ok) return jsonError(result.error, result.status)

  try {
    const workspace = await createWorkspace(c, { productId, name: fileNameFromIdea(idea) })
    await updateDesign(c, workspace.id, result.design)
    await safeLogActivity(c, {
      productId,
      workspaceId: workspace.id,
      type: "file_generated",
      metadata: { name: workspace.name, ...designCounts(result.design) },
    })
    return jsonOk({ file: { ...workspace, counts: designCounts(result.design) }, usage: result.usage }, 201)
  } catch (err) {
    return jsonServerError("products/[id]/files", err)
  }
}
