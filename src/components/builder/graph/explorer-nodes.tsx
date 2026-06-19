"use client"

import type { ProjectGraph } from "@/lib/types/assembler"
import type { NodeType, SelectedNode } from "@/lib/store/graph"
import { pagesByFeature, incompleteCount, elementsOfPage, isMappingComplete } from "@/lib/graph/selectors"
import type { TreeNode } from "./tree/TreeNav"
import {
  IconRequirement,
  IconFeature,
  IconApi,
  IconDatabase,
  IconPage,
  IconRoot,
  ElementIcon,
} from "./tree/icons"

// 통합 EXPLORER 트리(ASS-070) 노드 빌더 — graph → 단일 TreeNode[](그룹 헤더 4개).
// 노드 선택은 selectNode(type, id) → 캔버스 뷰 파생. selected는 selectedNode 일치.

// 그룹 헤더 id는 노드 id와 충돌하지 않도록 고정 접두(collapsedIds 키로도 사용).
const GROUP_REQ = "grp-requirements"
const GROUP_FEAT = "grp-features"
const GROUP_API = "grp-apis"
const GROUP_DB = "grp-databases"

type SelectFn = (type: NodeType, id: string) => void

function isSelected(selected: SelectedNode | null, type: NodeType, id: string): boolean {
  return selected?.type === type && selected.id === id
}

export function buildExplorerNodes(
  graph: ProjectGraph,
  selected: SelectedNode | null,
  selectNode: SelectFn
): TreeNode[] {
  return [
    // 루트 = 프로젝트 개요/흐름 진입점. 선택 해제 후 흐름 뷰로 돌아올 트리 경로(root는 1개라 타입만 매칭).
    {
      id: graph.id,
      label: graph.name,
      icon: <IconRoot />,
      selected: selected?.type === "root",
      onClick: () => selectNode("root", graph.id),
    },
    requirementGroup(graph, selected, selectNode),
    featureGroup(graph, selected, selectNode),
    apiGroup(graph, selected, selectNode),
    databaseGroup(graph, selected, selectNode),
  ]
}

function requirementGroup(graph: ProjectGraph, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  return {
    id: GROUP_REQ,
    label: `요구사항 (${graph.requirements.length})`,
    icon: <IconRequirement />,
    children: graph.requirements.map((r) => ({
      id: r.id,
      label: r.title,
      icon: <IconRequirement />,
      selected: isSelected(selected, "requirement", r.id),
      onClick: () => selectNode("requirement", r.id),
    })),
  }
}

function featureGroup(graph: ProjectGraph, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  const groups = pagesByFeature(graph)
  return {
    id: GROUP_FEAT,
    label: `기능 (${graph.features.length})`,
    icon: <IconFeature />,
    children: graph.features.map((f) => ({
      id: f.id,
      label: f.name,
      icon: <IconFeature />,
      selected: isSelected(selected, "feature", f.id),
      onClick: () => selectNode("feature", f.id),
      children: (groups.get(f.id) ?? []).map((p) => pageNode(graph, f.id, p.id, p.name, selected, selectNode)),
    })),
  }
}

// page는 N:N으로 여러 feature 아래 나타날 수 있어, 트리 노드 id(=React key·collapse 키)는 경로 합성으로
// 유일화한다. selected/onClick은 실제 객체 id로 분리해 선택·라우팅 정합을 유지.
function pageNode(
  graph: ProjectGraph,
  featureId: string,
  pageId: string,
  pageName: string,
  selected: SelectedNode | null,
  selectNode: SelectFn
): TreeNode {
  const path = `${featureId}:${pageId}`
  return {
    id: path,
    label: pageName,
    icon: <IconPage />,
    badge: incompleteCount(graph, pageId),
    selected: isSelected(selected, "page", pageId),
    onClick: () => selectNode("page", pageId),
    children: elementsOfPage(graph, pageId).map((el) => ({
      id: `${path}:${el.id}`,
      label: el.name,
      icon: <ElementIcon type={el.type} />,
      badge: isMappingComplete(el) ? 0 : 1,
      selected: isSelected(selected, "element", el.id),
      onClick: () => selectNode("element", el.id),
    })),
  }
}

function apiGroup(graph: ProjectGraph, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  return {
    id: GROUP_API,
    label: `API (${graph.apis.length})`,
    icon: <IconApi />,
    children: graph.apis.map((a) => ({
      id: a.id,
      label: `${a.method} ${a.path}`,
      icon: <IconApi />,
      selected: isSelected(selected, "api", a.id),
      onClick: () => selectNode("api", a.id),
    })),
  }
}

function databaseGroup(graph: ProjectGraph, selected: SelectedNode | null, selectNode: SelectFn): TreeNode {
  return {
    id: GROUP_DB,
    label: `Database (${graph.databases.length})`,
    icon: <IconDatabase />,
    children: graph.databases.map((d) => ({
      id: d.id,
      label: d.name,
      icon: <IconDatabase />,
      selected: isSelected(selected, "database", d.id),
      onClick: () => selectNode("database", d.id),
    })),
  }
}
