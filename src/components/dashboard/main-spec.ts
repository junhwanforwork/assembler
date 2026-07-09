import type { Workspace } from "@/lib/types/assembler"

// 연결 후 에디터 직행(ASM-066) — POST /api/workspaces {ifNone} 응답 판별.
// 생성이면 Workspace 객체가 그대로 온다(route.ts:52 → toWorkspace: id 포함),
// 기존 스펙이 있으면 { skipped: true }(route.ts:43). id가 없는 비정상 응답은
// 직행 대신 안전한 잔류(null)로 처리한다.
export function createdMainSpecId(res: Partial<Workspace> & { skipped?: boolean }): string | null {
  if (res.skipped || !res.id) return null
  return res.id
}
