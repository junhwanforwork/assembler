"use client"

import { useMemo, useState } from "react"
import { clsx } from "clsx"
import type { Api, DbTable } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { usePolicyDocs, type PolicyDoc } from "@/hooks/usePolicyDoc"
import { useDbTableNote } from "@/hooks/useDbTableNote"
import { Badge, methodTone } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { InsightCard } from "@/components/ui/InsightCard"
import { Modal } from "@/components/ui/Modal"
import { Tooltip } from "@/components/ui/Tooltip"
import { ApiNoteTip } from "./ApiNoteTip"
import { policyDocFilename, resolveApiRefs, resolveDbRefs } from "./policyDoc"
import s from "./editor.module.css"

// 정책 문서 뷰(ASM-069, F4) — 사용자가 직접 쓰는 작성형 문서(md 저장/다운로드).
// 본문에서 기존 API·DB를 참조로 붙이면, 그 칩에 마우스를 올렸을 때 12차 해석 카드가 뜬다
// (= 개발자 추천을 문서 안에 녹인 형태). 해석은 GET 전용 — 정책 문서에서 유료 생성 발사 없음.
// workspaceId는 currentWorkspaceId(enterWorkspace 기록, DataView.tsx 패턴). 미설정이면 정직하게 대기 안내.
export function PolicyView({ apis, dbTables }: { apis: Api[]; dbTables: DbTable[] }) {
  const workspaceId = useEditorStore((st) => st.currentWorkspaceId)
  const selectedId = useEditorStore((st) => st.policySelectedId)
  const { docs, status } = usePolicyDocs(workspaceId)

  const selectedDoc = useMemo(() => docs.find((d) => d.id === selectedId) ?? null, [docs, selectedId])

  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>정책 문서</span>
      </div>

      {workspaceId === null ? (
        <div className={s.emptyCol} style={{ flex: 1 }}>
          스펙을 여는 중이에요. 잠시 후 정책 문서를 쓸 수 있어요.
        </div>
      ) : status === "loading" ? (
        <div className={s.emptyCol} style={{ flex: 1 }}>정책 문서를 불러오는 중이에요…</div>
      ) : status === "error" ? (
        <div className={s.emptyCol} style={{ flex: 1 }}>
          정책 문서를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </div>
      ) : selectedId === null ? (
        // 새 문서 모드 — 좌 레일 "새 정책 문서"로 진입. 빈 편집기 + 만들기(POST).
        <PolicyEditor key="new" doc={null} apis={apis} dbTables={dbTables} workspaceId={workspaceId} />
      ) : selectedDoc ? (
        // key=문서 id — 문서 전환 시 draft를 리마운트로 초기화(동기화 effect 불필요).
        <PolicyEditor key={selectedDoc.id} doc={selectedDoc} apis={apis} dbTables={dbTables} workspaceId={workspaceId} />
      ) : (
        <div className={s.emptyCol} style={{ flex: 1 }}>
          고른 정책 문서를 찾을 수 없어요. 왼쪽에서 다시 골라 주세요.
        </div>
      )}
    </section>
  )
}

function PolicyEditor({
  doc,
  apis,
  dbTables,
  workspaceId,
}: {
  doc: PolicyDoc | null
  apis: Api[]
  dbTables: DbTable[]
  workspaceId: string
}) {
  const { create, update, remove } = usePolicyDocs(workspaceId)
  const openPolicy = useEditorStore((st) => st.openPolicy)

  const [title, setTitle] = useState(doc?.title ?? "")
  const [body, setBody] = useState(doc?.body ?? "")
  const [apiIds, setApiIds] = useState<string[]>(doc?.apiIds ?? [])
  const [dbTableIds, setDbTableIds] = useState<string[]>(doc?.dbTableIds ?? [])
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isNew = doc === null
  const trimmedTitle = title.trim()

  // 선택된 참조는 실재하는 것만(코드-진실). 삭제된 API·테이블 잔재 id는 화면에서 조용히 걸러진다.
  const refApis = useMemo(() => resolveApiRefs(apiIds, apis), [apiIds, apis])
  const refTables = useMemo(() => resolveDbRefs(dbTableIds, dbTables), [dbTableIds, dbTables])

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => {
    setFailed(false)
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  const save = async () => {
    if (busy || trimmedTitle.length === 0) return
    setBusy(true)
    setFailed(false)
    const payload = { title: trimmedTitle, body, apiIds, dbTableIds }
    if (isNew) {
      const created = await create(payload)
      setBusy(false)
      if (created) openPolicy(created.id)
      else setFailed(true)
    } else {
      const updated = await update(doc.id, payload)
      setBusy(false)
      if (!updated) setFailed(true)
    }
  }

  // 삭제는 영구(복구 UI 없음) — 확인 다이얼로그를 거친다(button.md "확인 없이 바로 삭제" 금지).
  const del = async () => {
    if (busy || isNew) return
    setBusy(true)
    const ok = await remove(doc.id)
    setBusy(false)
    if (ok) openPolicy(null) // 성공 시 목록으로 — 편집기 언마운트로 모달도 함께 사라진다.
    else {
      setConfirmDelete(false)
      setFailed(true)
    }
  }

  // md 다운로드 — 저장된 본문 그대로 Blob(투사 직렬화 불필요, ExportModal blob 로직 재사용).
  const download = () => {
    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = policyDocFilename(trimmedTitle)
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className={s.docp}>
      <div className={clsx(s.docpInner, s.policyForm)}>
        <label className={s.policyField}>
          <span className={s.policyLabel}>제목</span>
          <input
            className={s.policyTitleInput}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setFailed(false)
            }}
            placeholder="예: 개인정보 처리방침"
            aria-label="정책 문서 제목"
          />
        </label>

        <label className={s.policyField}>
          <span className={s.policyLabel}>본문</span>
          <textarea
            className={s.aiTextarea}
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              setFailed(false)
            }}
            placeholder="정책 내용을 적어 주세요. 아래에서 이 문서가 참조하는 API·DB를 연결할 수 있어요."
            aria-label="정책 문서 본문"
            rows={10}
          />
        </label>

        <RefPicker
          title="연결된 API"
          emptyHint="이 제품에 아직 들어온 API가 없어요."
          // 라벨에 메서드 포함 — 같은 endpoint의 GET/POST를 사용자·스크린리더가 구분한다.
          options={apis.map((a) => ({ id: a.id, label: `${a.method} ${a.endpoint}` }))}
          selectedIds={apiIds}
          onToggle={(id) => toggle(apiIds, setApiIds, id)}
        />
        <RefPicker
          title="연결된 DB 테이블"
          emptyHint="이 제품에 아직 들어온 테이블이 없어요."
          options={dbTables.map((t) => ({ id: t.id, label: t.name }))}
          selectedIds={dbTableIds}
          onToggle={(id) => toggle(dbTableIds, setDbTableIds, id)}
        />

        {(refApis.length > 0 || refTables.length > 0) && (
          <div className={s.policyRefChips} aria-label="연결된 참조">
            {refApis.map((a) => (
              <ApiNoteTip key={a.id} workspaceId={workspaceId} apiId={a.id} fallbackSummary={a.summary}>
                <span className={clsx(s.mono, s.docpEntity, s.policyChipRef)} tabIndex={0}>
                  <Badge variant="method" tone={methodTone(a.method)}>
                    {a.method}
                  </Badge>
                  {a.endpoint}
                </span>
              </ApiNoteTip>
            ))}
            {refTables.map((t) => (
              <Tooltip key={t.id} width={280} content={<TableRefTip workspaceId={workspaceId} tableId={t.id} />}>
                <span className={clsx(s.mono, s.docpEntity, s.policyChipRef)} tabIndex={0}>
                  {t.name}
                </span>
              </Tooltip>
            ))}
          </div>
        )}

        {failed && (
          <div className={s.aiMuted}>일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.</div>
        )}

        <div className={s.aiActions}>
          {!isNew && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
              삭제하기
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={download} disabled={trimmedTitle.length === 0}>
            md로 받기
          </Button>
          <Button variant="filled" size="sm" onClick={save} loading={busy} disabled={trimmedTitle.length === 0}>
            {isNew ? "만들기" : "저장하기"}
          </Button>
        </div>
      </div>

      {confirmDelete && !isNew && (
        <Modal labelledBy="policy-delete-title" onClose={() => setConfirmDelete(false)} closeDisabled={busy}>
          <div className={s.policyConfirmTitle} id="policy-delete-title">
            이 정책 문서를 삭제할까요?
          </div>
          <p className={s.policyConfirmText}>삭제하면 되돌릴 수 없어요.</p>
          <div className={s.policyConfirmActions}>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={busy}>
              닫기
            </Button>
            <Button variant="filled" size="sm" onClick={del} loading={busy}>
              영구 삭제하기
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function RefPicker({
  title,
  emptyHint,
  options,
  selectedIds,
  onToggle,
}: {
  title: string
  emptyHint: string
  options: { id: string; label: string }[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className={s.policyRefGroup}>
      <div className={s.policyLabel}>{title}</div>
      {options.length === 0 ? (
        <div className={s.aiMuted}>{emptyHint}</div>
      ) : (
        <div className={s.policyRefOptions}>
          {options.map((o) => {
            const active = selectedIds.includes(o.id)
            return (
              <button
                key={o.id}
                type="button"
                className={clsx(s.policyChip, active && s.policyChipActive)}
                aria-pressed={active}
                onClick={() => onToggle(o.id)}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// DB 테이블 참조 호버 — DocView TableNoteTip과 동일 문법(GET 전용, 유료 생성 없음).
// DocView의 것은 export되지 않고 DocView는 소유 밖이라, 같은 패턴으로 로컬 조립한다(InsightCard 직접).
function TableRefTip({ workspaceId, tableId }: { workspaceId: string; tableId: string }) {
  const { note, status } = useDbTableNote(workspaceId, tableId)

  if (status === "loading") return <div className={s.tipRole}>해석을 불러오는 중이에요…</div>
  if (status === "error") return <div className={s.tipRole}>해석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>
  if (!note) return <div className={s.tipRole}>아직 해석이 없어요. 데이터 뷰의 테이블에서 만들 수 있어요.</div>

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
