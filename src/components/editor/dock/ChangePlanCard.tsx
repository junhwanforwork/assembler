"use client"

import { useState } from "react"
import { clsx } from "clsx"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangeOp, ChangePlan } from "@/lib/types/chat"
import type { DesignPatch, DanglingRef } from "@/lib/types/design"
import { applyChangePlan } from "@/lib/chat/apply"
import { api, ApiError } from "@/lib/api/client"
import { Button } from "@/components/ui/Button"
import { diffOpPayload } from "./planDiff"
import s from "../editor.module.css"

// 변경 계획 도크 카드 — 그래프 변경의 유일한 관문(#62, ux-strategy 원칙 3).
// 적용 = applyChangePlan(순수) → 바뀐 컬렉션만 PATCH design(ASM-010).

type ApplyErrorState =
  | { kind: "plan_conflict" }
  | { kind: "conflict" }
  | { kind: "dangling"; refs: DanglingRef[] }
  | { kind: "generic" }

const ACTION_LABEL: Record<ChangeOp["action"], string> = { add: "추가", update: "수정", remove: "삭제" }

function extractRefs(details: unknown): DanglingRef[] {
  if (typeof details !== "object" || details === null) return []
  const refs = (details as { refs?: unknown }).refs
  return Array.isArray(refs) ? (refs as DanglingRef[]) : []
}

export function ChangePlanCard({
  plan,
  design,
  workspaceId,
  onDesignChange,
  onDone,
  onDiscarded,
}: {
  plan: ChangePlan
  design: WorkspaceDesign
  workspaceId: string
  onDesignChange: (design: WorkspaceDesign) => void
  // 적용 성공 — 카드 닫힘 + 대화 흐름에 알림 노트.
  onDone: (notice: string) => void
  onDiscarded: () => void
}) {
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<ApplyErrorState | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const applyTo = async (target: WorkspaceDesign) => {
    const applied = applyChangePlan(target, plan)
    if (!applied.ok) {
      setError({ kind: "plan_conflict" })
      return
    }
    const patch = Object.fromEntries(
      applied.value.touched.map((key) => [key, applied.value.design[key]]),
    ) as DesignPatch
    const res = await api.patch<{ saved: boolean; design: WorkspaceDesign }>(
      `/api/workspaces/${workspaceId}/design`,
      patch,
    )
    onDesignChange(res.design)
    onDone("변경 계획을 스펙에 반영했어요.")
  }

  // 적용은 항상 최신 저장본 위에 — 클라이언트가 든 design이 stale이면 컬렉션 통째 PATCH가
  // 다른 저장을 무음으로 덮는다(서버 CAS는 핸들러 내부 창만 지킨다). GET→재적용이 창을 최소화.
  // 완전한 차단은 PATCH 계약에 버전 토큰이 필요 — BE 범위라 후속 보고.
  const run = async () => {
    if (applying) return
    setApplying(true)
    setError(null)
    try {
      const latest = await api.get<{ design: WorkspaceDesign }>(`/api/workspaces/${workspaceId}/design`)
      onDesignChange(latest.design)
      await applyTo(latest.design)
    } catch (err) {
      if (err instanceof ApiError && err.code === "dangling_refs") {
        setError({ kind: "dangling", refs: extractRefs(err.details) })
      } else if (err instanceof ApiError && err.code === "conflict") {
        setError({ kind: "conflict" })
      } else {
        setError({ kind: "generic" })
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className={s.planCard}>
      <div className={s.planHead}>
        <span className={s.planTitle}>{plan.title}</span>
        <span className={s.planCount}>{plan.ops.length}개 변경</span>
      </div>
      {plan.summary && <div className={s.planSummary}>{plan.summary}</div>}

      <div className={s.planOps}>
        {plan.ops.map((op) => (
          <PlanOpRow key={op.id} op={op} design={design} />
        ))}
      </div>

      {error && (
        <div className={s.planError}>
          {error.kind === "plan_conflict" && "계획이 지금 스펙과 맞지 않아요. 버리고 다시 요청해 주세요."}
          {error.kind === "conflict" && "다른 저장과 겹쳤어요. 최신 스펙 위에 다시 적용해 볼까요?"}
          {error.kind === "generic" && "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요."}
          {error.kind === "dangling" && (
            <>
              끊어진 연결이 있어 적용할 수 없어요.
              <ul className={s.planRefs}>
                {error.refs.map((ref, i) => (
                  <li key={`${ref.from}-${ref.missingId}-${i}`}>
                    <code>{ref.from}</code>의 <code>{ref.field}</code>가 없는 <code>{ref.missingId}</code>를 가리켜요
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className={s.planActions}>
        {confirmDiscard ? (
          <>
            <span className={s.planConfirmText}>이 계획을 버릴까요?</span>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(false)} disabled={applying}>
              닫기
            </Button>
            <Button variant="filled" size="sm" onClick={onDiscarded} disabled={applying}>
              버리기
            </Button>
          </>
        ) : (
          <>
            {/* 버리기(#61) — 계획은 서버 미영속(클라 상태뿐), 확인 1단계 후 즉시 폐기. */}
            <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(true)} disabled={applying}>
              버리기
            </Button>
            <Button variant="filled" size="sm" loading={applying} onClick={run}>
              {error?.kind === "conflict" ? "다시 시도하기" : "적용하기"}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function PlanOpRow({ op, design }: { op: ChangeOp; design: WorkspaceDesign }) {
  const rows = diffOpPayload(op, design)
  return (
    <div className={s.planOp}>
      <div className={s.planOpHead}>
        <span className={clsx(s.opBadge, s[`opBadge_${op.action}`])}>{ACTION_LABEL[op.action]}</span>
        <span className={s.planOpSummary}>{op.summary}</span>
      </div>
      {rows.length > 0 && (
        <div className={s.planDiff}>
          {rows.map((row) => (
            <div key={`${op.id}-${row.field}`} className={s.diffRow}>
              <span className={s.diffField}>{row.field}</span>
              {row.before !== undefined && <span className={s.diffBefore}>{row.before}</span>}
              {row.before !== undefined && row.after !== undefined && <span className={s.diffArrow}>→</span>}
              {row.after !== undefined && <span className={s.diffAfter}>{row.after}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
