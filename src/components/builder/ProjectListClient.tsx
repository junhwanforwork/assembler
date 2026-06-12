"use client"

import { type FC, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui"
import { COLOR, RADIUS, SPACING, TYPOGRAPHY } from "@/lib/design-tokens"
import { createProject, deleteProject, listProjects } from "@/lib/builder/api"
import type { ProjectListItem } from "@/lib/types/builder"

type LoadState = "loading" | "ready" | "error"

export const ProjectListClient: FC = () => {
  const router = useRouter()
  const [items, setItems] = useState<ProjectListItem[]>([])
  const [state, setState] = useState<LoadState>("loading")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let cancelled = false
    listProjects()
      .then((list) => {
        if (cancelled) return
        setItems(list)
        setState("ready")
      })
      .catch(() => {
        if (!cancelled) setState("error")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const id = await createProject()
      router.push(`/project/${id}`)
    } catch {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    const prev = items
    setItems((cur) => cur.filter((p) => p.id !== id))
    try {
      await deleteProject(id)
    } catch {
      setItems(prev)
    }
  }

  return (
    <main style={MAIN_STYLE}>
      <div style={HEADER_ROW_STYLE}>
        <div>
          <h1 style={{ ...TYPOGRAPHY.STYLE.H2, color: COLOR.TEXT_PRIMARY, margin: 0 }}>
            UX 빌더
          </h1>
          <p style={{ ...TYPOGRAPHY.STYLE.BODY_2, color: COLOR.TEXT_MUTED, marginTop: SPACING["1"] }}>
            컴포넌트를 끌어다 화면을 짜고, 화면을 플로우로 이어 보세요
          </p>
        </div>
        <Button variant="solid" size="lg" loading={creating} onClick={handleCreate}>
          새 프로젝트 만들기
        </Button>
      </div>

      {state === "loading" && <Notice text="불러오는 중이에요" />}
      {state === "error" && <Notice text="목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." />}
      {state === "ready" && items.length === 0 && (
        <Notice text="아직 만든 프로젝트가 없어요. 새 프로젝트를 만들어 보세요." />
      )}

      {state === "ready" && items.length > 0 && (
        <div style={GRID_STYLE}>
          {items.map((p) => (
            <ProjectCard key={p.id} item={p} onOpen={() => router.push(`/project/${p.id}`)} onDelete={() => handleDelete(p.id)} />
          ))}
        </div>
      )}
    </main>
  )
}

const ProjectCard: FC<{ item: ProjectListItem; onOpen: () => void; onDelete: () => void }> = ({
  item,
  onOpen,
  onDelete,
}) => (
  <div style={CARD_STYLE}>
    <button type="button" onClick={onOpen} style={CARD_BODY_STYLE}>
      <span style={{ ...TYPOGRAPHY.STYLE.TITLE_1, color: COLOR.TEXT_PRIMARY }}>{item.title}</span>
      <span style={{ ...TYPOGRAPHY.STYLE.LABEL_2, color: COLOR.TEXT_MUTED }}>
        화면 {item.screenCount}개
      </span>
    </button>
    <Button variant="ghost" size="sm" onClick={onDelete}>
      삭제하기
    </Button>
  </div>
)

const Notice: FC<{ text: string }> = ({ text }) => (
  <p style={{ ...TYPOGRAPHY.STYLE.BODY_1, color: COLOR.TEXT_MUTED, marginTop: SPACING["8"] }}>
    {text}
  </p>
)

const MAIN_STYLE: React.CSSProperties = {
  maxWidth: "960px",
  margin: "0 auto",
  padding: `${SPACING["10"]} ${SPACING["6"]}`,
}

const HEADER_ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: SPACING["4"],
  marginBottom: SPACING["8"],
}

const GRID_STYLE: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: SPACING["4"],
}

const CARD_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["3"],
  padding: SPACING["5"],
  borderRadius: RADIUS.LG,
  border: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
}

const CARD_BODY_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: SPACING["2"],
  alignItems: "flex-start",
  textAlign: "left",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
}
