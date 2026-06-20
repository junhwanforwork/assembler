"use client"

import type { ProjectGraph, Requirement, Feature, Api, Database, UIElement } from "@/lib/types/assembler"
import type { NodeType, SelectedNode } from "@/lib/store/graph"
import {
  incompleteCount,
  elementsOfPage,
  isMappingComplete,
  featuresByPage,
  requirementsByPage,
  apisOfPage,
  databasesOfPage,
} from "@/lib/graph/selectors"
import type { TreeNode } from "./tree/TreeNav"
import {
  IconRequirement,
  IconFeature,
  IconApi,
  IconDatabase,
  IconPage,
  IconRoot,
  IconGlobal,
  IconScreen,
  ElementIcon,
} from "./tree/icons"

// 통합 EXPLORER 트리(ASS-070 → ASS-077 IA 재구성) 노드 빌더.
// 구조: (프로젝트 개요) · 글로벌(요구사항/API/DB 전역) · 화면(각 Page → 요구사항/기능/와이어프레임/관련데이터 facet).
// facet은 폴더(children만, onClick 없음=펼침). 선택 리프는 기존 NodeType 그대로 → 캔버스 라우팅 무변경.
// 노드 id는 경로 합성 키(한 객체가 글로벌·여러 페이지에 중복 등장 → key/collapse 충돌 방지). selected/onClick은 실 id.

type SelectFn = (type: NodeType, id: string) => void

function isSelected(selected: SelectedNode | null, type: NodeType, id: string): boolean {
  return selected?.type === type && selected.id === id
}

function folder(id: string, label: string, icon: React.ReactNode, children: TreeNode[]): TreeNode {
  return { id, label, icon, children }
}

// --- 객체별 리프 (prefix로 위치별 유일 키, onClick은 실 id) ---
function reqLeaf(prefix: string, r: Requirement, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  return {
    id: `${prefix}:req:${r.id}`,
    label: r.title,
    icon: <IconRequirement />,
    selected: isSelected(selected, "requirement", r.id),
    onClick: () => selectNode("requirement", r.id),
  }
}

function featLeaf(prefix: string, f: Feature, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  return {
    id: `${prefix}:feat:${f.id}`,
    label: f.name,
    icon: <IconFeature />,
    selected: isSelected(selected, "feature", f.id),
    onClick: () => selectNode("feature", f.id),
  }
}

function apiLeaf(prefix: string, a: Api, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  return {
    id: `${prefix}:api:${a.id}`,
    label: `${a.method} ${a.path}`,
    icon: <IconApi />,
    selected: isSelected(selected, "api", a.id),
    onClick: () => selectNode("api", a.id),
  }
}

function dbLeaf(prefix: string, d: Database, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  return {
    id: `${prefix}:db:${d.id}`,
    label: d.name,
    icon: <IconDatabase />,
    selected: isSelected(selected, "database", d.id),
    onClick: () => selectNode("database", d.id),
  }
}

function elLeaf(prefix: string, el: UIElement, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  return {
    id: `${prefix}:el:${el.id}`,
    label: el.name,
    icon: <ElementIcon type={el.type} />,
    badge: isMappingComplete(el) ? 0 : 1,
    selected: isSelected(selected, "element", el.id),
    onClick: () => selectNode("element", el.id),
  }
}

export function buildExplorerNodes(
  graph: ProjectGraph,
  selected: SelectedNode | null,
  selectNode: SelectFn
): TreeNode[] {
  return [
    // 프로젝트 개요 — 선택 해제 후 흐름 뷰 재진입(root는 1개라 타입만 매칭).
    {
      id: graph.id,
      label: graph.name,
      icon: <IconRoot />,
      selected: selected?.type === "root",
      onClick: () => selectNode("root", graph.id),
    },
    globalGroup(graph, selected, selectNode),
    screenGroup(graph, selected, selectNode),
  ]
}

// 글로벌 — 전체 서비스 차원 객체(전역 컬렉션 그대로).
function globalGroup(graph: ProjectGraph, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  return folder("grp-global", "글로벌", <IconGlobal />, [
    folder(
      "g:reqs",
      `요구사항 (${graph.requirements.length})`,
      <IconRequirement />,
      graph.requirements.map((r) => reqLeaf("g", r, selected, selectNode))
    ),
    folder(
      "g:apis",
      `API (${graph.apis.length})`,
      <IconApi />,
      graph.apis.map((a) => apiLeaf("g", a, selected, selectNode))
    ),
    folder(
      "g:dbs",
      `데이터베이스 (${graph.databases.length})`,
      <IconDatabase />,
      graph.databases.map((d) => dbLeaf("g", d, selected, selectNode))
    ),
  ])
}

// 화면 — 각 Page가 1차 단위. Page 선택=wireframe. 하위 facet(요구사항/기능/와이어프레임/관련데이터)은 파생 폴더.
function screenGroup(graph: ProjectGraph, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  return folder(
    "grp-screen",
    `화면 (${graph.pages.length})`,
    <IconScreen />,
    graph.pages.map((p) => pageNode(graph, p.id, p.name, selected, selectNode))
  )
}

function pageNode(
  graph: ProjectGraph,
  pageId: string,
  pageName: string,
  selected: SelectedNode | null,
  selectNode: SelectFn
): TreeNode {
  const prefix = `pg:${pageId}`
  const reqs = requirementsByPage(graph, pageId)
  const feats = featuresByPage(graph, pageId)
  const els = elementsOfPage(graph, pageId)
  const apis = apisOfPage(graph, pageId)
  const dbs = databasesOfPage(graph, pageId)

  return {
    id: prefix,
    label: pageName,
    icon: <IconPage />,
    badge: incompleteCount(graph, pageId),
    selected: isSelected(selected, "page", pageId),
    onClick: () => selectNode("page", pageId),
    children: [
      folder(
        `${prefix}:f-reqs`,
        `요구사항 (${reqs.length})`,
        <IconRequirement />,
        reqs.map((r) => reqLeaf(prefix, r, selected, selectNode))
      ),
      folder(
        `${prefix}:f-feats`,
        `기능 (${feats.length})`,
        <IconFeature />,
        feats.map((f) => featLeaf(prefix, f, selected, selectNode))
      ),
      folder(
        `${prefix}:f-wf`,
        `와이어프레임 (${els.length})`,
        <IconScreen />,
        els.map((el) => elLeaf(prefix, el, selected, selectNode))
      ),
      folder(`${prefix}:f-data`, `관련 데이터 (${apis.length + dbs.length})`, <IconDatabase />, [
        ...apis.map((a) => apiLeaf(prefix, a, selected, selectNode)),
        ...dbs.map((d) => dbLeaf(prefix, d, selected, selectNode)),
      ]),
    ],
  }
}
