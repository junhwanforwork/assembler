"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api/client"
import type { Api, DbTable, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import { createEmptyDesign } from "@/lib/types/design"

// 워크스페이스 → productId 확보 → design·apis·db-tables 병렬 로드.
// 전부 읽기 전용(이번 슬라이스에선 저장 없음).
export function useEditorData(workspaceId: string) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [design, setDesign] = useState<WorkspaceDesign>(createEmptyDesign())
  const [apis, setApis] = useState<Api[]>([])
  const [dbTables, setDbTables] = useState<DbTable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // isCurrent=false 면 늦게 도착한 이전 워크스페이스 응답 → 상태 커밋을 버린다(레이스 가드).
  const load = useCallback(async (isCurrent: () => boolean) => {
    if (!workspaceId) {
      setError(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const ws = await api.get<Workspace>(`/api/workspaces/${workspaceId}`)
      const [designRes, apiRes, dbRes] = await Promise.all([
        api.get<{ design: WorkspaceDesign }>(`/api/workspaces/${workspaceId}/design`),
        api.get<{ apis: Api[] }>(`/api/products/${ws.productId}/apis`),
        api.get<{ dbTables: DbTable[] }>(`/api/products/${ws.productId}/db-tables`),
      ])
      if (!isCurrent()) return
      setWorkspace(ws)
      setDesign(designRes.design ?? createEmptyDesign())
      setApis(apiRes.apis ?? [])
      setDbTables(dbRes.dbTables ?? [])
    } catch {
      if (isCurrent()) setError(true)
    } finally {
      if (isCurrent()) setLoading(false)
    }
  }, [workspaceId])

  // 외부 호출용 reload — 항상 현재 마운트로 간주(언마운트되면 어차피 안 불림).
  const reload = useCallback(() => load(() => true), [load])

  useEffect(() => {
    // workspaceId 변경 시 재패칭(외부 시스템 동기화). 직전 run은 active=false로 무효화.
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(() => active)
    return () => {
      active = false
    }
  }, [load])

  return { workspace, design, apis, dbTables, loading, error, reload }
}
