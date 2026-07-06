"use client"

import { useMemo } from "react"
import { clsx } from "clsx"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import { useEditorStore } from "@/lib/stores/useEditorStore"
import { buildWireframeStacks } from "./wireframeUtils"
import s from "../editor.module.css"

// 와이어프레임 구조 렌더(ASM-034) — 픽셀 목업이 아니라 페이지→와이어프레임→요소 스택 구조.
// 요소 클릭 → 공용 인스펙터가 매핑(동작·상태·API·DB·결과)을 보여준다(#46).
export function WireframeView({ design }: { design: WorkspaceDesign }) {
  const stacks = useMemo(() => buildWireframeStacks(design), [design])
  const selectedElementId = useEditorStore((st) => st.selectedElementId)
  const selectElement = useEditorStore((st) => st.selectElement)

  return (
    <section className={s.view}>
      <div className={s.viewHead}>
        <span className={s.viewTitle}>와이어프레임</span>
        <div className={s.spacer} />
        <span className={s.countChip}>
          화면 <b>{design.pages.length}</b>
        </span>
        <span className={s.countChip}>
          요소 <b>{design.elements.length}</b>
        </span>
      </div>

      {stacks.length === 0 ? (
        <div className={s.placeholder}>
          <div className={s.placeholderTitle}>아직 화면이 없어요</div>
          <div className={s.placeholderSub}>
            아래 챗에 만들고 싶은 화면을 이야기해 보세요. 화면이 생기면 화면마다 어떤 요소로 이루어지는지
            보여드릴게요.
          </div>
        </div>
      ) : (
        <div className={s.wireScroll}>
          <div className={s.wireGrid}>
            {stacks.map((stack) => (
              <section className={s.wirePage} key={stack.key}>
                <div className={s.wirePageHead}>
                  <span className={s.wirePageName}>{stack.title}</span>
                  <span className={s.wirePageCount}>요소 {stack.elements.length}</span>
                </div>
                {stack.description && <div className={s.wirePageDesc}>{stack.description}</div>}

                {!stack.hasWireframe ? (
                  <div className={s.wireEmpty}>이 화면은 아직 와이어프레임이 없어요.</div>
                ) : stack.elements.length === 0 ? (
                  <div className={s.wireEmpty}>아직 요소가 없어요.</div>
                ) : (
                  <div className={s.wireStack}>
                    {stack.elements.map((el) => (
                      <button
                        key={el.id}
                        type="button"
                        className={clsx(s.wireEl, selectedElementId === el.id && s.wireElSelected)}
                        aria-current={selectedElementId === el.id || undefined}
                        onClick={() => selectElement(el.id)}
                      >
                        <span className={s.wireElType}>{el.type}</span>
                        <span className={s.wireElLabel}>{el.label || "이름 없는 요소"}</span>
                      </button>
                    ))}
                  </div>
                )}

                {stack.danglingCount > 0 && (
                  <div className={s.wireMissing}>찾을 수 없는 요소 {stack.danglingCount}개는 뺐어요.</div>
                )}
              </section>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
