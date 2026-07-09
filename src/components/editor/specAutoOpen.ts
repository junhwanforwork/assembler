// ASM-077 — 선택 시 상세 플로팅 자동 오픈의 순수 로직.
// 창업자 지시("정보는 기본 꺼짐, 아이템 클릭 시 플로팅으로 뜬다")를 store 변경 없이 DetailOverlay 로컬 effect로
// 구현하기 위한 결정 함수. store 액션에 부수효과를 넣지 않기 위해(비클릭 syncSpecSelection 오작동 방지) 분리한다.

export type SpecSelection = {
  reqId: string | null
  featureId: string | null
  detailId: string | null
}

// 선택 경로의 가장 깊은 것 — 상세 기능 > 기능 > 요구사항. SpecInspector의 렌더 분기(#31·#35)와 같은 우선순위.
export function deepestSelectedId(sel: SpecSelection): string | null {
  return sel.detailId ?? sel.featureId ?? sel.reqId
}

// 최심 선택 id가 "사용자 클릭으로 새 값(non-null)"이 된 전이에서만 연다.
// - 초기 마운트/재렌더(prev===next): 안 연다(기본 꺼짐).
// - 선택 해제(next===null): 안 연다.
// - 비클릭 경로(SpecView.syncSpecSelection의 첫 요구사항 자동 보정)는 inspected를 "spec"으로 만들지 않는다
//   (selectSpec* 클릭만 inspected="spec"). 그래서 로드 시 자동 보정으로는 열리지 않는다(isSpecInspected 게이트).
export function shouldAutoOpenDetail(prev: string | null, next: string | null, isSpecInspected: boolean): boolean {
  return isSpecInspected && next !== null && next !== prev
}
