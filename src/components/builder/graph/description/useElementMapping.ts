import { useMemo } from "react"
import type { ProjectGraph, UIElement, UIElementResult } from "@/lib/types/assembler"
import { isMappingComplete } from "@/lib/graph/selectors"

// result.kind → 사람이 읽는 라벨. MappingChip·DescriptionItem 공유 단일 출처.
export const RESULT_LABEL: Record<UIElementResult["kind"], string> = {
  navigate: "이동",
  stateChange: "상태 변화",
  toast: "토스트",
  inlineError: "인라인 에러",
  none: "없음",
}

export type ElementMapping = {
  /** 동작 텍스트 (없으면 null). */
  action: string | null
  /** API 요약 — 1개면 "method path", 복수면 "API N", 없으면 null. */
  apiText: string | null
  /** DB 요약 — 1개면 name, 복수면 "DB N", 없으면 null. */
  dbText: string | null
  /** result.kind 라벨. */
  resultLabel: string
  /** result 상세 — navigate면 대상 Page명, 그 외엔 detail. 없으면 null. */
  resultDetail: string | null
  /** 화면에 노출되는 정보 요약 — description 우선, 없으면 props(label/text/placeholder). */
  exposure: string | null
  /** 상태 라벨 목록 (빈 라벨 제외). */
  states: string[]
  /** 매핑 완성 여부 (selectors.isMappingComplete 위임). */
  complete: boolean
}

// props에서 사람이 볼 노출 텍스트 후보(label/text/placeholder)를 뽑는다. 문자열만 인정.
function propLabel(props: Record<string, unknown>): string | null {
  for (const key of ["label", "text", "placeholder"]) {
    const v = props[key]
    if (typeof v === "string" && v.trim().length > 0) return v.trim()
  }
  return null
}

// UIElement 매핑을 표시용으로 도출 — MappingChip 칩과 DescriptionItem 스펙이 같은 출처를 쓰도록 단일화.
export function useElementMapping(element: UIElement, graph: ProjectGraph): ElementMapping {
  return useMemo(() => {
    const apis = element.apiIds
      .map((id) => graph.apis.find((a) => a.id === id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
    const dbs = element.databaseIds
      .map((id) => graph.databases.find((d) => d.id === id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d))

    const result = element.result
    // navigate는 대상 Page명을 정본으로, 그 외 kind는 detail을 상세로.
    const resultDetail =
      result.kind === "navigate"
        ? graph.pages.find((p) => p.id === result.toPageId)?.name ?? null
        : result.kind !== "none"
          ? result.detail?.trim() || null
          : null

    return {
      action: element.action.trim().length > 0 ? element.action : null,
      apiText:
        apis.length === 0 ? null : apis.length === 1 ? `${apis[0].method} ${apis[0].path}` : `API ${apis.length}`,
      dbText: dbs.length === 0 ? null : dbs.length === 1 ? dbs[0].name : `DB ${dbs.length}`,
      resultLabel: RESULT_LABEL[element.result.kind],
      resultDetail,
      exposure: element.description.trim().length > 0 ? element.description.trim() : propLabel(element.props),
      states: element.states.map((s) => s.label.trim()).filter((l) => l.length > 0),
      complete: isMappingComplete(element),
    }
  }, [element, graph])
}
