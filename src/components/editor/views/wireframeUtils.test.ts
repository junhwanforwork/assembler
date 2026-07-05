import { describe, expect, it } from "vitest"
import type { Api, DbTable, Page, UIElement, Wireframe, WorkspaceDesign } from "@/lib/types/assembler"
import { buildWireframeStacks, resolveElementApis, resolveElementDbTables } from "./wireframeUtils"

function page(id: string, wireframeId: string | null = null, name = id): Page {
  return { id, name, description: "", wireframeId }
}

function wireframe(id: string, elementIds: string[]): Wireframe {
  return { id, elementIds }
}

function element(id: string, label = id): UIElement {
  return { id, label, type: "button", action: "Click", states: [], result: "", apiIds: [], dbTableIds: [] }
}

function design(partial: Partial<WorkspaceDesign>): WorkspaceDesign {
  return { requirements: [], features: [], pages: [], flows: [], wireframes: [], elements: [], ...partial }
}

function api(id: string, method: Api["method"], endpoint: string): Api {
  return { id, productId: "prod-1", method, endpoint, summary: "", status: "active", source: "code" }
}

function dbTable(id: string, name: string): DbTable {
  return { id, productId: "prod-1", name, description: "", columns: [], source: "code" }
}

describe("buildWireframeStacks", () => {
  it("페이지 순서대로 스택을 만들고, 요소는 elementIds 순서를 유지한다", () => {
    const d = design({
      pages: [page("p1", "w1"), page("p2", "w2")],
      wireframes: [wireframe("w1", ["e2", "e1"]), wireframe("w2", ["e3"])],
      elements: [element("e1"), element("e2"), element("e3")],
    })
    const stacks = buildWireframeStacks(d)

    expect(stacks.map((s) => s.key)).toEqual(["p1", "p2"])
    expect(stacks[0].elements.map((e) => e.id)).toEqual(["e2", "e1"])
    expect(stacks[1].elements.map((e) => e.id)).toEqual(["e3"])
  })

  it("스택 제목·설명은 페이지에서 오고 pageId를 가진다", () => {
    const p = { ...page("p1", "w1", "로그인"), description: "이메일 로그인 화면" }
    const d = design({ pages: [p], wireframes: [wireframe("w1", [])], elements: [] })
    const [stack] = buildWireframeStacks(d)

    expect(stack.title).toBe("로그인")
    expect(stack.description).toBe("이메일 로그인 화면")
    expect(stack.pageId).toBe("p1")
    expect(stack.hasWireframe).toBe(true)
  })

  it("wireframeId가 없는 페이지는 hasWireframe=false 빈 스택이 된다", () => {
    const d = design({ pages: [page("p1", null)] })
    const [stack] = buildWireframeStacks(d)

    expect(stack.hasWireframe).toBe(false)
    expect(stack.elements).toEqual([])
    expect(stack.danglingCount).toBe(0)
  })

  it("wireframeId가 없는 와이어프레임을 가리키면(dangling) 크래시 없이 hasWireframe=false", () => {
    const d = design({ pages: [page("p1", "ghost")] })
    const [stack] = buildWireframeStacks(d)

    expect(stack.hasWireframe).toBe(false)
    expect(stack.elements).toEqual([])
  })

  it("없는 요소를 가리키는 elementIds(dangling)는 걸러내고 개수를 센다", () => {
    const d = design({
      pages: [page("p1", "w1")],
      wireframes: [wireframe("w1", ["e1", "ghost-a", "e2", "ghost-b"])],
      elements: [element("e1"), element("e2")],
    })
    const [stack] = buildWireframeStacks(d)

    expect(stack.elements.map((e) => e.id)).toEqual(["e1", "e2"])
    expect(stack.danglingCount).toBe(2)
  })

  it("소유 페이지가 없는 와이어프레임(orphan)은 페이지 스택 뒤에 폴백 제목으로 붙는다", () => {
    const d = design({
      pages: [page("p1", "w1")],
      wireframes: [wireframe("w-orphan", ["e2"]), wireframe("w1", ["e1"])],
      elements: [element("e1"), element("e2")],
    })
    const stacks = buildWireframeStacks(d)

    expect(stacks.map((s) => s.key)).toEqual(["p1", "w-orphan"])
    const orphan = stacks[1]
    // planImpact.ts:45와 같은 폴백 카피 — 카피 일관성 유지.
    expect(orphan.title).toBe("이름 없는 와이어프레임")
    expect(orphan.pageId).toBeNull()
    expect(orphan.hasWireframe).toBe(true)
    expect(orphan.elements.map((e) => e.id)).toEqual(["e2"])
  })

  it("빈 디자인이면 빈 배열", () => {
    expect(buildWireframeStacks(design({}))).toEqual([])
  })

  // 7차 통합 정정 — 중복 elementIds가 React key 충돌을 만들지 않게 한 번만 통과한다(dangling 아님).
  it("중복 elementIds는 한 번만 렌더 대상이 되고 dangling으로 세지 않는다", () => {
    const d = design({
      pages: [page("p1", "w1")],
      wireframes: [wireframe("w1", ["e1", "e1", "e2"])],
      elements: [element("e1"), element("e2")],
    })
    const [stack] = buildWireframeStacks(d)

    expect(stack.elements.map((e) => e.id)).toEqual(["e1", "e2"])
    expect(stack.danglingCount).toBe(0)
  })
})

describe("resolveElementApis / resolveElementDbTables", () => {
  it("apiIds를 id 순서대로 'METHOD endpoint'로 해석한다", () => {
    const el = { ...element("e1"), apiIds: ["a2", "a1"] }
    const apis = [api("a1", "POST", "/signup"), api("a2", "GET", "/me")]

    expect(resolveElementApis(el, apis)).toEqual({ names: ["GET /me", "POST /signup"], missingCount: 0 })
  })

  it("dbTableIds를 테이블 이름으로 해석한다", () => {
    const el = { ...element("e1"), dbTableIds: ["t1"] }

    expect(resolveElementDbTables(el, [dbTable("t1", "users")])).toEqual({ names: ["users"], missingCount: 0 })
  })

  it("dangling 참조는 raw id를 노출하지 않고 missingCount로만 센다", () => {
    const el = { ...element("e1"), apiIds: ["a1", "ghost"], dbTableIds: ["ghost-t"] }
    const apiRes = resolveElementApis(el, [api("a1", "POST", "/signup")])
    const dbRes = resolveElementDbTables(el, [])

    expect(apiRes).toEqual({ names: ["POST /signup"], missingCount: 1 })
    expect(apiRes.names.join(" ")).not.toContain("ghost")
    expect(dbRes).toEqual({ names: [], missingCount: 1 })
  })

  it("연결이 없으면 빈 결과", () => {
    expect(resolveElementApis(element("e1"), [])).toEqual({ names: [], missingCount: 0 })
    expect(resolveElementDbTables(element("e1"), [])).toEqual({ names: [], missingCount: 0 })
  })

  // 7차 통합 정정 — 중복 연결 id는 태그를 중복 렌더하지 않는다.
  it("중복 apiIds는 한 번만 해석한다", () => {
    const el = { ...element("e1"), apiIds: ["a1", "a1"] }

    expect(resolveElementApis(el, [api("a1", "GET", "/me")])).toEqual({ names: ["GET /me"], missingCount: 0 })
  })
})
