"use client"

import type { Product } from "@/lib/api/client"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import s from "./dashboard.module.css"

// 코드 연결 대상 고르기(ASM-066 추가지시) — 프로젝트가 여럿인데 '전체' 탭(미선택)에서
// 진입했을 때. 기존 프로젝트를 고르거나(중복 생성 방지) 새로 만들 수 있게 한다.
export function ConnectProjectPicker({
  projects,
  onPick,
  onCreateNew,
  onClose,
}: {
  projects: Product[]
  onPick: (product: Product) => void
  onCreateNew: () => void
  onClose: () => void
}) {
  return (
    <Modal labelledBy="connect-picker-title" onClose={onClose}>
      <div className={s.modalTitle} id="connect-picker-title">
        어느 프로젝트에 연결할까요?
      </div>
      <p className={s.modalSub}>코드를 연결할 프로젝트를 고르거나 새로 만들어요.</p>
      <ul className={s.pickList}>
        {projects.map((p) => (
          <li key={p.id}>
            <button type="button" className={s.pickRow} onClick={() => onPick(p)}>
              {p.name}
            </button>
          </li>
        ))}
      </ul>
      <div className={s.modalActions}>
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
        <Button variant="ghost" onClick={onCreateNew}>
          새 프로젝트 만들기
        </Button>
      </div>
    </Modal>
  )
}
