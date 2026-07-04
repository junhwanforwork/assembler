"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useProjects } from "@/hooks/useProjects"
import { useFiles } from "@/hooks/useFiles"
import { useCodeTruth } from "./useCodeTruth"
import { api, type FileSummary, type Product } from "@/lib/api/client"
import { errorMessage } from "@/lib/api/messages"
import { TopBar } from "./TopBar"
import { ProjectTabs } from "./ProjectTabs"
import { Composer } from "./Composer"
import { FileGrid } from "./FileGrid"
import { CreateProjectModal } from "./CreateProjectModal"
import { CodeConnectModal } from "./CodeConnectModal"
import s from "./dashboard.module.css"

export function DashboardClient() {
  const router = useRouter()
  const { projects, loading: projectsLoading, error: projectsError, reload: reloadProjects } = useProjects()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { files, loading: filesLoading, error: filesError, reload: reloadFiles } = useFiles(selectedId, projects)

  const [idea, setIdea] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [codeConnectOpen, setCodeConnectOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null
  const { hasCodeTruth, reload: reloadCodeTruth } = useCodeTruth(selectedId)

  // 프로젝트가 1개면 자동 선택 — 첫 로드 완료 시 1회만(이후 "전체" 선택은 사용자 의사로 존중).
  const autoSelected = useRef(false)
  useEffect(() => {
    if (autoSelected.current || projectsLoading) return
    autoSelected.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 시스템(API) 첫 로드 완료에 1회 동기화
    if (projects.length === 1) setSelectedId(projects[0].id)
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

  // 만들기 → (아이디어가 있으면) 그 아이디어로 첫 스펙 생성 → 에디터 이동.
  // 생성 실패(429 등) 시 아이디어는 컴포저에 남아 있어 한 번 더 눌러 재시도.
  const handleCreateProject = async (name: string) => {
    setCreating(true)
    try {
      const product = await api.post<Product>("/api/products", { name })
      setModalOpen(false)
      // 생성을 먼저 발화(generating=true) — reload를 기다리는 사이 중복 제출 창을 닫는다.
      const submitted = idea.trim()
      if (submitted) void generateFile(product.id, submitted)
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

  // 성공하면 곧장 에디터로 — 모든 생성은 "프로젝트+스펙→에디터"로 수렴.
  // 성공 시 generating을 풀지 않는 건 의도: 내비게이션이 언마운트할 때까지
  // 스피너를 유지해 중복 제출·유휴 상태 깜빡임을 막는다.
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

  const handleOpenFile = (file: FileSummary) => {
    router.push(`/editor/${file.id}`)
  }

  // 프로젝트 로드가 실패하면 스펙 재조회의 전제가 없다 — 프로젝트부터 다시.
  const handleRetry = () => {
    if (projectsError) void reloadProjects()
    else void reloadFiles()
  }

  // 싱크-인 성공(ASM-026) — 카피 재판정 + 스펙 0개면 "메인" 자동 생성(온보딩 T7).
  // 존재 판정은 서버가 한 요청 안에서(ifNone) — 클라 GET→POST check-then-act는 생성 경합 시
  // "메인" 2개를 만들 수 있어 제거(ASM-027). activity는 라우트가 서버 경계에서 기록한다.
  const handleCodeSynced = async (summary: { apis: number; tables: number }) => {
    setCodeConnectOpen(false)
    reloadCodeTruth()
    let createdMain = false
    if (selectedId) {
      try {
        const res = await api.post<{ skipped?: boolean }>("/api/workspaces", {
          productId: selectedId,
          name: "메인",
          ifNone: true,
        })
        createdMain = !res.skipped
      } catch {
        // 자동 생성은 보조 동작 — 실패해도 싱크 성공 사실은 그대로 알린다.
      }
      await reloadFiles()
    }
    const parts = [summary.apis > 0 && `API ${summary.apis}`, summary.tables > 0 && `테이블 ${summary.tables}`]
      .filter(Boolean)
      .join(" · ")
    toast(createdMain ? "코드를 연결하고 메인 스펙을 만들었어요" : `코드를 연결했어요 (${parts})`)
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
        hasCodeTruth={hasCodeTruth}
        generating={generating}
        onSubmit={handleComposerSubmit}
        onCodeConnect={selectedProject ? () => setCodeConnectOpen(true) : null}
      />
      <FileGrid
        files={files}
        loading={projectsLoading || filesLoading}
        error={projectsError || filesError}
        onRetry={handleRetry}
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
      {codeConnectOpen && selectedProject && (
        <CodeConnectModal
          productId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => {
            setCodeConnectOpen(false)
            // 부분 실패(API만 연결) 후 닫아도 카피·표면이 실제 코드-진실과 어긋나지 않게 재판정.
            reloadCodeTruth()
          }}
          onSynced={handleCodeSynced}
        />
      )}
      {notice && <div className={s.toast}>{notice}</div>}
    </div>
  )
}
