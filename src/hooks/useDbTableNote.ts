"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api/client"
import type { DbTableNote } from "@/lib/types/assembler"

// DB Learning — 테이블 호버 AI 설명의 클라이언트 상태.
// GET(저장된 노트) → 없으면 generate(POST) → 사용자가 고치면 save(PATCH).
// 설명은 AI 추정(사실 아님)이라 화면에서 'AI 추정' 배지로 표시한다.

type Status = "loading" | "ready" | "generating" | "saving" | "error"

function notePath(workspaceId: string, tableId: string): string {
  return `/api/workspaces/${workspaceId}/db-tables/${tableId}/note`
}

export function useDbTableNote(workspaceId: string, tableId: string) {
  const [note, setNote] = useState<DbTableNote | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [error, setError] = useState<ApiError | null>(null)

  // 저장된 노트를 읽는다(없으면 null). 호출부가 tableId를 key로 줘 테이블 변경 시 컴포넌트가 리마운트되므로
  // 초기 state("loading"·null)가 곧 리셋 — 이펙트 안에서 동기 setState로 다시 비우지 않는다(cascading render 방지).
  useEffect(() => {
    let cancelled = false
    api
      .get<{ note: DbTableNote | null }>(notePath(workspaceId, tableId))
      .then((r) => {
        if (cancelled) return
        setNote(r.note)
        setStatus("ready")
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof ApiError ? e : new ApiError("network_error", 0))
        setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId, tableId])

  // 성공 여부를 반환 — 호출부(편집 닫기 등)가 실패 시 흐름을 멈출 수 있게 한다.
  const generate = useCallback(async (): Promise<boolean> => {
    setStatus("generating")
    setError(null)
    try {
      const r = await api.post<{ note: DbTableNote }>(notePath(workspaceId, tableId), {})
      setNote(r.note)
      setStatus("ready")
      return true
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("network_error", 0))
      setStatus("error")
      return false
    }
  }, [workspaceId, tableId])

  const save = useCallback(
    async (explanation: string): Promise<boolean> => {
      setStatus("saving")
      setError(null)
      try {
        const r = await api.patch<{ note: DbTableNote }>(notePath(workspaceId, tableId), { explanation })
        setNote(r.note)
        setStatus("ready")
        return true
      } catch (e) {
        setError(e instanceof ApiError ? e : new ApiError("network_error", 0))
        setStatus("error")
        return false
      }
    },
    [workspaceId, tableId]
  )

  return { note, status, error, generate, save }
}
