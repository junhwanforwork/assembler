"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useEditorData } from "@/hooks/useEditorData"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Button } from "@/components/ui/Button"
import { EditorClient } from "@/components/editor/EditorClient"
import s from "@/components/editor/editor.module.css"

// 에디터 — 스펙(워크스페이스) 하나를 연결된 구조로 보여준다.
export default function EditorPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = typeof params.id === "string" ? params.id : ""
  const { workspace, design, apis, dbTables, loading, error, reload } = useEditorData(id)
  const resetAll = useEditorStore((st) => st.resetAll)

  // 스펙 전환 시 UI 상태 전부 리셋(A-14) — 이전 스펙의 선택·필터가 부활하지 않게.
  useEffect(() => {
    resetAll()
  }, [id, resetAll])

  if (loading) return <div className={s.bootState}>불러오는 중이에요…</div>

  // 에러·부재 화면도 나갈 길이 있어야 한다(A-4 데드엔드 금지) — 재시도 + 대시보드 복귀.
  if (error) {
    return (
      <div className={s.bootState}>
        <div className={s.bootCard}>
          <div>스펙을 불러오지 못했어요. 네트워크 연결을 확인하고 다시 시도해 주세요.</div>
          <div className={s.bootActions}>
            <Button variant="filled" size="sm" onClick={reload}>
              다시 시도하기
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              대시보드로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className={s.bootState}>
        <div className={s.bootCard}>
          <div>스펙을 찾을 수 없어요. 삭제됐거나 주소가 잘못됐을 수 있어요.</div>
          <div className={s.bootActions}>
            <Button variant="filled" size="sm" onClick={() => router.push("/")}>
              대시보드로 돌아가기
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <EditorClient workspace={workspace} design={design} apis={apis} dbTables={dbTables} />
}
