"use client"

import { type FC } from "react"
import { useGraphStore } from "@/lib/store/graph"
import {
  pagesByFeature,
  elementsOfPage,
  incompleteCount,
  isMappingComplete,
} from "@/lib/graph/selectors"
import type { ProjectGraph } from "@/lib/types/assembler"
import { COLOR, SPACING } from "@/lib/design-tokens"
import { TreeNav, type TreeNode } from "./tree/TreeNav"
import { IconFolder, IconPage, ElementIcon } from "./tree/icons"

// 선택 섹션의 아웃라인/목록을 풀 VS Code식 트리로 렌더(builder-layout.md §Tab 내비).
// 각 빌더는 graph → TreeNode[]. 셀렉터(pagesByFeature 등)는 그대로 재사용.
export const SectionTabNav: FC = () => {
  const section = useGraphStore((s) => s.section)
  const graph = useGraphStore((s) => s.graph)
  const selectedPageId = useGraphStore((s) => s.selectedPageId)
  const selectedElementId = useGraphStore((s) => s.selectedElementId)
  const selectPage = useGraphStore((s) => s.selectPage)
  const selectElement = useGraphStore((s) => s.selectElement)
  if (!graph) return null

  let nodes: TreeNode[] = []
  let label = ""
  if (section === "doc") {
    label = "문서"
    nodes = docNodes(graph)
  } else if (section === "structure") {
    label = "구조"
    nodes = structureNodes(graph, selectedPageId, selectPage)
  } else if (section === "wireframe") {
    label = "화면"
    nodes = wireframeNodes(graph, selectedPageId, selectedElementId, selectPage, selectElement)
  } else {
    label = "API·데이터"
    nodes = apiDataNodes(graph)
  }

  return (
    <aside style={NAV_STYLE} aria-label="섹션 내비게이션">
      <TreeNav nodes={nodes} label={label} />
    </aside>
  )
}

function folder(id: string, label: string, children: TreeNode[]): TreeNode {
  return { id, label, icon: <IconFolder />, children }
}

function docNodes(graph: ProjectGraph): TreeNode[] {
  return [
    { id: "doc-overview", label: "개요", icon: <IconPage /> },
    folder(
      "doc-reqs",
      `요구사항 (${graph.requirements.length})`,
      graph.requirements.map((r) => ({ id: r.id, label: r.title, icon: <IconPage /> }))
    ),
    folder(
      "doc-feats",
      `기능 (${graph.features.length})`,
      graph.features.map((f) => ({ id: f.id, label: f.name, icon: <IconPage /> }))
    ),
  ]
}

function structureNodes(
  graph: ProjectGraph,
  selectedPageId: string | null,
  selectPage: (id: string) => void
): TreeNode[] {
  const groups = pagesByFeature(graph)
  const featureName = (id: string) =>
    id === "" ? "미분류" : graph.features.find((f) => f.id === id)?.name ?? "기능"
  return [...groups.entries()].map(([featureId, pages]) =>
    folder(
      featureId || "_none",
      featureName(featureId),
      pages.map((p) => ({
        id: p.id,
        label: p.name,
        icon: <IconPage />,
        badge: incompleteCount(graph, p.id),
        selected: selectedPageId === p.id,
        onClick: () => selectPage(p.id),
      }))
    )
  )
}

function wireframeNodes(
  graph: ProjectGraph,
  selectedPageId: string | null,
  selectedElementId: string | null,
  selectPage: (id: string) => void,
  selectElement: (id: string) => void
): TreeNode[] {
  return graph.pages.map((p) => {
    const layers = elementsOfPage(graph, p.id)
    return {
      id: p.id,
      label: p.name,
      icon: <IconPage />,
      badge: incompleteCount(graph, p.id),
      selected: selectedPageId === p.id,
      onClick: () => selectPage(p.id),
      children: layers.map((el) => ({
        id: el.id,
        label: el.name,
        icon: <ElementIcon type={el.type} />,
        badge: isMappingComplete(el) ? 0 : 1,
        selected: selectedElementId === el.id,
        onClick: () => selectElement(el.id),
      })),
    }
  })
}

function apiDataNodes(graph: ProjectGraph): TreeNode[] {
  return [
    folder(
      "api-group",
      `API (${graph.apis.length})`,
      graph.apis.map((a) => ({ id: a.id, label: `${a.method} ${a.path}`, icon: <IconPage /> }))
    ),
    folder(
      "db-group",
      `Database (${graph.databases.length})`,
      graph.databases.map((d) => ({ id: d.id, label: d.name, icon: <IconPage /> }))
    ),
  ]
}

const NAV_STYLE: React.CSSProperties = {
  width: "240px",
  flexShrink: 0,
  height: "100%",
  overflowY: "auto",
  padding: SPACING["2"],
  borderRight: `1px solid ${COLOR.BORDER_DEFAULT}`,
  backgroundColor: COLOR.BG_SURFACE,
}
