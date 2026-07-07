import { clsx } from "clsx"
import { Badge } from "./Badge"
import { insightSections } from "./insightContent"
import s from "./InsightCard.module.css"

// AI 해석 카드(ASM-057) — 제목 + 'AI 추정' 배지 → 요약 → 좋은 점/주의할 점 섹션.
// 해석은 추론 레이어라 배지로 사실 카드보다 하위임을 항상 명시한다(F5 문법).
// 하위호환: pros/cons 없는 구형 단문 노트는 요약만 렌더(빈 섹션 방출 금지 — insightContent).
// 서피스(배경·보더)·상태 분기(loading/error/empty)·액션 버튼은 소비처 몫.

export type InsightCardProps = {
  title?: string
  summary: string
  pros?: string[]
  cons?: string[]
  // grounded=false — 연결 증거 없이 보수적으로 추정한 노트임을 알린다(기존 카피 유지).
  conservative?: boolean
  // isUserEdited — 사람이 고쳐 AI가 덮지 않는 설명임을 알린다(기존 카피 유지).
  userEdited?: boolean
}

export function InsightCard({ title, summary, pros, cons, conservative = false, userEdited = false }: InsightCardProps) {
  const sections = insightSections(pros, cons)

  return (
    <div>
      <div className={s.head}>
        {title && <span className={s.title}>{title}</span>}
        <Badge variant="status" tone="brand">
          AI 추정
        </Badge>
      </div>
      <p className={s.summary}>{summary}</p>
      {sections.map((section) => (
        <div key={section.key} className={s.section}>
          <div className={clsx(s.sectionTitle, s[section.tone])}>{section.heading}</div>
          <ul className={s.list}>
            {section.items.map((item) => (
              <li key={item} className={clsx(s.item, s[section.tone])}>
                <span className={s.dot} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {conservative && <div className={s.conservative}>연결 정보가 적어 보수적으로 추정했어요.</div>}
      {userEdited && <div className={s.meta}>직접 편집한 설명이에요.</div>}
    </div>
  )
}
