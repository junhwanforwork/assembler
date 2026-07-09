"use client"

import type * as React from "react"
import { InsightCard } from "@/components/ui/InsightCard"
import { Tooltip } from "@/components/ui/Tooltip"
import { useApiNote } from "@/hooks/useApiNote"
import s from "./ApiNoteTip.module.css"

// API 해석 호버 툴팁(ASM-064) — 계약 동결(패킷 §6, DocView 교체는 오케스트레이터 통합 몫).
// GET 전용(생성 없음 — 유료 트리거는 데이터 뷰의 명시 버튼만). 실패는 조용히 fallback 렌더(호버 핫패스).
// 내용 컴포넌트는 Tooltip이 hover 시에만 마운트한다(DocView TableNoteTip 문법) — 마운트 시 GET만.
export function ApiNoteTip(props: {
  workspaceId: string
  apiId: string
  fallbackSummary?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip
      width={280}
      content={<ApiNoteTipContent workspaceId={props.workspaceId} apiId={props.apiId} fallbackSummary={props.fallbackSummary} />}
    >
      {props.children}
    </Tooltip>
  )
}

function ApiNoteTipContent({ workspaceId, apiId, fallbackSummary }: { workspaceId: string; apiId: string; fallbackSummary?: string }) {
  const { note, status } = useApiNote(workspaceId, apiId)

  if (status === "loading") return <div className={s.tip}>해석을 불러오는 중이에요…</div>
  if (note) {
    return (
      <InsightCard
        summary={note.explanation}
        pros={note.pros}
        cons={note.cons}
        conservative={!note.grounded}
        userEdited={note.isUserEdited}
      />
    )
  }
  // 노트 없음·GET 실패 모두 같은 조용한 fallback(계약) — code-truth 요약이 있으면 그걸 보여준다.
  return <div className={s.tip}>{fallbackSummary || "설명이 아직 없어요."}</div>
}
