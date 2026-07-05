import type { Product } from "@/lib/api/client"
import { Button } from "@/components/ui/Button"
import { Segmented, SegmentedButton } from "@/components/ui/Segmented"
import { PlusIcon } from "@/components/ui/icons"
import s from "./dashboard.module.css"

// 프로젝트(메인) 탭. "전체"(=null) + 각 프로젝트. 우측에 프로젝트 만들기.
export function ProjectTabs({
  projects,
  selectedId,
  onSelect,
  onCreate,
}: {
  projects: Product[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCreate: () => void
}) {
  return (
    <div className={s.mains}>
      <Segmented size="md" tone="outline" aria-label="프로젝트" className={s.mainsTabs}>
        <SegmentedButton active={selectedId === null} onClick={() => onSelect(null)}>
          전체
        </SegmentedButton>
        {projects.map((p) => (
          <SegmentedButton key={p.id} active={selectedId === p.id} onClick={() => onSelect(p.id)}>
            {p.name}
          </SegmentedButton>
        ))}
      </Segmented>
      <Button variant="ghost" size="sm" leftIcon={<PlusIcon size={15} />} onClick={onCreate}>
        프로젝트 만들기
      </Button>
    </div>
  )
}
