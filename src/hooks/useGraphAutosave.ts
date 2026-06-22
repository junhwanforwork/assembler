import { useEffect, useRef, useState } from "react"
import { useGraphStore } from "@/lib/store/graph"
import { saveProjectGraph } from "@/lib/graph/api"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

// 그래프가 변경되면(hasUnsavedChanges) 2초 디바운스 후 ProjectGraph를 통째로 저장한다.
// (옛 useBuilderAutosave 미러 — store만 graph store로 교체.)
export function useGraphAutosave(): SaveStatus {
  const projectId = useGraphStore((s) => s.projectId)
  const hasUnsavedChanges = useGraphStore((s) => s.hasUnsavedChanges)
  const [status, setStatus] = useState<SaveStatus>("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // preview는 픽스처 검증용 — 저장하지 않는다.
    if (!projectId || projectId === "preview" || !hasUnsavedChanges) return
    if (timer.current) clearTimeout(timer.current)

    timer.current = setTimeout(async () => {
      const { graph, serialize, markSaved } = useGraphStore.getState()
      const snapshot = serialize()
      if (!snapshot) return
      setStatus("saving")
      try {
        await saveProjectGraph(projectId, graph?.name || "제목 없는 프로젝트", snapshot)
        markSaved()
        setStatus("saved")
      } catch {
        setStatus("error")
      }
    }, 2000)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [projectId, hasUnsavedChanges])

  return status
}
