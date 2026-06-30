import type { WorkspaceDesign } from "@/lib/types/assembler"
import s from "../editor.module.css"

// 문서(PRD·정책) 뷰 — 본 렌더는 후속. 지금은 준비 중 + 데이터 카운트.
export function DocView({ design }: { design: WorkspaceDesign }) {
  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>문서</span>
        <span className={s.muted} style={{ fontSize: 12 }}>
          · 정책·메모도 여기에 저장해요
        </span>
      </div>
      <div className={s.placeholder}>
        <div className={s.placeholderTitle}>문서 편집은 준비 중이에요</div>
        <div className={s.placeholderSub}>PRD·정책 문서를 여기서 다듬을 수 있게 곧 열어드릴게요.</div>
        <div className={s.countRow}>
          <span className={s.countChip}>
            요구사항 <b>{design.requirements.length}</b>
          </span>
          <span className={s.countChip}>
            기능 <b>{design.features.length}</b>
          </span>
        </div>
      </div>
    </section>
  )
}
