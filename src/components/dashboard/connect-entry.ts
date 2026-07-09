import type { Product } from "@/lib/api/client"

export type ConnectEntryMode = "target" | "pick" | "create"

// 코드 연결 진입 분기(ASM-066 추가지시). 이전엔 "선택 여부"만 봐서, 프로젝트가 여럿인데
// '전체' 탭(미선택)에서 진입하면 기존 프로젝트를 고를 기회 없이 새 프로젝트 생성으로 직행했다
// (중복 프로젝트 생성). 존재까지 함께 봐 3갈래로 나눈다:
// - target: 선택된 프로젝트가 있으면 그대로 연결.
// - pick:   프로젝트는 있는데 미선택이면 기존 프로젝트를 고르거나 새로 만들 기회를 준다.
// - create: 하나도 없으면 새로 만든다.
export function connectEntryMode(selectedProject: Product | null, projects: Product[]): ConnectEntryMode {
  if (selectedProject) return "target"
  if (projects.length > 0) return "pick"
  return "create"
}
