import type { WorkspaceDesign } from "@/lib/types/assembler"
import s from "../editor.module.css"

// 와이어프레임 뷰 — 본 렌더는 후속. 지금은 준비 중 + 데이터 카운트.
export function WireframeView({ design }: { design: WorkspaceDesign }) {
  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>와이어프레임</span>
      </div>
      <div className={s.placeholder}>
        <div className={s.placeholderTitle}>와이어프레임은 준비 중이에요</div>
        <div className={s.placeholderSub}>화면 요소와 동작·API 연결을 한곳에서 보여드릴게요.</div>
        <div className={s.countRow}>
          <span className={s.countChip}>
            화면 <b>{design.pages.length}</b>
          </span>
          <span className={s.countChip}>
            요소 <b>{design.elements.length}</b>
          </span>
        </div>
      </div>
    </section>
  )
}
