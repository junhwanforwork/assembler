"use client"

import { useCallback, useEffect, useState } from "react"
import { api, ApiError } from "@/lib/api/client"
import { getCachedApiNote, setCachedApiNote } from "@/lib/api-learning/note-cache"
import type { ApiNote } from "@/lib/types/assembler"

// API 해석(ASM-064) — 엔드포인트 AI 설명의 클라이언트 상태(useDbTableNote 미러 + 워크스페이스 캐시).
// GET(저장된 노트) → 없으면 generate(POST, 유료·명시 트리거만) → 사용자가 고치면 save(PATCH).
// 캐시를 먼저 봐서 같은 노트를 셀·툴팁이 이중 GET 하지 않는다. 실패는 캐시하지 않는다(다음에 재시도).

type Status = "loading" | "ready" | "generating" | "saving" | "error"

function notePath(workspaceId: string, apiId: string): string {
  return `/api/workspaces/${workspaceId}/apis/${apiId}/note`
}

export function useApiNote(workspaceId: string, apiId: string) {
  // lazy init — 캐시 히트면 GET 없이 바로 ready(서버 렌더에선 캐시 가드로 항상 미캐시 → loading).
  const [note, setNote] = useState<ApiNote | null>(() => getCachedApiNote(workspaceId, apiId) ?? null)
  const [status, setStatus] = useState<Status>(() => (getCachedApiNote(workspaceId, apiId) !== undefined ? "ready" : "loading"))
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    let cancelled = false
    // 캐시 판독도 마이크로태스크에서 — 이펙트 동기 setState 금지(react-hooks/set-state-in-effect) 준수.
    // 캐시 히트가 lazy init과 같은 값이면 React가 재렌더를 생략하고, 다른 인스턴스가 그 사이 채운
    // 캐시(셀·툴팁 동시 마운트 경쟁)도 여기서 잡혀 loading에 갇히지 않는다.
    Promise.resolve()
      .then(() => {
        const cached = getCachedApiNote(workspaceId, apiId)
        if (cached !== undefined) return cached
        return api.get<{ note: ApiNote | null }>(notePath(workspaceId, apiId)).then((r) => r.note)
      })
      .then((loadedNote) => {
        // 언마운트 후 늦게 온 응답은 캐시에 쓰지 않는다 — 재생성 직후를 stale 값으로 되채우는 창 차단.
        if (cancelled) return
        setCachedApiNote(workspaceId, apiId, loadedNote)
        setNote(loadedNote)
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
  }, [workspaceId, apiId])

  // 성공 여부를 반환 — 호출부가 실패 시 흐름을 멈출 수 있게 한다.
  const generate = useCallback(async (): Promise<boolean> => {
    setStatus("generating")
    setError(null)
    try {
      const r = await api.post<{ note: ApiNote }>(notePath(workspaceId, apiId), {})
      setCachedApiNote(workspaceId, apiId, r.note)
      setNote(r.note)
      setStatus("ready")
      return true
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("network_error", 0))
      setStatus("error")
      return false
    }
  }, [workspaceId, apiId])

  const save = useCallback(
    async (explanation: string): Promise<boolean> => {
      setStatus("saving")
      setError(null)
      try {
        const r = await api.patch<{ note: ApiNote }>(notePath(workspaceId, apiId), { explanation })
        setCachedApiNote(workspaceId, apiId, r.note)
        setNote(r.note)
        setStatus("ready")
        return true
      } catch (e) {
        setError(e instanceof ApiError ? e : new ApiError("network_error", 0))
        setStatus("error")
        return false
      }
    },
    [workspaceId, apiId]
  )

  return { note, status, error, generate, save }
}
