"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { clsx } from "clsx"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import {
  docAnchorId,
  projectDoc,
  UNLINKED_ANCHOR_ID,
  UNLINKED_SECTION_TITLE,
  type DocFeatureBlock,
  type DocSection,
} from "./docProjection"
import { PriorityBars, RequirementStatusPill } from "./Badges"
import s from "../editor.module.css"

// 문서(PRD) 뷰 — 모델→문서 각도의 읽기 투사. 편집·AI 초안(#26)은 후속.
export function DocView({ design }: { design: WorkspaceDesign }) {
  const doc = useMemo(() => projectDoc(design), [design])
  const [flashId, setFlashId] = useState<string | null>(null)
  const flashTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    },
    [],
  )

  // #23 TOC 클릭 → 섹션 앵커 스크롤 + 잠시 강조.
  function jumpTo(anchorId: string) {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setFlashId(anchorId)
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlashId(null), 1600)
  }

  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>문서</span>
        {/* #21·#24 — v1 문서 종류는 모델 투사 프리셋 PRD 하나뿐이라 선택 pill 대신 정적 라벨(거짓 버튼 금지). */}
        <span className={s.muted}>PRD</span>
      </div>

      {doc.isEmpty ? (
        <div className={s.emptyCol} style={{ flex: 1 }}>
          아직 문서로 정리할 요구사항이 없어요. 요구사항을 만들면 PRD로 보여드려요.
        </div>
      ) : (
        <div className={s.docp}>
          <div className={s.docpInner}>
            {doc.toc.length > 1 && (
              <nav className={s.docpToc} aria-label="문서 목차">
                <div className={s.docpTocTitle}>목차</div>
                {doc.toc.map((t) => (
                  <button key={t.anchorId} type="button" title={t.title} onClick={() => jumpTo(t.anchorId)}>
                    {t.title}
                  </button>
                ))}
              </nav>
            )}

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
      )}
    </section>
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
