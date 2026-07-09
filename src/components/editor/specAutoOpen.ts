// ASM-077 / Wave A — 선택 시 상세 플로팅 자동 오픈의 순수 로직.
// 창업자 지시("정보는 기본 꺼짐, 아이템 클릭 시 플로팅으로 뜬다")를 store 클릭 카운터(specSelectClickSeq) 기반으로 판정.
// store selectSpec*만 카운터를 올리므로(비클릭 syncSpecSelection·null 해제는 안 올림) "사용자 클릭" 전이만 잡는다.
// 같은 항목 재클릭도 카운터가 오르니, 닫은 뒤 재클릭 재오픈이 자연히 된다(sticky inspected 방식의 오재오픈 제거).

export type SpecSelection = {
  reqId: string | null
  featureId: string | null
  detailId: string | null
}

// 선택 경로의 가장 깊은 것 — 상세 기능 > 기능 > 요구사항. (SpecInspector 렌더 분기와 동일 우선순위.)
export function deepestSelectedId(sel: SpecSelection): string | null {
  return sel.detailId ?? sel.featureId ?? sel.reqId
}

// 클릭 카운터가 증가한 전이에서만 연다.
// - 초기 마운트/재렌더(prev===next): 안 연다(기본 꺼짐).
// - 비클릭 보정(syncSpecSelection)·선택 해제(null): 카운터를 안 올리므로 안 연다.
// - 닫은 뒤 필터 보정으로 선택 id가 바뀌어도 카운터는 그대로 → 스스로 재오픈하지 않는다.
export function shouldAutoOpenDetail(prevClickSeq: number, nextClickSeq: number): boolean {
  return nextClickSeq > prevClickSeq
}
