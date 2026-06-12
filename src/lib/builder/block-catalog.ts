import type { BlockType } from "@/lib/types/builder"

// 팔레트·BlockRenderer·인스펙터가 공유하는 블록 정의 단일 출처.
// 새 블록을 추가하려면 여기에 한 줄만 더하면 세 군데가 모두 따라온다.

export interface BlockDef {
  type: BlockType
  /** 팔레트에 표시되는 이름(명사). */
  label: string
  /** 블록을 처음 떨굴 때의 기본 props. */
  defaultProps: Record<string, unknown>
}

export const BLOCK_DEFS: BlockDef[] = [
  { type: "heading", label: "제목", defaultProps: { text: "제목" } },
  { type: "text", label: "본문", defaultProps: { text: "본문 텍스트" } },
  { type: "button", label: "버튼", defaultProps: { label: "버튼", variant: "solid" } },
  { type: "text-input", label: "입력 필드", defaultProps: { label: "라벨", placeholder: "입력하세요" } },
  { type: "textarea", label: "텍스트 영역", defaultProps: { label: "라벨", placeholder: "여러 줄을 입력하세요" } },
  { type: "dropdown", label: "드롭다운", defaultProps: { label: "선택", options: ["옵션 1", "옵션 2"] } },
  { type: "toggle", label: "토글", defaultProps: { label: "토글", on: false } },
  { type: "badge", label: "뱃지", defaultProps: { text: "뱃지", status: "neutral" } },
  { type: "number-stepper", label: "숫자 스테퍼", defaultProps: { value: 0 } },
  { type: "divider", label: "구분선", defaultProps: {} },
]

export const BLOCK_DEF_MAP = Object.fromEntries(
  BLOCK_DEFS.map((d) => [d.type, d])
) as Record<BlockType, BlockDef>
