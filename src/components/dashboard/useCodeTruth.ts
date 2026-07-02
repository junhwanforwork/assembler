"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api/client"
import type { Api, DbTable } from "@/lib/types/assembler"

// 선택 프로젝트에 코드-진실(API·DB)이 있는지 — Composer 카피 조건화(C-4).
// 미확인(로딩·실패) 동안은 false: "코드를 바탕으로"는 확인된 경우에만 약속한다(과약속 금지).
// reload는 수동 싱크-인(ASM-026) 성공 직후 재판정용 — productId 변경 없이도 다시 확인한다.
export function useCodeTruth(productId: string | null): { hasCodeTruth: boolean; reload: () => void } {
  const [hasCodeTruth, setHasCodeTruth] = useState(false)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    // 프로젝트 전환 즉시 리셋 — 이전 프로젝트의 판정이 새 프로젝트에 잔존하지 않게.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(API) 동기화
    setHasCodeTruth(false)
    if (!productId) return
    let active = true
    void (async () => {
      try {
        const [apisRes, dbRes] = await Promise.all([
          api.get<{ apis: Api[] }>(`/api/products/${productId}/apis`),
          api.get<{ dbTables: DbTable[] }>(`/api/products/${productId}/db-tables`),
        ])
        if (active) setHasCodeTruth(apisRes.apis.length > 0 || dbRes.dbTables.length > 0)
      } catch {
        // 실패는 조용히 일반 카피 유지 — 카피 분기용 신호라 에러 표면이 필요 없다.
      }
    })()
    return () => {
      active = false
    }
  }, [productId, version])

  return { hasCodeTruth, reload }
}
