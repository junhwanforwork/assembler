import { describe, expect, it } from "vitest"
import type { Flow, Page } from "@/lib/types/assembler"
import {
  FLOW_CARD_H,
  FLOW_CARD_W,
  flowArrowPoints,
  flowEdgePath,
  layoutFlow,
} from "./flowUtils"

function page(id: string, name = id): Page {
  return { id, name, description: "", wireframeId: null }
}

function flow(edges: [string, string][]): Flow {
  return {
    id: "flow-1",
    name: "메인 플로우",
    edges: edges.map(([from, to], i) => ({ id: `e${i}`, fromPageId: from, toPageId: to, trigger: "" })),
  }
}

describe("layoutFlow", () => {
  it("선형 A→B→C는 도착 깊이 순서로 좌→우 배치된다", () => {
    const pages = [page("a"), page("b"), page("c")]
    const { nodes } = layoutFlow(pages, [flow([["a", "b"], ["b", "c"]])])

    const x = Object.fromEntries(nodes.map((n) => [n.page.id, n.x]))
    expect(x.a).toBeLessThan(x.b)
    expect(x.b).toBeLessThan(x.c)
  })

  it("한 노드에서 갈라지는 목적지들은 같은 컬럼에 세로로 쌓인다", () => {
    const pages = [page("home"), page("a"), page("b")]
    const { nodes } = layoutFlow(pages, [flow([["home", "a"], ["home", "b"]])])

    const byId = Object.fromEntries(nodes.map((n) => [n.page.id, n]))
    expect(byId.a.x).toBe(byId.b.x)
    expect(byId.a.y).not.toBe(byId.b.y)
  })

  it("엣지는 출발 노드 오른쪽 중앙에서 도착 노드 왼쪽 중앙으로 연결된다", () => {
    const pages = [page("a"), page("b")]
    const { nodes, edges } = layoutFlow(pages, [flow([["a", "b"]])])

    const byId = Object.fromEntries(nodes.map((n) => [n.page.id, n]))
    expect(edges).toHaveLength(1)
    expect(edges[0].x1).toBe(byId.a.x + FLOW_CARD_W)
    expect(edges[0].y1).toBe(byId.a.y + FLOW_CARD_H / 2)
    expect(edges[0].x2).toBe(byId.b.x)
    expect(edges[0].y2).toBe(byId.b.y + FLOW_CARD_H / 2)
  })

  it("사이클(A→B→A)에서도 무한 재귀 없이 전 노드를 배치한다", () => {
    const pages = [page("a"), page("b")]
    const { nodes, edges } = layoutFlow(pages, [flow([["a", "b"], ["b", "a"]])])

    expect(nodes).toHaveLength(2)
    expect(edges).toHaveLength(2)
  })

  it("역방향 엣지는 좌우 앵커를 반전한다(출발 왼쪽 중앙 → 도착 오른쪽 중앙)", () => {
    const pages = [page("a"), page("b")]
    const { nodes, edges } = layoutFlow(pages, [flow([["a", "b"], ["b", "a"]])])

    const byId = Object.fromEntries(nodes.map((n) => [n.page.id, n]))
    // 사이클이라 둘 중 하나는 반드시 역방향 — 그 엣지의 앵커가 반전됐는지 검증.
    const back = edges.find((e) => e.reverse)
    const forward = edges.find((e) => !e.reverse)
    expect(back).toBeDefined()
    expect(forward).toBeDefined()

    const from = byId[back!.fromPageId]
    const to = byId[back!.toPageId]
    expect(back!.x1).toBe(from.x)
    expect(back!.x2).toBe(to.x + FLOW_CARD_W)
  })

  it("엣지에 안 잡힌 고립 페이지도 노드로 포함된다", () => {
    const pages = [page("a"), page("b"), page("island")]
    const { nodes } = layoutFlow(pages, [flow([["a", "b"]])])

    expect(nodes.map((n) => n.page.id)).toContain("island")
  })

  it("없는 페이지를 가리키는 엣지(dangling)는 건너뛴다", () => {
    const pages = [page("a")]
    const { nodes, edges } = layoutFlow(pages, [flow([["a", "ghost"]])])

    expect(nodes).toHaveLength(1)
    expect(edges).toHaveLength(0)
  })

  it("페이지가 없으면 빈 레이아웃을 준다", () => {
    const { nodes, edges } = layoutFlow([], [])
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })

  it("캔버스 크기는 모든 노드를 포함한다", () => {
    const pages = [page("a"), page("b"), page("c")]
    const { nodes, width, height } = layoutFlow(pages, [flow([["a", "b"], ["b", "c"]])])

    for (const n of nodes) {
      expect(n.x + FLOW_CARD_W).toBeLessThanOrEqual(width)
      expect(n.y + FLOW_CARD_H).toBeLessThanOrEqual(height)
    }
  })
})

describe("flowEdgePath / flowArrowPoints", () => {
  it("cubic bezier 경로는 dx=거리 45% control point를 쓴다", () => {
    const path = flowEdgePath({ id: "e", x1: 0, y1: 10, x2: 100, y2: 50 })
    expect(path).toBe("M 0 10 C 45 10 55 50 100 50")
  })

  it("화살표는 도착점 왼쪽 8px 삼각형이다", () => {
    expect(flowArrowPoints(100, 50)).toBe("100,50 92,46 92,54")
  })

  it("역방향 화살표는 도착점 오른쪽에서 반대로 붙는다", () => {
    expect(flowArrowPoints(100, 50, true)).toBe("100,50 108,46 108,54")
  })
})
