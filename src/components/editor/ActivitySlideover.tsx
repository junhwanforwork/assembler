"use client"

import { useEffect, useState } from "react"
import type { Activity } from "@/lib/types/assembler"
import { api } from "@/lib/api/client"
import { errorMessage } from "@/lib/api/messages"
import { Button } from "@/components/ui/Button"
import { OverlayPanel } from "@/components/ui/OverlayPanel"
import { activityLine, relativeTime } from "./activityCopy"
import s from "./ActivitySlideover.module.css"

// 활동 타임라인 슬라이드오버(ASM-024, editor-interactions #7) — TopBar 기록 버튼에서 진입.
// 컨테이너(백드롭·Esc·포커스 트랩·복원·스크롤 잠금)는 ui/OverlayPanel(side="right")로 이관(ASM-055) —
// 여기는 타임라인 데이터·내용만 소유한다. 상시 마운트 + open 구동(QA 정정 — 조건부 마운트는
// 닫힘 애니메이션 미도달 경로였다). fetch는 예전처럼 열릴 때만 — 조기 fetch 금지.

type FetchState =
  | { kind: "loading" }
  | { kind: "error"; error: unknown }
  | { kind: "ready"; activity: Activity[] }

export function ActivitySlideover({ productId, open, onClose }: { productId: string; open: boolean; onClose: () => void }) {
  const [state, setState] = useState<FetchState>({ kind: "loading" })
  // 재시도는 attempt 증가로 같은 effect를 다시 태운다 — fetch 경로를 한 곳으로 유지.
  const [attempt, setAttempt] = useState(0)

  const retry = () => {
    setState({ kind: "loading" })
    setAttempt((n) => n + 1)
  }

  // 열 때마다 새로 불러온다(옛 마운트=열림과 등가) — 이전 열림의 낡은 목록을 잠깐 비추지 않게
  // 열림 전이 시 로딩으로 되감는다(파생 상태 보정 패턴 — effect 동기 setState 금지 규칙 준수).
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setState({ kind: "loading" })
  }

  useEffect(() => {
    if (!open) return
    let active = true
    api
      .get<{ activity: Activity[] }>(`/api/products/${productId}/activity`)
      .then((data) => {
        if (active) setState({ kind: "ready", activity: data.activity })
      })
      .catch((err: unknown) => {
        if (active) setState({ kind: "error", error: err })
      })
    return () => {
      active = false
    }
  }, [open, productId, attempt])

  return (
    <OverlayPanel
      open={open}
      onClose={onClose}
      side="right"
      title="최근 활동"
      titleId="activity-slideover-title"
      // 스코프 명시 — 이 타임라인은 현재 스펙이 아니라 프로덕트 전역(DataView와 같은 문법, X-12).
      meta="· 전체 프로덕트"
      closeLabel="기록 닫기"
    >
      {/* role=status — 로딩·실패 전환을 스크린리더에도 알린다. */}
      {state.kind === "loading" && (
        <div className={s.muted} role="status">
          불러오는 중이에요…
        </div>
      )}

      {state.kind === "error" && (
        <div>
          <div className={s.muted} role="status">
            {errorMessage(state.error)}
          </div>
          <div className={s.retry}>
            <Button variant="ghost" size="sm" onClick={retry}>
              다시 시도하기
            </Button>
          </div>
        </div>
      )}

      {state.kind === "ready" &&
        (state.activity.length === 0 ? (
          <div className={s.muted}>아직 활동이 없어요. 스펙을 만들고 바꾸면 여기에 쌓여요.</div>
        ) : (
          <ActivityList activity={state.activity} />
        ))}
    </OverlayPanel>
  )
}

function ActivityList({ activity }: { activity: Activity[] }) {
  // 상대 시간 기준은 목록 렌더 시점 1회 — 항목마다 new Date()를 만들지 않는다.
  const now = new Date()
  return (
    <ol className={s.list}>
      {activity.map((item) => {
        const line = activityLine(item.type, item.metadata)
        return (
          <li key={item.id} className={s.item}>
            <span className={s.dot} aria-hidden />
            <div className={s.itemBody}>
              <div className={s.itemTitle}>{line.title}</div>
              <div className={s.itemMeta}>
                {line.name && <span className={s.itemName}>{line.name}</span>}
                <span>{relativeTime(item.createdAt, now)}</span>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
