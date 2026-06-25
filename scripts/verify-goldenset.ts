// 골든셋 정합 검증 (ASS-061) — npx tsx scripts/verify-goldenset.ts
// 골든=정답이므로 normalizeGraph가 아무것도 고치지 않아야 한다:
//   - "확인 필요" 마커 0건(고립·dangling·navigate 불일치 0)
//   - userFlow edge 자동 생성 0건(navigate↔edge 정합 완비)
//   - 배열 참조 길이 보존(dangling 제거 0건)
import type { GoldenExample } from "@/lib/prompts/golden-set"
import { GOLDEN_SET } from "@/lib/prompts/golden-set"
import { normalizeGraph } from "@/lib/graph/normalize"
import { arrayRefTotal, countMarkers, extractFixSignals, scoreGraph } from "./lib/eval-metrics"

let failures = 0
function check(name: string, cond: boolean): void {
  if (!cond) {
    failures++
    console.log("FAIL:", name)
  } else {
    console.log("  ok:", name)
  }
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

  // 메트릭 자가 단위테스트(ASS-062) — 골든=정답이므로 자기 자신 대비 품질 점수는 1.0 이어야 한다.
  // 깨지면 eval-metrics.ts의 가중치/판정이 드리프트했거나 골든에 매핑 공백이 생긴 것 — 조용한 회귀 차단.
  const signals = extractFixSignals(before, after)
  const score = scoreGraph(after, ex.graph, signals)
  check(
    `${before.id}: self-score = 1.0 (got ${score.qualityScore.toFixed(3)} · cov ${score.coverage.toFixed(3)} · health ${score.normalizeHealth.toFixed(3)} · map ${score.sub.mappingCompleteness.toFixed(3)})`,
    score.qualityScore === 1,
  )
  check(`${before.id}: no hard violations (${score.hardViolations.join(", ") || "none"})`, score.hardViolations.length === 0)
}

for (const ex of GOLDEN_SET) verify(ex)

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
