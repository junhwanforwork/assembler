"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/hooks/useProjects"
import { useFiles } from "@/hooks/useFiles"
import { api, type FileSummary, type Product } from "@/lib/api/client"
import { errorMessage } from "@/lib/api/messages"
import { TopBar } from "./TopBar"
import { ProjectTabs } from "./ProjectTabs"
import { Composer } from "./Composer"
import { FileGrid } from "./FileGrid"
import { CreateProjectModal } from "./CreateProjectModal"
import s from "./dashboard.module.css"

export function DashboardClient() {
  const router = useRouter()
  const { projects, loading: projectsLoading, reload: reloadProjects } = useProjects()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { files, loading: filesLoading, reload: reloadFiles } = useFiles(selectedId, projects)

  const [idea, setIdea] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null

  // 프로젝트가 1개면 자동 선택 — 첫 로드 1회만(이후 "전체" 선택은 사용자 의사로 존중).
  const autoSelected = useRef(false)
  useEffect(() => {
    if (autoSelected.current || projectsLoading || projects.length !== 1) return
    autoSelected.current = true
    setSelectedId(projects[0].id)
  }, [projectsLoading, projects])

  // 연속 토스트 시 이전 타이머가 새 토스트를 조기에 지우지 않게 clear 후 재설정.
  const toastTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    },
    []
  )

  const toast = (msg: string) => {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    setNotice(msg)
    toastTimer.current = window.setTimeout(() => setNotice(null), 2600)
  }

  // 만들기 → (아이디어가 있으면) 그 아이디어로 첫 파일 생성 → 에디터 이동.
  // 생성 실패(429 등) 시 아이디어는 컴포저에 남아 있어 한 번 더 눌러 재시도.
  const handleCreateProject = async (name: string) => {
    setCreating(true)
    try {
      const product = await api.post<Product>("/api/products", { name })
      setModalOpen(false)
      await reloadProjects()
      setSelectedId(product.id)
      const submitted = idea.trim()
      if (submitted) void generateFile(product.id, submitted)
    } catch (error) {
      toast(errorMessage(error))
    } finally {
      setCreating(false)
    }
  }

  // 제출 시 프로젝트가 없으면 만들기 모달로 잇는다(아이디어는 컴포저에 보존) — 경로 C.
  const handleComposerSubmit = (submitted: string) => {
    if (!selectedId) {
      setModalOpen(true)
      return
    }
    void generateFile(selectedId, submitted)
  }

  // 성공하면 곧장 에디터로 — 모든 진입은 "프로젝트+파일→에디터"로 수렴.
  const generateFile = async (productId: string, submitted: string) => {
    setGenerating(true)
    try {
      const { file } = await api.post<{ file: FileSummary }>(`/api/products/${productId}/files`, { idea: submitted })
      setIdea("")
      router.push(`/editor/${file.id}`)
    } catch (error) {
      toast(errorMessage(error))
      setGenerating(false)
    }
  }

  const handleNewFile = async () => {
    if (!selectedId) return
    try {
      await api.post("/api/workspaces", { productId: selectedId, name: "새 파일" })
      await reloadFiles()
    } catch (error) {
      toast(errorMessage(error))
    }
  }

  const handleOpenFile = (file: FileSummary) => {
    router.push(`/editor/${file.id}`)
  }

  return (
    <div className={s.app}>
      <TopBar />
      <ProjectTabs
        projects={projects}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={() => setModalOpen(true)}
      />
      <Composer
        idea={idea}
        onIdeaChange={setIdea}
        projectName={selectedProject?.name ?? null}
        hasProjects={projects.length > 0}
        generating={generating}
        onSubmit={handleComposerSubmit}
      />
      <FileGrid
        files={files}
        loading={projectsLoading || filesLoading}
        canCreate={selectedId !== null}
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
      />

      {modalOpen && (
        <CreateProjectModal
          creating={creating}
          pendingIdea={idea.trim() || null}
          onClose={() => setModalOpen(false)}
          onCreate={handleCreateProject}
        />
      )}
      {notice && <div className={s.toast}>{notice}</div>}
    </div>
  )
}
