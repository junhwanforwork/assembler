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
import { ConnectProjectModal } from "./ConnectProjectModal"
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

  const handleCreateProject = async (name: string) => {
    setCreating(true)
    try {
      const product = await api.post<Product>("/api/products", { name })
      setModalOpen(false)
      await reloadProjects()
      setSelectedId(product.id)
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

  const generateFile = async (productId: string, submitted: string) => {
    setGenerating(true)
    try {
      await api.post(`/api/products/${productId}/files`, { idea: submitted })
      setIdea("")
      await reloadFiles()
      toast("새 파일을 만들었어요.")
    } catch (error) {
      toast(errorMessage(error))
    } finally {
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
        <ConnectProjectModal creating={creating} onClose={() => setModalOpen(false)} onCreate={handleCreateProject} />
      )}
      {notice && <div className={s.toast}>{notice}</div>}
    </div>
  )
}
