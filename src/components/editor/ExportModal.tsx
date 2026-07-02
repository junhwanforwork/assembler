"use client"

import { useEffect, useMemo, useState } from "react"
import type { Api, DbTable, Workspace, WorkspaceDesign } from "@/lib/types/assembler"
import { api } from "@/lib/api/client"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { Tooltip } from "@/components/ui/Tooltip"
import { buildImplementationContext, connectedFeatureIds, type ExportContextInput } from "./exportContext"
import s from "./ExportModal.module.css"

// 내보내기 모달(#64) — 구현 컨텍스트(개발로)가 MVP. 기능을 고르면 연결된 명세를
// 코딩 에이전트용 프롬프트로 미리보기 + 복사/다운로드. Confluence·Figma는 Post-MVP
// 방향 제시용 "곧" 비활성(사유 툴팁). 데이터는 자체 조회 — 진입점(TopBar·SpecBulkBar)이
// 데이터를 소유하지 않아서다. preselectedRequirementIds가 오면(#34 벌크바) 연결 기능 프리셀렉트.

type LoadState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; data: ExportContextInput; design: WorkspaceDesign }

export function ExportModal({
  workspaceId,
  preselectedRequirementIds,
  onClose,
}: {
  workspaceId: string
  preselectedRequirementIds?: string[]
  onClose: () => void
}) {
  const [state, setState] = useState<LoadState>({ kind: "loading" })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(API) 동기화, 다시 시도 시 리셋
    setState({ kind: "loading" })
    void (async () => {
      try {
        const workspace = await api.get<Workspace>(`/api/workspaces/${workspaceId}`)
        const [designRes, apisRes, dbRes] = await Promise.all([
          api.get<{ design: WorkspaceDesign }>(`/api/workspaces/${workspaceId}/design`),
          api.get<{ apis: Api[] }>(`/api/products/${workspace.productId}/apis`),
          api.get<{ dbTables: DbTable[] }>(`/api/products/${workspace.productId}/db-tables`),
        ])
        if (!active) return
        const design = designRes.design
        setState({
          kind: "ready",
          design,
          data: { workspaceName: workspace.name, design, apis: apisRes.apis, dbTables: dbRes.dbTables },
        })
        if (preselectedRequirementIds && preselectedRequirementIds.length > 0) {
          setSelectedIds(new Set(connectedFeatureIds(design, preselectedRequirementIds)))
        }
      } catch {
        if (active) setState({ kind: "error" })
      }
    })()
    return () => {
      active = false
    }
    // preselectedRequirementIds는 열림 시점 스냅샷 — 모달이 떠 있는 동안 바뀌지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, reloadKey])

  const toggle = (featureId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(featureId)) next.delete(featureId)
      else next.add(featureId)
      return next
    })
    setCopyStatus(null)
  }

  // 선택 순서가 아니라 스펙(기능명세) 순서로 — 출력이 항상 결정적이게.
  const orderedSelection = useMemo(
    () => (state.kind === "ready" ? state.design.features.filter((f) => selectedIds.has(f.id)).map((f) => f.id) : []),
    [state, selectedIds]
  )

  const markdown = useMemo(
    () => (state.kind === "ready" && orderedSelection.length > 0 ? buildImplementationContext(state.data, orderedSelection) : null),
    [state, orderedSelection]
  )

  const copy = async () => {
    if (!markdown) return
    try {
      await navigator.clipboard.writeText(markdown)
      setCopyStatus("복사했어요")
    } catch {
      setCopyStatus("복사하지 못했어요. 미리보기 내용을 직접 선택해 복사해 주세요.")
    }
  }

  const download = () => {
    if (!markdown || state.kind !== "ready") return
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    // 파일시스템 금지 문자 정제 — 브라우저별 임의 치환에 파일명을 맡기지 않는다.
    anchor.download = `${state.data.workspaceName.replace(/[\\/:*?"<>|\n\r]/g, "-")}-구현컨텍스트.md`
    // Safari는 같은 틱 revoke 시 다운로드가 시작 전에 무효화될 수 있고,
    // 구형 Firefox는 미부착 anchor의 click을 무시한다 — 부착 후 지연 revoke.
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setCopyStatus("파일로 받았어요")
  }

  return (
    <Modal labelledBy="export-title" onClose={onClose}>
      <div className={s.title} id="export-title">
        내보내기
      </div>
      <p className={s.sub}>선택한 기능의 연결된 명세를 코딩 에이전트용 프롬프트로 만들어 드려요.</p>

      {state.kind === "loading" && <div className={s.state}>스펙을 불러오는 중이에요…</div>}
      {state.kind === "error" && (
        <div className={s.state}>
          <p className={s.stateText}>스펙을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
          <Button variant="ghost" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            다시 시도하기
          </Button>
        </div>
      )}

      {state.kind === "ready" && (
        <>
          <div className={s.sectionLabel}>기능 선택</div>
          {state.design.features.length === 0 ? (
            <div className={s.state}>아직 기능이 없어요. 기능명세를 만들고 다시 열어 주세요.</div>
          ) : (
            <ul className={s.featureList}>
              {state.design.features.map((feature) => (
                <li key={feature.id}>
                  <label className={s.featureItem}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(feature.id)}
                      onChange={() => toggle(feature.id)}
                    />
                    <span className={s.featureName}>{feature.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className={s.sectionLabel}>미리보기</div>
          {markdown ? (
            <pre className={s.preview}>{markdown}</pre>
          ) : (
            <div className={s.previewEmpty}>기능을 선택하면 미리보기가 나와요.</div>
          )}

          <div className={s.soonRow}>
            <span className={s.soonLabel}>협업 도구로</span>
            <Tooltip content="Confluence 동기화는 준비 중이에요. 곧 열어드릴게요." width={210}>
              <button className={s.soon} aria-disabled="true">
                Confluence
              </button>
            </Tooltip>
            <Tooltip content="Figma 동기화는 준비 중이에요. 곧 열어드릴게요." width={200}>
              <button className={s.soon} aria-disabled="true">
                Figma
              </button>
            </Tooltip>
          </div>

          {copyStatus && (
            <div className={s.status} role="status">
              {copyStatus}
            </div>
          )}
          <div className={s.actions}>
            {orderedSelection.length === 0 && <span className={s.helper}>내보낼 기능을 선택해 주세요.</span>}
            <Button variant="ghost" onClick={onClose}>
              닫기
            </Button>
            <Button variant="ghost" disabled={!markdown} onClick={download}>
              .md로 받기
            </Button>
            <Button variant="filled" disabled={!markdown} onClick={copy}>
              복사하기
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
