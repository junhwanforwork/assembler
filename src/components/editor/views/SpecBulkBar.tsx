"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import type { RequirementStatus } from "@/lib/types/assembler"
import type { DesignPatchFailure } from "@/lib/api/design-patch"
import type { BulkRequirementChange } from "./specEdit"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { Select, type SelectOption } from "@/components/ui/Select"
import { IconButton } from "@/components/ui/Button"
import { InlineAddInput } from "../InlineAddInput"
import { PatchErrorNote } from "../PatchErrorNote"
import { ExportModal } from "../ExportModal"
import { CloseIcon } from "../icons"
import s from "./SpecBulkBar.module.css"

// 벌크 액션 바(#34) — 체크된 요구사항에 상태·역할을 PATCH 1회로 일괄 적용. ✕=전체 해제(#33).
// 내보내기=체크된 요구사항에 연결된 기능을 프리셀렉트한 #64 모달. workspaceId는 라우트
// (/editor/[id])에서 — 부모(SpecView)는 데이터를 안 내려주고, 이 바는 store·URL만 소비한다.

const STATUS_ACTIONS: SelectOption<RequirementStatus | "none">[] = [
  { value: "none", label: "상태 변경" },
  { value: "draft", label: "작성중으로" },
  { value: "approved", label: "승인됨으로" },
  { value: "deprecated", label: "중단됨으로" },
]

// 벌크 적용 성공 노티스 — 성공 시 체크가 풀려 바가 내려가므로, 확인은 바 밖(같은 자리)에서 보여준다.
export function SpecBulkNotice({ text }: { text: string }) {
  return (
    <div className={s.wrap}>
      <span className={s.notice} role="status">
        {text}
      </span>
    </div>
  )
}

export function SpecBulkBar({
  count,
  onApply,
}: {
  count: number
  // 성공이면 null, 실패면 실패 분기 — 저장·성공 후처리(체크 해제·노티스)는 SpecView 소유.
  onApply: (change: BulkRequirementChange) => Promise<DesignPatchFailure | null>
}) {
  const clearSpecChecks = useEditorStore((st) => st.clearSpecChecks)
  const specCheckedIds = useEditorStore((st) => st.specCheckedIds)
  const params = useParams<{ id: string }>()
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<DesignPatchFailure | null>(null)
  const [roleOpen, setRoleOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const apply = async (change: BulkRequirementChange) => {
    if (saving) return
    setSaving(true)
    setFailure(null)
    const fail = await onApply(change)
    setSaving(false)
    if (fail) {
      setFailure(fail)
      return
    }
    setRoleOpen(false)
  }

  return (
    <div className={s.wrap}>
      {failure && (
        <PatchErrorNote failure={failure} staleText="선택한 요구사항을 찾을 수 없어요. 목록을 다시 확인해 주세요." />
      )}
      <div className={s.bar}>
        <IconButton label="선택 해제" onClick={clearSpecChecks} disabled={saving}>
          <CloseIcon />
        </IconButton>
        <span className={s.cnt}>
          <b>{count}</b>개 선택됨
        </span>
        <Select
          aria-label="상태 일괄 변경"
          value="none"
          options={STATUS_ACTIONS}
          disabled={saving}
          onChange={(v) => {
            if (v !== "none") void apply({ status: v })
          }}
        />
        {roleOpen ? (
          <span className={s.roleInput}>
            <InlineAddInput
              placeholder="역할 이름"
              ariaLabel="역할 일괄 지정"
              saving={saving}
              hasError={!!failure}
              onCommit={(text) => apply({ role: text })}
              onCancel={() => setRoleOpen(false)}
            />
          </span>
        ) : (
          <button className={s.action} disabled={saving} onClick={() => setRoleOpen(true)}>
            역할 지정하기
          </button>
        )}
        <button className={s.action} disabled={saving} onClick={() => setExportOpen(true)}>
          내보내기
        </button>
      </div>
      {exportOpen && (
        <ExportModal
          workspaceId={params.id}
          preselectedRequirementIds={specCheckedIds}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  )
}
