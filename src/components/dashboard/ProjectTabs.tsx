import { clsx } from "clsx"
import type { Product } from "@/lib/api/client"
import { Button } from "@/components/ui/Button"
import { PlusIcon } from "@/components/ui/icons"
import s from "./dashboard.module.css"

// 프로젝트(메인) 탭. "전체"(=null) + 각 프로젝트. 우측에 프로젝트 연결.
export function ProjectTabs({
  projects,
  selectedId,
  onSelect,
  onConnect,
}: {
  projects: Product[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onConnect: () => void
}) {
  return (
    <div className={s.mains}>
      <div className={s.mainsTabs}>
        <button className={clsx(s.tab, selectedId === null && s.active)} onClick={() => onSelect(null)}>
          전체
        </button>
        {projects.map((p) => (
          <button key={p.id} className={clsx(s.tab, selectedId === p.id && s.active)} onClick={() => onSelect(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      <Button variant="ghost" size="sm" leftIcon={<PlusIcon size={15} />} onClick={onConnect}>
        프로젝트 연결
      </Button>
    </div>
  )
}
