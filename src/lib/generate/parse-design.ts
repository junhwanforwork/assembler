import type { WorkspaceDesign } from "@/lib/types/assembler"
import { findDanglingRefs, type CodeTruthIds } from "@/lib/types/design"
import { extractJsonObject } from "@/lib/anthropic-json"
import { parseDesign, type Parsed } from "@/lib/api/validate"

// 코드-진실 참조 환각 제거 — 모델이 지어낸 api/db id를 알려진 집합으로 걸러낸다.
function sanitizeCodeTruthRefs(design: WorkspaceDesign, codeTruth: CodeTruthIds): WorkspaceDesign {
  return {
    ...design,
    features: design.features.map((f) => ({
      ...f,
      apiIds: f.apiIds.filter((id) => codeTruth.apiIds.has(id)),
      dbTableIds: (f.dbTableIds ?? []).filter((id) => codeTruth.dbTableIds.has(id)),
    })),
    elements: design.elements.map((e) => ({
      ...e,
      apiIds: e.apiIds.filter((id) => codeTruth.apiIds.has(id)),
      dbTableIds: e.dbTableIds.filter((id) => codeTruth.dbTableIds.has(id)),
    })),
  }
}

const EMPTY_CODE_TRUTH: CodeTruthIds = { apiIds: new Set(), dbTableIds: new Set() }

// AI 출력 텍스트 → 신뢰 가능한 디자인 그래프.
// 코드-진실(api/db) 참조 환각은 제거하고, 내부 연결(req·page·wireframe·element)은 무결을 강제한다.
export function parseGeneratedDesign(text: string, codeTruth: CodeTruthIds = EMPTY_CODE_TRUTH): Parsed<WorkspaceDesign> {
  let raw: unknown
  try {
    raw = JSON.parse(extractJsonObject(text))
  } catch {
    return { ok: false, error: "invalid_json" }
  }

  // ASM-052 와이어 후퇴 — 개정 계약은 wireframes/elements를 방출하지 않는다. 저장 경계(parseDesign)는
  // 6개 컬렉션 배열을 요구하므로 생성 경로에서만 누락분을 []로 보정한다(전체 저장 PUT은 그대로 엄격).
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>
    record.wireframes ??= []
    record.elements ??= []
  }

  const shaped = parseDesign(raw)
  if (!shaped.ok) return shaped

  const design = sanitizeCodeTruthRefs(shaped.value, codeTruth)

  // 환각 제거 후 남는 끊어진 참조는 전부 내부 연결 문제 = 일관성 없는 그래프.
  if (findDanglingRefs(design, codeTruth).length > 0) return { ok: false, error: "incoherent_graph" }

  return { ok: true, value: design }
}
