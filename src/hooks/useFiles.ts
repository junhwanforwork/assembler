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

  const reload = useCallback(async () => {
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
      setFiles(results.flatMap((r) => r.workspaces))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
    // idsKey가 의존성 — ids 배열 정체성 대신 내용으로 비교.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  useEffect(() => {
    // selectedId/projects 변경 시 재패칭(의도된 setState) — 외부 시스템(API) 동기화.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
  }, [reload])

  return { files, loading, error, reload }
}
