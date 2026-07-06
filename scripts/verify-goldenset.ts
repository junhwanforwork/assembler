// 골든셋 정합 검증 CLI (ASM-052 — ass-061 자산을 개정 계약으로 재작성).
// 실행: npx tsx scripts/verify-goldenset.ts  (tsconfig paths 해석이 필요해 tsx 전제.
//        npm test에 항상 도는 게이트 정본은 src/lib/prompts/golden-set.test.ts — 검사 내용 동일.)
// 골든 = 정답이므로 생성 경계를 무손실 통과해야 한다:
//   - 스키마 유효: serializeGoldenOutput(4개 컬렉션) → parseGeneratedDesign ok
//   - dangling 0: findDanglingRefs(design, codeTruth) 빈 배열
//   - 살균 무손실: 코드-진실 참조 필터로 잃는 연결 0(환각 0)
//   - 와이어 후퇴: wireframes/elements 빈 배열 + 직렬화에 키 없음
//   - 고립 0: 요구사항·페이지·API·테이블 전부 최소 1개 연결

import { GOLDEN_SET, serializeGoldenOutput, type GoldenExample } from "@/lib/prompts/golden-set"
import { parseGeneratedDesign } from "@/lib/generate/parse-design"
import { findDanglingRefs } from "@/lib/types/design"

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
  const codeTruth = {
    apiIds: new Set(ex.apis.map((a) => a.id)),
    dbTableIds: new Set(ex.dbTables.map((t) => t.id)),
  }
  const serialized = serializeGoldenOutput(ex.design)
  const parsed = parseGeneratedDesign(serialized, codeTruth)

  check(`${ex.id}: schema valid (parseGeneratedDesign ok)`, parsed.ok)

  const dangling = findDanglingRefs(ex.design, codeTruth)
  check(`${ex.id}: dangling 0 (${dangling.length})`, dangling.length === 0)

  if (parsed.ok) {
    const lossless = parsed.value.features.every(
      (f, i) =>
        f.apiIds.length === ex.design.features[i].apiIds.length &&
        (f.dbTableIds ?? []).length === (ex.design.features[i].dbTableIds ?? []).length,
    )
    check(`${ex.id}: sanitize lossless (환각 참조 0)`, lossless)
  }

  check(
    `${ex.id}: wire retreat (wireframes/elements 없음)`,
    ex.design.wireframes.length === 0 &&
      ex.design.elements.length === 0 &&
      !serialized.includes('"wireframes"') &&
      !serialized.includes('"elements"'),
  )

  const orphanReq = ex.design.requirements.filter((r) => !ex.design.features.some((f) => f.requirementIds.includes(r.id)))
  const orphanPage = ex.design.pages.filter(
    (p) =>
      !ex.design.features.some((f) => f.pageIds.includes(p.id)) &&
      !ex.design.flows.some((fl) => fl.edges.some((e) => e.fromPageId === p.id || e.toPageId === p.id)),
  )
  const unusedApi = ex.apis.filter((a) => !ex.design.features.some((f) => f.apiIds.includes(a.id)))
  const unusedTable = ex.dbTables.filter((t) => !ex.design.features.some((f) => (f.dbTableIds ?? []).includes(t.id)))
  check(
    `${ex.id}: no orphans (req ${orphanReq.length} · page ${orphanPage.length} · api ${unusedApi.length} · table ${unusedTable.length})`,
    orphanReq.length + orphanPage.length + unusedApi.length + unusedTable.length === 0,
  )
}

for (const ex of GOLDEN_SET) verify(ex)

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
