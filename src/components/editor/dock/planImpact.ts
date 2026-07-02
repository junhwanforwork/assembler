import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangeOp } from "@/lib/types/chat"
import { buildImpactIndex, collectImpact, type ImpactRef } from "@/lib/assembler/impact"
import { resolveSuggestionJump, type SuggestionJump } from "../suggestionsTarget"

// "영향 범위" 섹션(ASM-029)의 표시 모델 — 도크 전용(planDiff와 같은 층위, 적용 로직과 무관).
// op별로 직접 변경 대상 + 전이 영향(impact.ts)을 칩으로 푼다. 영향 0건 op는 행을 만들지 않는다.

export type ImpactChip = {
  id: string
  kindLabel: string
  name: string
  // 명세 선택(store)이 비출 수 있는 대상만 점프 — 요구사항·기능. 나머지는 정적 칩(suggestionsTarget과 동일 규칙).
  jump: SuggestionJump | null
}

export type ImpactRow = {
  opId: string
  target: ImpactChip
  impacts: ImpactChip[]
}

const KIND_LABEL: Record<ImpactRef["collection"], string> = {
  requirements: "요구사항",
  features: "기능",
  pages: "페이지",
  flows: "플로우",
  wireframes: "와이어프레임",
  elements: "요소",
}

function refName(design: WorkspaceDesign, ref: ImpactRef): string {
  switch (ref.collection) {
    case "requirements":
      return design.requirements.find((r) => r.id === ref.id)?.title ?? ref.id
    case "features":
      return design.features.find((f) => f.id === ref.id)?.name ?? ref.id
    case "pages":
      return design.pages.find((p) => p.id === ref.id)?.name ?? ref.id
    case "flows":
      return design.flows.find((f) => f.id === ref.id)?.name ?? ref.id
    case "wireframes":
      // 와이어프레임은 이름이 없다 — 소유 페이지 이름으로 부른다(카디널 룰 2: Page 1—1 Wireframe).
      return design.pages.find((p) => p.wireframeId === ref.id)?.name ?? ref.id
    case "elements":
      return design.elements.find((e) => e.id === ref.id)?.label ?? ref.id
  }
}

function toChip(design: WorkspaceDesign, ref: ImpactRef): ImpactChip {
  const jump =
    ref.collection === "requirements"
      ? resolveSuggestionJump(design, "requirement", ref.id)
      : ref.collection === "features"
        ? resolveSuggestionJump(design, "feature", ref.id)
        : null
  return { id: ref.id, kindLabel: KIND_LABEL[ref.collection], name: refName(design, ref), jump }
}

export function buildImpactRows(ops: ChangeOp[], design: WorkspaceDesign): ImpactRow[] {
  const index = buildImpactIndex(design)
  const rows: ImpactRow[] = []
  for (const op of ops) {
    const target: ImpactRef = { collection: op.collection, id: op.targetId }
    const impacts = collectImpact(index, [target])
    if (impacts.length === 0) continue
    rows.push({ opId: op.id, target: toChip(design, target), impacts: impacts.map((ref) => toChip(design, ref)) })
  }
  return rows
}
