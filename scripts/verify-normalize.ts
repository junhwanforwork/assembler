// 일회성 정규화 검증 (ASS-019) — npx tsx scripts/verify-normalize.ts
// SAMPLE_GRAPH 왕복 보존 + 망가뜨린 입력 보정 확인. 정식 하네스는 ASS-062.
import { normalizeGraph } from "@/lib/graph/normalize"
import { SAMPLE_GRAPH } from "@/lib/fixtures/sample-graph"

let failures = 0
function check(name: string, cond: boolean): void {
  if (!cond) {
    failures++
    console.log("FAIL:", name)
  } else {
    console.log("  ok:", name)
  }
}

// 1. SAMPLE_GRAPH 왕복 — 구조 보존, 의도적 미완성(빈 states) 보존.
const g1 = normalizeGraph(JSON.parse(JSON.stringify(SAMPLE_GRAPH)))
check("sample: page count preserved", g1.pages.length === SAMPLE_GRAPH.pages.length)
check("sample: element count preserved", g1.uiElements.length === SAMPLE_GRAPH.uiElements.length)
check("sample: edges preserved (no spurious)", g1.userFlow.edges.length === SAMPLE_GRAPH.userFlow.edges.length)
check("sample: intentional incomplete (empty states) preserved", g1.uiElements.some((el) => el.states.length === 0))

// 2. 빈 입력 — ProjectGraph shape + 마커.
const g2 = normalizeGraph({})
check("empty: arrays present", Array.isArray(g2.requirements) && Array.isArray(g2.pages))
check("empty: userFlow filled empty", g2.userFlow.edges.length === 0 && typeof g2.userFlow.id === "string")
check("empty: missing id marked", g2.id === "확인 필요")

// 3. enum 폴백.
const g3 = normalizeGraph({
  uiElements: [{ id: "e1", type: "BOGUS", result: { kind: "weird" } }],
  apis: [{ id: "a1", method: "delete", purpose: "삭제" }],
})
check("enum: type -> text", g3.uiElements[0].type === "text")
check("enum: result kind -> none", g3.uiElements[0].result.kind === "none")
check("enum: method lowercased -> DELETE", g3.apis[0].method === "DELETE")
const g3b = normalizeGraph({ apis: [{ id: "a1", method: "FETCH", purpose: "x" }] })
check("enum: invalid method -> GET + marked", g3b.apis[0].method === "GET" && g3b.apis[0].purpose.startsWith("확인 필요"))

// 4. 좌표 그리드.
const g4 = normalizeGraph({ pages: [{ id: "p0" }, { id: "p1" }, { id: "p2" }, { id: "p3" }] })
check("coords: p0 at 0,0", g4.pages[0].x === 0 && g4.pages[0].y === 0)
check("coords: p3 wraps to row 2", g4.pages[3].x === 0 && g4.pages[3].y === 360)

// 5. dangling 배열 참조 제거.
const g5 = normalizeGraph({
  features: [{ id: "f1", pageIds: ["ghost", "p1"], apiIds: ["nope"] }],
  pages: [{ id: "p1", wireframeId: "w1" }],
  wireframes: [{ id: "w1", pageId: "p1", uiElementIds: [] }],
})
check("dangling: ghost page removed, real kept", g5.features[0].pageIds.length === 1 && g5.features[0].pageIds[0] === "p1")
check("dangling: ghost api removed", g5.features[0].apiIds.length === 0)

// 6. navigate -> edge 자동 생성.
const g6 = normalizeGraph({
  pages: [{ id: "p1", wireframeId: "w1" }, { id: "p2", wireframeId: "w2" }],
  wireframes: [{ id: "w1", pageId: "p1", uiElementIds: ["btn"] }, { id: "w2", pageId: "p2", uiElementIds: [] }],
  uiElements: [{ id: "btn", type: "button", result: { kind: "navigate", toPageId: "p2" } }],
})
check(
  "navigate: edge auto-created (from=p1)",
  g6.userFlow.edges.some((e) => e.triggerElementId === "btn" && e.toPageId === "p2" && e.fromPageId === "p1"),
)

// 7. navigate dangling 대상 -> 마킹, none 둔갑 금지.
const g7 = normalizeGraph({
  pages: [{ id: "p1", wireframeId: "w1" }],
  wireframes: [{ id: "w1", pageId: "p1", uiElementIds: ["btn"] }],
  uiElements: [{ id: "btn", type: "button", description: "go", result: { kind: "navigate", toPageId: "ghost" } }],
})
check("navigate dangling: stays navigate", g7.uiElements[0].result.kind === "navigate")
check("navigate dangling: element marked", g7.uiElements[0].description.startsWith("확인 필요"))

// 8. 페이지 양끝 불량 edge 제거.
const g8 = normalizeGraph({
  pages: [{ id: "p1", wireframeId: "w1" }],
  wireframes: [{ id: "w1", pageId: "p1", uiElementIds: [] }],
  userFlow: { id: "uf", edges: [{ id: "e1", fromPageId: "p1", toPageId: "ghost" }] },
})
check("dangling edge: dropped", g8.userFlow.edges.length === 0)

// 9. orphan 마킹 — 연결 0 Database.
const g9 = normalizeGraph({ databases: [{ id: "d1", name: "users", purpose: "계정" }] })
check("orphan: unconnected database marked", g9.databases[0].purpose.startsWith("확인 필요"))

// 10. 역방향 정합 — trigger 요소 result≠navigate 인 edge 마킹.
const g10 = normalizeGraph({
  pages: [{ id: "p1", wireframeId: "w1" }, { id: "p2", wireframeId: "w2" }],
  wireframes: [{ id: "w1", pageId: "p1", uiElementIds: ["btn"] }, { id: "w2", pageId: "p2", uiElementIds: [] }],
  uiElements: [{ id: "btn", type: "button", result: { kind: "none" } }],
  userFlow: { id: "uf", edges: [{ id: "e1", fromPageId: "p1", toPageId: "p2", triggerElementId: "btn" }] },
})
check("reverse: edge with non-navigate trigger marked", g10.userFlow.edges[0].condition?.startsWith("확인 필요") === true)

// 11. 중복 id 배열 참조 dedup.
const g11 = normalizeGraph({
  features: [{ id: "f1", apiIds: ["a1", "a1"] }],
  apis: [{ id: "a1", method: "GET", purpose: "x" }],
})
check("dedup: duplicate api ref collapsed", g11.features[0].apiIds.length === 1)

// 12. 생성 edge id 충돌 회피 — 입력이 edge-gen-0 을 선점.
const g12 = normalizeGraph({
  pages: [{ id: "p1", wireframeId: "w1" }, { id: "p2", wireframeId: "w2" }],
  wireframes: [{ id: "w1", pageId: "p1", uiElementIds: ["btn"] }, { id: "w2", pageId: "p2", uiElementIds: [] }],
  uiElements: [{ id: "btn", type: "button", result: { kind: "navigate", toPageId: "p2" } }],
  userFlow: { id: "uf", edges: [{ id: "edge-gen-0", fromPageId: "p2", toPageId: "p1" }] },
})
check("edge id: no duplicate ids after generation", new Set(g12.userFlow.edges.map((e) => e.id)).size === g12.userFlow.edges.length)

// 13. self-loop navigate — 마킹 + 자기루프 edge 미생성.
const g13 = normalizeGraph({
  pages: [{ id: "p1", wireframeId: "w1" }],
  wireframes: [{ id: "w1", pageId: "p1", uiElementIds: ["btn"] }],
  uiElements: [{ id: "btn", type: "button", description: "stay", result: { kind: "navigate", toPageId: "p1" } }],
})
check("self-nav: element marked", g13.uiElements[0].description.startsWith("확인 필요"))
check("self-nav: no self-loop edge created", g13.userFlow.edges.every((e) => e.fromPageId !== e.toPageId))

// 14. 최상위 비객체 입력 — 빈 그래프로 수렴(크래시 없음).
const g14 = normalizeGraph([1, 2, 3])
check("non-object input: empty graph", g14.pages.length === 0 && g14.userFlow.edges.length === 0)

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
