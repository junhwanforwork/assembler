import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangePlan, DesignCollectionKey } from "@/lib/types/chat"
import type { Parsed } from "@/lib/api/validate"

// 변경 계획 적용(순수) — 도크 "적용하기" 경로의 단일 출처.
// 결과의 touched 컬렉션만 스코프드 PATCH(ASM-010)로 보내면 저장까지 이어진다.
// 참조 무결성(dangling)은 여기서 검사하지 않는다 — PATCH의 findDanglingRefs(409)가 최종 가드.

type Item = { id: string }

export type AppliedPlan = {
  design: WorkspaceDesign
  touched: DesignCollectionKey[]
}

export function applyChangePlan(design: WorkspaceDesign, plan: ChangePlan): Parsed<AppliedPlan> {
  // 컬렉션 단위 얕은 복사 — op가 건드리는 배열만 새로 만든다(원본 불변).
  const next: Record<DesignCollectionKey, Item[]> = {
    requirements: [...design.requirements],
    features: [...design.features],
    pages: [...design.pages],
    flows: [...design.flows],
    wireframes: [...design.wireframes],
    elements: [...design.elements],
  }
  const touched: DesignCollectionKey[] = []

  for (const op of plan.ops) {
    const rows = next[op.collection]
    const index = rows.findIndex((item) => item.id === op.targetId)

    if (op.action === "remove") {
      if (index < 0) return { ok: false, error: "plan_conflict" }
      rows.splice(index, 1)
    } else {
      // add/update는 payload(항목 전체)가 필수 — 살균을 안 거친 계획이 흘러들어도 여기서 막는다.
      if (op.payload === null) return { ok: false, error: "plan_conflict" }
      const item = { ...op.payload, id: op.targetId } as Item
      if (op.action === "add") {
        if (index >= 0) return { ok: false, error: "plan_conflict" }
        rows.push(item)
      } else {
        if (index < 0) return { ok: false, error: "plan_conflict" }
        rows[index] = item
      }
    }
    if (!touched.includes(op.collection)) touched.push(op.collection)
  }

  return { ok: true, value: { design: next as unknown as WorkspaceDesign, touched } }
}
