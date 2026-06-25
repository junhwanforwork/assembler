import type { LayerName } from "@/lib/graph/stream-protocol"

// 생성 진행 안내(ASS-204) — 스트리밍 레이어 신호를 실제 단계 카피로 매핑한다.
// 가짜 타이머(구 ASS-200)를 대체: 도착한 레이어가 곧 사용자에게 보이는 진행이다.
const LAYER_COPY: Record<LayerName, string> = {
  meta: "프로젝트를 정리하고 있어요",
  requirements: "요구사항·기능을 정의하고 있어요",
  pages: "화면과 와이어프레임을 그리고 있어요",
  apidata: "API·데이터를 잇고 있어요",
  userflow: "화면 흐름을 잇고 있어요",
}

// active 동안 진행 문구를 돌려준다. 첫 레이어 도착 전(생성 thinking 구간)엔 시작 안내로 빈 스피너의 멈춘 느낌을 줄인다.
export function useGenerationProgress(active: boolean, layer: LayerName | null): string | null {
  if (!active) return null
  return layer ? LAYER_COPY[layer] : "기획을 시작하고 있어요"
}
