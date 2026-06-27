import type { Activity, ActivityType } from "@/lib/types/assembler"
import type { AssemblerClient } from "./assembler"
import { toActivity } from "./assembler-rows"

// asm_activity 리포지토리 — 활동 타임라인 기록/조회. 소유권은 부모 RLS가 강제한다.
// SELECT * 금지(api.md) — 컬럼 명시.
const ACTIVITY_COLS = "id, product_id, workspace_id, type, metadata, created_at"

export type LogActivityInput = {
  productId: string
  workspaceId?: string | null
  type: ActivityType
  metadata?: Record<string, unknown>
}

export async function logActivity(c: AssemblerClient, input: LogActivityInput): Promise<void> {
  const { error } = await c.from("asm_activity").insert({
    product_id: input.productId,
    workspace_id: input.workspaceId ?? null,
    type: input.type,
    metadata: input.metadata ?? {},
  })
  if (error) throw error
}

// 라우트용 안전 로깅 — 절대 throw하지 않는다(활동 기록 실패가 메인 op를 깨뜨리면 안 됨).
export async function safeLogActivity(c: AssemblerClient, input: LogActivityInput): Promise<void> {
  try {
    await logActivity(c, input)
  } catch {
    // best-effort: 타임라인 기록 실패는 사용자 작업을 막지 않는다.
  }
}

export async function listActivity(c: AssemblerClient, productId: string, limit = 30): Promise<Activity[]> {
  const { data, error } = await c
    .from("asm_activity")
    .select(ACTIVITY_COLS)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map(toActivity)
}
