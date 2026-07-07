"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { clsx } from "clsx"
import type { Api, DbTable, DbTableNote, WorkspaceDesign } from "@/lib/types/assembler"
import { api } from "@/lib/api/client"
import { useDbTableNote } from "@/hooks/useDbTableNote"
import { getCachedNote, setCachedNote } from "@/lib/db-learning/note-cache"
import { Badge, methodTone } from "@/components/ui/Badge"
import { InsightCard } from "@/components/ui/InsightCard"
import { Segmented, SegmentedButton } from "@/components/ui/Segmented"
import { Tooltip } from "@/components/ui/Tooltip"
import {
  docAnchorId,
  projectDoc,
  UNLINKED_ANCHOR_ID,
  UNLINKED_SECTION_TITLE,
  type DocFeatureBlock,
  type DocSection,
  type DocTocEntry,
} from "./docProjection"
import {
  projectTechSpec,
  techAnchorId,
  TECH_UNLINKED_ANCHOR_ID,
  TECH_UNLINKED_SECTION_TITLE,
  type TechSpecSection,
} from "./techSpecProjection"
import { dictAnchorId, projectDataDictionary, type DictEntry } from "./dataDictionaryProjection"
import { apiStatusLabel } from "./dataUtils"
import { PriorityBars, RequirementStatusPill, StatusPill } from "./Badges"
import s from "../editor.module.css"

// 문서 뷰 — 모델→문서 각도의 읽기 투사 3종(PRD·기술 명세·데이터 사전, product-definition F3).
// 전부 저장 0, 렌더 시 계산. 편집·AI 초안(#26)은 후속.
type DocKind = "prd" | "tech" | "data"

export function DocView({
  design,
  apis,
  dbTables,
  workspaceId,
}: {
  design: WorkspaceDesign
  apis: Api[]
  dbTables: DbTable[]
  workspaceId: string
}) {
  // #21·#24 정적 라벨의 종류 선택 승격(ASM-054) — 문서 종류는 뷰 전용 상태라 컴포넌트 로컬.
  const [docKind, setDocKind] = useState<DocKind>("prd")

  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>문서</span>
        <Segmented tone="elevated" aria-label="문서 종류">
          <SegmentedButton active={docKind === "prd"} onClick={() => setDocKind("prd")}>
            PRD
          </SegmentedButton>
          <SegmentedButton active={docKind === "tech"} onClick={() => setDocKind("tech")}>
            기술 명세
          </SegmentedButton>
          <SegmentedButton active={docKind === "data"} onClick={() => setDocKind("data")}>
            데이터 사전
          </SegmentedButton>
        </Segmented>
      </div>

      {docKind === "prd" && <PrdDoc design={design} />}
      {docKind === "tech" && <TechSpecDoc design={design} apis={apis} dbTables={dbTables} workspaceId={workspaceId} />}
      {docKind === "data" && <DataDictionaryDoc design={design} dbTables={dbTables} workspaceId={workspaceId} />}
    </section>
  )
}

// #23 TOC 클릭 → 섹션 앵커 스크롤 + 잠시 강조. 문서 3종이 공유한다.
function useFlashJump() {
  const [flashId, setFlashId] = useState<string | null>(null)
  const flashTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    },
    [],
  )

  function jumpTo(anchorId: string) {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setFlashId(anchorId)
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlashId(null), 1600)
  }

  return { flashId, jumpTo }
}

function DocToc({ toc, onJump }: { toc: DocTocEntry[]; onJump: (anchorId: string) => void }) {
  if (toc.length <= 1) return null
  return (
    <nav className={s.docpToc} aria-label="문서 목차">
      <div className={s.docpTocTitle}>목차</div>
      {toc.map((t) => (
        <button key={t.anchorId} type="button" title={t.title} onClick={() => onJump(t.anchorId)}>
          {t.title}
        </button>
      ))}
    </nav>
  )
}

// ───────────────────────── PRD ─────────────────────────

function PrdDoc({ design }: { design: WorkspaceDesign }) {
  const doc = useMemo(() => projectDoc(design), [design])
  const { flashId, jumpTo } = useFlashJump()

  if (doc.isEmpty) {
    return (
      <div className={s.emptyCol} style={{ flex: 1 }}>
        아직 문서로 정리할 요구사항이 없어요. 요구사항을 만들면 PRD로 보여드려요.
      </div>
    )
  }

  return (
    <div className={s.docp}>
      <div className={s.docpInner}>
        <DocToc toc={doc.toc} onJump={jumpTo} />

        {doc.sections.map((section) => (
          <RequirementSection
            key={section.requirement.id}
            section={section}
            isFlashed={flashId === docAnchorId(section.requirement.id)}
          />
        ))}

        {doc.unlinkedFeatures.length > 0 && (
          <section
            id={UNLINKED_ANCHOR_ID}
            className={clsx(s.docpSection, flashId === UNLINKED_ANCHOR_ID && s.docpFlash)}
          >
            <h2>{UNLINKED_SECTION_TITLE}</h2>
            <p className={s.docpNote}>
              요구사항과 아직 연결되지 않은 기능이에요. 연결하면 해당 요구사항 아래로 정리돼요.
            </p>
            {doc.unlinkedFeatures.map((f) => (
              <FeatureBlock key={f.id} feature={f} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

function RequirementSection({ section, isFlashed }: { section: DocSection; isFlashed: boolean }) {
  const r = section.requirement
  return (
    <section id={docAnchorId(r.id)} className={clsx(s.docpSection, isFlashed && s.docpFlash)}>
      <h2>{r.title}</h2>
      <div className={s.docpMeta}>
        <RequirementStatusPill status={r.status} />
        <PriorityBars priority={r.priority} />
        {r.role && <span className={s.docpRole}>{r.role}</span>}
      </div>
      <p className={s.docpLead}>{r.description || "설명이 아직 없어요."}</p>
      {r.acceptanceCriteria.length > 0 && (
        <div className={s.docpAc}>
          <div className={s.docpAcTitle}>수용 기준</div>
          <ul>
            {r.acceptanceCriteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {section.features.map((f) => (
        <FeatureBlock key={f.id} feature={f} />
      ))}
    </section>
  )
}

function FeatureBlock({ feature }: { feature: DocFeatureBlock }) {
  return (
    <div className={s.docpFeature}>
      <h3>{feature.name}</h3>
      <p>{feature.description || "설명이 아직 없어요."}</p>
      {feature.detailFeatures.length > 0 && (
        <ul className={s.docpDetails}>
          {feature.detailFeatures.map((d) => (
            <li key={d.id}>
              <b>{d.title}</b>
              {d.description && <> — {d.description}</>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ───────────────────────── 기술 명세 ─────────────────────────

function TechSpecDoc({
  design,
  apis,
  dbTables,
  workspaceId,
}: {
  design: WorkspaceDesign
  apis: Api[]
  dbTables: DbTable[]
  workspaceId: string
}) {
  const doc = useMemo(() => projectTechSpec(design, apis, dbTables), [design, apis, dbTables])
  const { flashId, jumpTo } = useFlashJump()

  if (doc.isEmpty) {
    return (
      <div className={s.emptyCol} style={{ flex: 1 }}>
        아직 기술 명세로 정리할 기능이 없어요. 기능을 만들면 API·DB 연결로 보여드려요.
      </div>
    )
  }

  return (
    <div className={s.docp}>
      <div className={s.docpInner}>
        <DocToc toc={doc.toc} onJump={jumpTo} />

        {doc.sections.map((section) => (
          <TechSpecFeatureSection
            key={section.feature.id}
            section={section}
            workspaceId={workspaceId}
            isFlashed={flashId === techAnchorId(section.feature.id)}
          />
        ))}

        {doc.unlinkedFeatures.length > 0 && (
          <section
            id={TECH_UNLINKED_ANCHOR_ID}
            className={clsx(s.docpSection, flashId === TECH_UNLINKED_ANCHOR_ID && s.docpFlash)}
          >
            <h2>{TECH_UNLINKED_SECTION_TITLE}</h2>
            <p className={s.docpNote}>API나 DB 테이블에 아직 연결되지 않은 기능이에요. 연결하면 여기에 정리돼요.</p>
            {doc.unlinkedFeatures.map((f) => (
              <div key={f.id} className={s.docpFeature}>
                <h3>{f.name}</h3>
                <p>{f.description || "설명이 아직 없어요."}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

function TechSpecFeatureSection({
  section,
  workspaceId,
  isFlashed,
}: {
  section: TechSpecSection
  workspaceId: string
  isFlashed: boolean
}) {
  return (
    <section id={techAnchorId(section.feature.id)} className={clsx(s.docpSection, isFlashed && s.docpFlash)}>
      <h2>{section.feature.name}</h2>
      <p className={s.docpLead}>{section.feature.description || "설명이 아직 없어요."}</p>

      {section.requirements.length > 0 && (
        <div className={s.docpSub}>
          <div className={s.docpSubTitle}>왜 만드나요 (연결 요구사항)</div>
          <ul className={s.docpDetails}>
            {section.requirements.map((r) => (
              <li key={r.id}>{r.title}</li>
            ))}
          </ul>
        </div>
      )}

      {section.pages.length > 0 && (
        <div className={s.docpSub}>
          <div className={s.docpSubTitle}>연결 페이지</div>
          <ul className={s.docpDetails}>
            {section.pages.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        </div>
      )}

      {section.apis.length > 0 && (
        <div className={s.docpSub}>
          <div className={s.docpSubTitle}>연결 API</div>
          {section.apis.map((a) => {
            const st = apiStatusLabel(a.status)
            return (
              <div key={a.id} className={s.docpEntityRow}>
                <Badge variant="method" tone={methodTone(a.method)}>
                  {a.method}
                </Badge>
                {/* 인라인 해석(F5) — 엔드포인트 hover/focus에 code-truth 요약. */}
                <Tooltip width={264} content={<div className={s.tipRole}>{a.summary || "설명이 아직 없어요."}</div>}>
                  <span className={clsx(s.mono, s.docpEntity)} tabIndex={0}>
                    {a.endpoint}
                  </span>
                </Tooltip>
                <StatusPill tone={st.tone} label={st.label} />
              </div>
            )
          })}
        </div>
      )}

      {section.dbTables.length > 0 && (
        <div className={s.docpSub}>
          <div className={s.docpSubTitle}>연결 DB 테이블</div>
          {section.dbTables.map((t) => (
            <div key={t.id} className={s.docpEntityRow}>
              {/* 인라인 해석(F5) — 테이블명 hover/focus에 저장된 AI 노트(읽기 전용). */}
              <Tooltip width={280} content={<TableNoteTip workspaceId={workspaceId} tableId={t.id} />}>
                <span className={clsx(s.mono, s.docpEntity)} tabIndex={0}>
                  {t.name}
                </span>
              </Tooltip>
              <span className={s.docpEntityDesc}>{t.description || "설명이 아직 없어요."}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// 호버 해석 카드 — 마운트 시 저장된 노트만 GET(무료). 생성(유료)은 인스펙터의 명시 트리거 몫.
function TableNoteTip({ workspaceId, tableId }: { workspaceId: string; tableId: string }) {
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

// ───────────────────────── 데이터 사전 ─────────────────────────

// 저장된 노트 일괄 읽기(무료 GET, 테이블당 1회) — 배치 API가 없어 테이블별 엔드포인트를 병렬 호출한다.
// 워크스페이스 캐시(note-cache)를 먼저 보고 미캐시분만 GET — 문서 종류 전환마다 전량 재발사를 막는다(ASM-056 ⑦).
// 실패한 테이블은 "노트 없음"과 구분해 failedTableIds 로 알린다(ASM-056 ⑥) — 실패는 캐시하지 않아 다음에 다시 시도한다.
// loading은 파생값(loaded === null) — 이펙트 안 동기 setState 금지 규칙(useDbTableNote 관례)을 지킨다.
const NO_FAILED: ReadonlySet<string> = new Set()

function useAllTableNotes(
  workspaceId: string,
  dbTables: DbTable[],
): { notes: DbTableNote[]; loading: boolean; failedTableIds: ReadonlySet<string> } {
  const [loaded, setLoaded] = useState<{ notes: DbTableNote[]; failedTableIds: ReadonlySet<string> } | null>(null)

  useEffect(() => {
    if (dbTables.length === 0) return
    let cancelled = false
    Promise.all(
      dbTables.map(async (t) => {
        const cached = getCachedNote(workspaceId, t.id)
        if (cached !== undefined) return { tableId: t.id, note: cached, failed: false }
        try {
          const r = await api.get<{ note: DbTableNote | null }>(`/api/workspaces/${workspaceId}/db-tables/${t.id}/note`)
          // 언마운트 후 늦게 온 응답은 캐시에 쓰지 않는다 — 무효화(재생성) 직후를 stale 값으로 되채우는 창 차단.
          if (!cancelled) setCachedNote(workspaceId, t.id, r.note)
          return { tableId: t.id, note: r.note, failed: false }
        } catch {
          return { tableId: t.id, note: null, failed: true }
        }
      }),
    ).then((results) => {
      if (cancelled) return
      setLoaded({
        notes: results.map((r) => r.note).filter((n): n is DbTableNote => n !== null),
        failedTableIds: new Set(results.filter((r) => r.failed).map((r) => r.tableId)),
      })
    })
    return () => {
      cancelled = true
    }
  }, [workspaceId, dbTables])

  return {
    notes: loaded?.notes ?? [],
    loading: loaded === null && dbTables.length > 0,
    failedTableIds: loaded?.failedTableIds ?? NO_FAILED,
  }
}

function DataDictionaryDoc({
  design,
  dbTables,
  workspaceId,
}: {
  design: WorkspaceDesign
  dbTables: DbTable[]
  workspaceId: string
}) {
  const { notes, loading, failedTableIds } = useAllTableNotes(workspaceId, dbTables)
  const doc = useMemo(() => projectDataDictionary(dbTables, notes, design), [dbTables, notes, design])
  const { flashId, jumpTo } = useFlashJump()

  if (doc.isEmpty) {
    return (
      <div className={s.emptyCol} style={{ flex: 1 }}>
        아직 들어온 테이블이 없어요. 코드에서 자동으로 들어오면 데이터 사전으로 보여드릴게요.
      </div>
    )
  }

  return (
    <div className={s.docp}>
      <div className={s.docpInner}>
        <DocToc toc={doc.toc} onJump={jumpTo} />
        {doc.entries.map((entry) => (
          <DictTableSection
            key={entry.table.id}
            entry={entry}
            notesLoading={loading}
            noteLoadFailed={failedTableIds.has(entry.table.id)}
            isFlashed={flashId === dictAnchorId(entry.table.id)}
          />
        ))}
      </div>
    </div>
  )
}

function DictTableSection({
  entry,
  notesLoading,
  noteLoadFailed,
  isFlashed,
}: {
  entry: DictEntry
  notesLoading: boolean
  noteLoadFailed: boolean
  isFlashed: boolean
}) {
  return (
    <section id={dictAnchorId(entry.table.id)} className={clsx(s.docpSection, isFlashed && s.docpFlash)}>
      <h2>{entry.table.name}</h2>
      <p className={s.docpLead}>{entry.table.description || "설명이 아직 없어요."}</p>

      <div className={s.docpSub}>
        <div className={s.docpSubTitle}>어떤 정보를 담나요 (컬럼)</div>
        {entry.columns.length > 0 ? (
          <ul className={s.docpDetails}>
            {entry.columns.map((c) => (
              <li key={c.name}>
                <b>{c.name}</b> — {c.type}
                {c.isPrimaryKey && " · 기본키"}
                {c.nullable && " · 비어 있을 수 있어요"}
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.docpNote}>아직 컬럼 정보가 없어요.</p>
        )}
      </div>

      {(entry.fkOut.length > 0 || entry.fkIn.length > 0) && (
        <div className={s.docpSub}>
          <div className={s.docpSubTitle}>어느 테이블과 연결되나요</div>
          <ul className={s.docpDetails}>
            {entry.fkOut.map((fk) => (
              <li key={`out-${fk.column}`}>
                <b>{fk.column}</b> 컬럼이 {fk.targetTable} 테이블을 가리켜요
                {fk.targetColumn && <span className={s.docpEntityDesc}> ({fk.targetColumn})</span>}
              </li>
            ))}
            {entry.fkIn.map((fk) => (
              <li key={`in-${fk.table}-${fk.column}`}>
                {fk.table} 테이블의 <b>{fk.column}</b> 컬럼이 이 테이블을 가리켜요
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={s.docpSub}>
        <div className={s.docpSubTitle}>어느 기능이 쓰나요</div>
        {entry.usedByFeatures.length > 0 ? (
          <ul className={s.docpDetails}>
            {entry.usedByFeatures.map((f) => (
              <li key={f.id}>{f.name}</li>
            ))}
          </ul>
        ) : (
          <p className={s.docpNote}>아직 이 테이블을 쓰는 기능 연결이 없어요.</p>
        )}
      </div>

      {/* AI 해석(F5) — 구조(위 사실)와 분리된 추론 레이어. 노트 내용은 InsightCard(제목+배지+요약+좋은 점/주의할 점)가 그린다. */}
      <div className={s.docpAiNote}>
        {entry.note ? (
          <InsightCard
            title="AI 해석"
            summary={entry.note.explanation}
            pros={entry.note.pros}
            cons={entry.note.cons}
            conservative={!entry.note.grounded}
            userEdited={entry.note.isUserEdited}
          />
        ) : (
          <>
            <div className={s.aiHead}>
              <span className={s.docpAiNoteTitle}>AI 해석</span>
              <Badge variant="status" tone="brand">
                AI 추정
              </Badge>
            </div>
            {notesLoading ? (
              <div className={s.aiMuted}>해석을 불러오는 중이에요…</div>
            ) : noteLoadFailed ? (
              // GET 실패는 "노트 없음"과 다르다 — 없어 보이게 뭉개지 않고 재시도를 안내한다(ASM-056 ⑥, 툴팁 카피와 통일).
              <div className={s.aiMuted}>해석을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>
            ) : (
              <div className={s.aiMuted}>아직 해석이 없어요. 데이터 뷰의 테이블에서 만들 수 있어요.</div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
