import { api, ApiError } from "@/lib/api/client"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { DanglingRef, DesignPatch } from "@/lib/types/design"

// 스코프드 PATCH design 공용 헬퍼 — 편집 인터랙션(ASM-025)·변경 계획 도크(#62)의 단일 저장 경로.
// 항상 최신 GET 위에 패치를 다시 만들어 보낸다(stale 클라 상태가 다른 저장을 덮는 창 최소화).
// 409 conflict(CAS)는 최신 GET→재적용→재시도 1회 — 그래도 겹치면 사용자에게 재시도를 넘긴다.
// 완전한 차단은 PATCH 계약에 버전 토큰이 필요 — BE 범위라 후속(ChangePlanCard에서 이관된 노트).

export type DesignPatchOutcome =
  | { ok: true; design: WorkspaceDesign }
  // stale — 최신 스펙에서 패치를 만들 수 없음(대상 소실·계획 불일치). 저장 없이 끝났다.
  | { ok: false; kind: "stale" }
  | { ok: false; kind: "conflict" }
  | { ok: false; kind: "dangling"; refs: DanglingRef[] }
  | { ok: false; kind: "generic" }

// 실패 분기만 — UI 에러 표시(PatchErrorNote)가 받는 타입.
export type DesignPatchFailure = Exclude<DesignPatchOutcome, { ok: true }>

export function extractDanglingRefs(details: unknown): DanglingRef[] {
  if (typeof details !== "object" || details === null) return []
  const refs = (details as { refs?: unknown }).refs
  return Array.isArray(refs) ? (refs as DanglingRef[]) : []
}

export async function patchDesignScoped(
  workspaceId: string,
  // 최신 저장본 → 스코프드 패치. null이면 지금 스펙에 적용 불가(취소).
  build: (latest: WorkspaceDesign) => DesignPatch | null,
  // GET·PATCH가 돌려준 그래프를 즉시 반영 — 클라이언트 스토어가 서버와 어긋나지 않게.
  onDesign: (design: WorkspaceDesign) => void,
): Promise<DesignPatchOutcome> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const latest = await api.get<{ design: WorkspaceDesign }>(`/api/workspaces/${workspaceId}/design`)
      onDesign(latest.design)
      const patch = build(latest.design)
      if (!patch) return { ok: false, kind: "stale" }
      const res = await api.patch<{ saved: boolean; design: WorkspaceDesign }>(
        `/api/workspaces/${workspaceId}/design`,
        patch,
      )
      onDesign(res.design)
      return { ok: true, design: res.design }
    } catch (err) {
      if (err instanceof ApiError && err.code === "conflict") {
        if (attempt === 0) continue
        return { ok: false, kind: "conflict" }
      }
      if (err instanceof ApiError && err.code === "dangling_refs") {
        return { ok: false, kind: "dangling", refs: extractDanglingRefs(err.details) }
      }
      return { ok: false, kind: "generic" }
    }
  }
  return { ok: false, kind: "conflict" }
}
