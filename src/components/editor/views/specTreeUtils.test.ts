import { describe, expect, it } from "vitest"
import type { Feature, Requirement } from "@/lib/types/assembler"
import { layoutSpecTree, TREE_NODE_H, TREE_Y0 } from "./specTreeUtils"

function req(id: string): Requirement {
  return { id, title: `요구 ${id}`, description: "", status: "draft", priority: "medium", role: "", acceptanceCriteria: [] }
}

function feat(id: string, requirementIds: string[]): Feature {
  return { id, name: `기능 ${id}`, description: "", detailFeatures: [], requirementIds, pageIds: [], apiIds: [] }
}

describe("layoutSpecTree", () => {
  const reqs = [req("r1"), req("r2"), req("r3")]
  const feats = [feat("f1", ["r1"]), feat("f2", ["r1"]), feat("f3", ["r2"])]

  it("요구사항 노드는 같은 컬럼(x)에 위→아래로 쌓인다", () => {
    const { reqNodes } = layoutSpecTree(reqs, feats, "r1")
    expect(new Set(reqNodes.map((n) => n.x)).size).toBe(1)
    expect(reqNodes[0].y).toBeLessThan(reqNodes[1].y)
    expect(reqNodes[1].y).toBeLessThan(reqNodes[2].y)
  })

  it("루트는 요구사항 컬럼 세로 중앙에 온다", () => {
    const { root, reqNodes } = layoutSpecTree(reqs, feats, "r1")
    const first = reqNodes[0].y
    const last = reqNodes[reqNodes.length - 1].y + TREE_NODE_H
    expect(root.y + TREE_NODE_H / 2).toBeCloseTo((first + last) / 2)
  })

  it("기능 노드는 선택한 요구사항의 것만 나온다", () => {
    const { featNodes } = layoutSpecTree(reqs, feats, "r1")
    expect(featNodes.map((n) => n.feature.id)).toEqual(["f1", "f2"])
  })

  it("선택이 없으면 기능 노드도 없다", () => {
    const { featNodes, edges } = layoutSpecTree(reqs, feats, null)
    expect(featNodes).toHaveLength(0)
    expect(edges.filter((e) => e.brand)).toHaveLength(0)
  })

  it("엣지 = 루트→요구사항(전부) + 선택 요구사항→기능(brand)", () => {
    const { edges } = layoutSpecTree(reqs, feats, "r1")
    expect(edges.filter((e) => !e.brand)).toHaveLength(3)
    expect(edges.filter((e) => e.brand)).toHaveLength(2)
  })

  it("기능 컬럼은 선택 노드 주변에 정렬하되 캔버스 위(Y0) 밖으로 나가지 않는다", () => {
    const manyFeats = Array.from({ length: 8 }, (_, i) => feat(`f${i}`, ["r1"]))
    const { featNodes } = layoutSpecTree(reqs, manyFeats, "r1")
    for (const n of featNodes) expect(n.y).toBeGreaterThanOrEqual(TREE_Y0)
  })

  it("캔버스 크기는 모든 노드를 포함한다", () => {
    const { root, reqNodes, featNodes, width, height } = layoutSpecTree(reqs, feats, "r1")
    const ys = [root.y, ...reqNodes.map((n) => n.y), ...featNodes.map((n) => n.y)]
    expect(Math.max(...ys) + TREE_NODE_H).toBeLessThanOrEqual(height)
    expect(width).toBeGreaterThan(0)
  })

  it("요구사항이 없으면 빈 레이아웃", () => {
    const { reqNodes, featNodes, edges } = layoutSpecTree([], [], null)
    expect(reqNodes).toHaveLength(0)
    expect(featNodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })
})
