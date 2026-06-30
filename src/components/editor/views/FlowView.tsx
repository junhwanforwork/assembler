import type { WorkspaceDesign } from "@/lib/types/assembler"
import s from "../editor.module.css"

// 유저플로우 뷰 — 노드/엣지 본 렌더는 후속. 지금은 준비 중 + 데이터 카운트.
export function FlowView({ design }: { design: WorkspaceDesign }) {
  const edgeCount = design.flows.reduce((n, f) => n + f.edges.length, 0)
  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>유저플로우</span>
      </div>
      <div className={s.placeholder}>
        <div className={s.placeholderTitle}>유저플로우는 준비 중이에요</div>
        <div className={s.placeholderSub}>화면과 화면 사이의 이동을 다이어그램으로 보여드릴게요.</div>
        <div className={s.countRow}>
          <span className={s.countChip}>
            화면 <b>{design.pages.length}</b>
          </span>
          <span className={s.countChip}>
            이동 <b>{edgeCount}</b>
          </span>
        </div>
      </div>
    </section>
  )
}
