// 골든셋 정합 검증 (ASS-061) — npx tsx scripts/verify-goldenset.ts
// 골든=정답이므로 normalizeGraph가 아무것도 고치지 않아야 한다:
//   - "확인 필요" 마커 0건(고립·dangling·navigate 불일치 0)
//   - userFlow edge 자동 생성 0건(navigate↔edge 정합 완비)
//   - 배열 참조 길이 보존(dangling 제거 0건)
import type { GoldenExample } from "@/lib/prompts/golden-set"
import { GOLDEN_SET } from "@/lib/prompts/golden-set"
import { normalizeGraph } from "@/lib/graph/normalize"
import { NEEDS_REVIEW } from "@/lib/graph/normalize-entities"
import type { ProjectGraph } from "@/lib/types/assembler"

let failures = 0
function check(name: string, cond: boolean): void {
  if (!cond) {
    failures++
    console.log("FAIL:", name)
  } else {
    console.log("  ok:", name)
  }
}

function countMarkers(g: ProjectGraph): string[] {
  const hits: string[] = []
  const probe = (where: string, text: string): void => {
    if (text.startsWith(NEEDS_REVIEW)) hits.push(where)
  }
  for (const r of g.requirements) probe(`requirement ${r.id}`, r.description)
  for (const p of g.pages) probe(`page ${p.id}`, p.description)
  for (const el of g.uiElements) probe(`element ${el.id}`, el.description)
  for (const a of g.apis) probe(`api ${a.id}`, a.purpose)
  for (const d of g.databases) probe(`database ${d.id}`, d.purpose)
  for (const e of g.userFlow.edges) if (e.condition?.startsWith(NEEDS_REVIEW)) hits.push(`edge ${e.id}`)
  return hits
}

function arrayRefTotal(g: ProjectGraph): number {
  let n = 0
  for (const f of g.features) n += f.requirementIds.length + f.pageIds.length + f.apiIds.length + f.databaseIds.length
  for (const p of g.pages) n += p.featureIds.length + p.apiIds.length + p.databaseIds.length
  for (const w of g.wireframes) n += w.uiElementIds.length
  for (const el of g.uiElements) n += el.apiIds.length + el.databaseIds.length
  for (const a of g.apis) n += a.databaseIds.length
  return n
}

function verify(ex: GoldenExample): void {
  const before = ex.graph
  const after = normalizeGraph(JSON.parse(JSON.stringify(before)))

  const markers = countMarkers(after)
  check(`${before.id}: no "확인 필요" markers (${markers.join(", ") || "none"})`, markers.length === 0)
  check(
    `${before.id}: no edges auto-created (${before.userFlow.edges.length} -> ${after.userFlow.edges.length})`,
    after.userFlow.edges.length === before.userFlow.edges.length,
  )
  check(
    `${before.id}: no dangling array refs pruned (${arrayRefTotal(before)} -> ${arrayRefTotal(after)})`,
    arrayRefTotal(after) === arrayRefTotal(before),
  )
  check(
    `${before.id}: collection counts preserved`,
    after.requirements.length === before.requirements.length &&
      after.features.length === before.features.length &&
      after.pages.length === before.pages.length &&
      after.wireframes.length === before.wireframes.length &&
      after.uiElements.length === before.uiElements.length &&
      after.apis.length === before.apis.length &&
      after.databases.length === before.databases.length &&
      after.pageFlows.length === before.pageFlows.length,
  )
}

for (const ex of GOLDEN_SET) verify(ex)

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
