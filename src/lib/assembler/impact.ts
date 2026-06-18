import type { ProjectGraph } from "@/lib/types/assembler"
import type { GraphNodeType, GraphSelection } from "@/lib/store/graph"

// 변경 영향 분석 — 한 객체(정책 등)를 바꾸면 "어디어디 바꿔야 하는지"를 그래프 탐색으로 계산한다.
// Biz→Dev 핸드오프의 핵심: 모든 연결이 id 참조이므로(object-model.md) blast radius를 파생할 수 있다.
//
// 방향:
//   상위 객체(Requirement/Feature/Page/UIElement) → downstream: 이 정책이 지배하는 하위 객체들.
//   공유 객체(Api/Database) → upstream: 이걸 참조하는 화면·기능·정책들("바꾸면 깨질 곳").

export type ImpactItem = {
  type: GraphNodeType
  id: string
  label: string
  sublabel?: string
}

export type ImpactGroup = {
  type: GraphNodeType
  items: ImpactItem[]
}

export type ImpactResult = {
  origin: ImpactItem
  direction: "downstream" | "upstream"
  groups: ImpactGroup[]
  total: number
}

const itemKey = (type: GraphNodeType, id: string) => `${type}:${id}`

// ── 객체 → ImpactItem 변환 (라벨 해석) ──────────────────────────────────────

function requirementItem(r: ProjectGraph["requirements"][number]): ImpactItem {
  return { type: "requirement", id: r.id, label: r.title }
}
function featureItem(f: ProjectGraph["features"][number]): ImpactItem {
  return { type: "feature", id: f.id, label: f.name }
}
function pageItem(p: ProjectGraph["pages"][number]): ImpactItem {
  return { type: "page", id: p.id, label: p.name }
}
function elementItem(e: ProjectGraph["uiElements"][number]): ImpactItem {
  return { type: "uiElement", id: e.id, label: e.name, sublabel: e.type }
}
function apiItem(a: ProjectGraph["apis"][number]): ImpactItem {
  return { type: "api", id: a.id, label: a.path, sublabel: a.method }
}
function databaseItem(d: ProjectGraph["databases"][number]): ImpactItem {
  return { type: "database", id: d.id, label: d.name }
}

// 선택된 노드의 원본 ImpactItem(없으면 null — dangling 선택).
function resolveOrigin(g: ProjectGraph, sel: { type: GraphNodeType; id: string }): ImpactItem | null {
  switch (sel.type) {
    case "requirement": {
      const r = g.requirements.find((x) => x.id === sel.id)
      return r ? requirementItem(r) : null
    }
    case "feature": {
      const f = g.features.find((x) => x.id === sel.id)
      return f ? featureItem(f) : null
    }
    case "page": {
      const p = g.pages.find((x) => x.id === sel.id)
      return p ? pageItem(p) : null
    }
    case "uiElement": {
      const e = g.uiElements.find((x) => x.id === sel.id)
      return e ? elementItem(e) : null
    }
    case "api": {
      const a = g.apis.find((x) => x.id === sel.id)
      return a ? apiItem(a) : null
    }
    case "database": {
      const d = g.databases.find((x) => x.id === sel.id)
      return d ? databaseItem(d) : null
    }
  }
}

// ── 누적 수집기 — 종류별 set으로 중복 제거 후 그룹화 ──────────────────────────

class ImpactCollector {
  private readonly seen = new Set<string>()
  private readonly buckets = new Map<GraphNodeType, ImpactItem[]>()
  constructor(private readonly originKey: string) {}

  add(item: ImpactItem) {
    const key = itemKey(item.type, item.id)
    if (key === this.originKey || this.seen.has(key)) return
    this.seen.add(key)
    const bucket = this.buckets.get(item.type) ?? []
    bucket.push(item)
    this.buckets.set(item.type, bucket)
  }

  // 체인 순서(상위→하위)대로 그룹을 낸다 — 읽는 사람이 흐름대로 본다.
  groups(): ImpactGroup[] {
    const order: GraphNodeType[] = [
      "requirement",
      "feature",
      "page",
      "uiElement",
      "api",
      "database",
    ]
    return order
      .map((type) => ({ type, items: this.buckets.get(type) ?? [] }))
      .filter((grp) => grp.items.length > 0)
  }
}

// ── downstream: 이 객체가 지배하는 하위 객체들 ──────────────────────────────

function collectElementTargets(
  g: ProjectGraph,
  e: ProjectGraph["uiElements"][number],
  c: ImpactCollector
) {
  e.apiIds.forEach((id) => {
    const a = g.apis.find((x) => x.id === id)
    if (a) c.add(apiItem(a))
  })
  e.databaseIds.forEach((id) => {
    const d = g.databases.find((x) => x.id === id)
    if (d) c.add(databaseItem(d))
  })
}

function collectPageDownstream(g: ProjectGraph, p: ProjectGraph["pages"][number], c: ImpactCollector) {
  const wireframe = g.wireframes.find((w) => w.id === p.wireframeId)
  wireframe?.uiElementIds.forEach((eid) => {
    const e = g.uiElements.find((x) => x.id === eid)
    if (!e) return
    c.add(elementItem(e))
    collectElementTargets(g, e, c)
  })
  p.apiIds.forEach((id) => {
    const a = g.apis.find((x) => x.id === id)
    if (a) c.add(apiItem(a))
  })
  p.databaseIds.forEach((id) => {
    const d = g.databases.find((x) => x.id === id)
    if (d) c.add(databaseItem(d))
  })
}

function collectFeatureDownstream(
  g: ProjectGraph,
  f: ProjectGraph["features"][number],
  c: ImpactCollector
) {
  g.pages
    .filter((p) => p.featureIds.includes(f.id))
    .forEach((p) => {
      c.add(pageItem(p))
      collectPageDownstream(g, p, c)
    })
  f.apiIds.forEach((id) => {
    const a = g.apis.find((x) => x.id === id)
    if (a) c.add(apiItem(a))
  })
  f.databaseIds.forEach((id) => {
    const d = g.databases.find((x) => x.id === id)
    if (d) c.add(databaseItem(d))
  })
}

function collectDownstream(g: ProjectGraph, sel: { type: GraphNodeType; id: string }, c: ImpactCollector) {
  if (sel.type === "requirement") {
    g.features
      .filter((f) => f.requirementIds.includes(sel.id))
      .forEach((f) => {
        c.add(featureItem(f))
        collectFeatureDownstream(g, f, c)
      })
  } else if (sel.type === "feature") {
    const f = g.features.find((x) => x.id === sel.id)
    if (f) collectFeatureDownstream(g, f, c)
  } else if (sel.type === "page") {
    const p = g.pages.find((x) => x.id === sel.id)
    if (p) collectPageDownstream(g, p, c)
  } else if (sel.type === "uiElement") {
    const e = g.uiElements.find((x) => x.id === sel.id)
    if (e) collectElementTargets(g, e, c)
  }
}

// ── upstream: 공유 객체를 참조하는 화면·기능·정책 ──────────────────────────

function collectUpstream(g: ProjectGraph, sel: { type: GraphNodeType; id: string }, c: ImpactCollector) {
  const refField = sel.type === "api" ? "apiIds" : "databaseIds"

  const features = g.features.filter((f) => f[refField].includes(sel.id))
  const pages = g.pages.filter((p) => p[refField].includes(sel.id))
  const elements = g.uiElements.filter((e) => e[refField].includes(sel.id))

  // 요소 → 소유 Page → 구현 Feature 까지 거슬러 올라가 영향 범위에 포함.
  elements.forEach((e) => {
    c.add(elementItem(e))
    const wireframe = g.wireframes.find((w) => w.uiElementIds.includes(e.id))
    const page = wireframe && g.pages.find((p) => p.id === wireframe.pageId)
    if (page) {
      c.add(pageItem(page))
      page.featureIds.forEach((fid) => {
        const f = g.features.find((x) => x.id === fid)
        if (f) features.push(f)
      })
    }
  })
  pages.forEach((p) => c.add(pageItem(p)))
  features.forEach((f) => {
    c.add(featureItem(f))
    f.requirementIds.forEach((rid) => {
      const r = g.requirements.find((x) => x.id === rid)
      if (r) c.add(requirementItem(r))
    })
  })
}

/** 선택 노드의 변경 영향 범위. null = 선택 없음 또는 dangling. */
export function computeImpact(g: ProjectGraph, selection: GraphSelection): ImpactResult | null {
  if (!selection) return null
  const origin = resolveOrigin(g, selection)
  if (!origin) return null

  const direction: ImpactResult["direction"] =
    selection.type === "api" || selection.type === "database" ? "upstream" : "downstream"

  const collector = new ImpactCollector(itemKey(selection.type, selection.id))
  if (direction === "downstream") collectDownstream(g, selection, collector)
  else collectUpstream(g, selection, collector)

  const groups = collector.groups()
  const total = groups.reduce((sum, grp) => sum + grp.items.length, 0)
  return { origin, direction, groups, total }
}
