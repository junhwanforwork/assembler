"use client"

import { useParams } from "next/navigation"
import { useEditorData } from "@/hooks/useEditorData"
import { EditorClient } from "@/components/editor/EditorClient"
import s from "@/components/editor/editor.module.css"

// 에디터 — 워크스페이스(파일) 하나를 연결된 구조로 보여준다. 읽기 전용(Phase 1).
export default function EditorPage() {
  const params = useParams<{ id: string }>()
  const id = typeof params.id === "string" ? params.id : ""
  const { workspace, design, apis, dbTables, loading, error } = useEditorData(id)

  if (loading) return <div className={s.bootState}>불러오는 중이에요…</div>
  if (error) return <div className={s.bootState}>불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>
  if (!workspace) return <div className={s.bootState}>워크스페이스를 찾을 수 없어요.</div>

  return <EditorClient workspace={workspace} design={design} apis={apis} dbTables={dbTables} />
}
