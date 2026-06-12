import { useEffect, useRef, useState } from "react"
import { useBuilderStore } from "@/lib/store/builder"
import { saveProject } from "@/lib/builder/api"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

// 문서가 변경되면(hasUnsavedChanges) 2초 디바운스 후 통째로 저장한다.
export function useBuilderAutosave(): SaveStatus {
  const projectId = useBuilderStore((s) => s.projectId)
  const hasUnsavedChanges = useBuilderStore((s) => s.hasUnsavedChanges)
  const [status, setStatus] = useState<SaveStatus>("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!projectId || !hasUnsavedChanges) return
    if (timer.current) clearTimeout(timer.current)

    timer.current = setTimeout(async () => {
      const { title, toDocument, markSaved } = useBuilderStore.getState()
      const snapshot = toDocument()
      setStatus("saving")
      try {
        await saveProject(projectId, title, snapshot)
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
