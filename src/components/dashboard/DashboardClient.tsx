"use client"

import { useState } from "react"
import { useProjects } from "@/hooks/useProjects"
import { useFiles } from "@/hooks/useFiles"
import { api, type Product } from "@/lib/api/client"
import { errorMessage } from "@/lib/api/messages"
import { TopBar } from "./TopBar"
import { ProjectTabs } from "./ProjectTabs"
import { Composer } from "./Composer"
import { FileGrid } from "./FileGrid"
import { ConnectProjectModal } from "./ConnectProjectModal"
import s from "./dashboard.module.css"

export function DashboardClient() {
  const { projects, loading: projectsLoading, reload: reloadProjects } = useProjects()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { files, loading: filesLoading, reload: reloadFiles } = useFiles(selectedId, projects)

  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null

  const toast = (msg: string) => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 2600)
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

  const handleGenerate = async (idea: string) => {
    if (!selectedId) return
    setGenerating(true)
    try {
      await api.post(`/api/products/${selectedId}/files`, { idea })
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

  const handleOpenFile = () => {
    // 에디터(빌더 내부)는 다음 단계 — 지금은 스텁.
    toast("에디터는 곧 열려요.")
  }

  return (
    <div className={s.app}>
      <TopBar />
      <ProjectTabs
        projects={projects}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onConnect={() => setModalOpen(true)}
      />
      <Composer projectName={selectedProject?.name ?? null} generating={generating} onSubmit={handleGenerate} />
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
