"use client"

import { useCallback, useEffect, useState } from "react"
import { api, type FileSummary, type Product } from "@/lib/api/client"

// 파일(워크스페이스) 목록. selectedId가 있으면 그 프로젝트, null이면 전체(모든 프로젝트 합본).
export function useFiles(selectedId: string | null, projects: Product[]) {
  const [files, setFiles] = useState<FileSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const ids = selectedId ? [selectedId] : projects.map((p) => p.id)
  const idsKey = ids.join(",")

  // isCurrent=false 면 늦게 도착한 이전 프로젝트 선택의 응답 → 상태 커밋을 버린다(레이스 가드).
  const load = useCallback(async (isCurrent: () => boolean) => {
    if (ids.length === 0) {
      setFiles([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const results = await Promise.all(
        ids.map((id) => api.get<{ workspaces: FileSummary[] }>(`/api/workspaces?productId=${id}`))
      )
      if (!isCurrent()) return
      setFiles(results.flatMap((r) => r.workspaces))
    } catch {
      if (isCurrent()) setError(true)
    } finally {
      if (isCurrent()) setLoading(false)
    }
    // idsKey가 의존성 — ids 배열 정체성 대신 내용으로 비교.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  // 외부 호출용 reload — 항상 현재 마운트로 간주(언마운트되면 어차피 안 불림).
  const reload = useCallback(() => load(() => true), [load])

  useEffect(() => {
    // selectedId/projects 변경 시 재패칭(의도된 setState) — 외부 시스템(API) 동기화.
    // 직전 run은 active=false로 무효화 — 빠른 탭 전환 시 늦은 응답이 최신 목록을 덮지 않게.
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(() => active)
    return () => {
      active = false
    }
  }, [load])

  return { files, loading, error, reload }
}
