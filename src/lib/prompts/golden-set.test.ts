import { describe, it, expect } from "vitest"
import { GOLDEN_SET, serializeGoldenOutput } from "./golden-set"
import { parseGeneratedDesign } from "@/lib/generate/parse-design"
import { findDanglingRefs } from "@/lib/types/design"

// 골든셋 게이트(ASM-052) — 골든 = 정답이므로 생성 경계를 무손실 통과해야 한다:
//   스키마 유효(parseGeneratedDesign ok) · dangling 0 · 살균 무손실(환각 참조 0) · 와이어 0 · 고립 0.
// prompt-evaluator가 이 파일을 게이트 정본으로 실행한다(scripts/verify-goldenset.ts는 동일 검사 CLI).

describe.each(GOLDEN_SET.map((ex) => [ex.id, ex] as const))("골든셋 %s", (_id, ex) => {
  const codeTruth = {
    apiIds: new Set(ex.apis.map((a) => a.id)),
    dbTableIds: new Set(ex.dbTables.map((t) => t.id)),
  }

  it("개정 계약 직렬화가 생성 경계(parseGeneratedDesign)를 통과한다 — 스키마 유효", () => {
    const r = parseGeneratedDesign(serializeGoldenOutput(ex.design), codeTruth)
    expect(r.ok).toBe(true)
  })

  it("끊어진 참조(dangling) 0", () => {
    expect(findDanglingRefs(ex.design, codeTruth)).toEqual([])
  })

  it("살균 무손실 — 코드-진실 참조에 환각이 없어 필터로 잃는 연결이 0", () => {
    const r = parseGeneratedDesign(serializeGoldenOutput(ex.design), codeTruth)
    expect(r.ok).toBe(true)
    if (r.ok) {
      r.value.features.forEach((f, i) => {
        expect(f.apiIds).toEqual(ex.design.features[i].apiIds)
        expect(f.dbTableIds).toEqual(ex.design.features[i].dbTableIds)
      })
    }
  })

  it("와이어 후퇴 계약 — wireframes/elements가 비어 있고 직렬화에 키 자체가 없다", () => {
    expect(ex.design.wireframes).toEqual([])
    expect(ex.design.elements).toEqual([])
    const serialized = serializeGoldenOutput(ex.design)
    expect(serialized).not.toContain('"wireframes"')
    expect(serialized).not.toContain('"elements"')
  })

  it("고립 0 — 요구사항·페이지·코드-진실 전부 최소 1개 연결을 가진다", () => {
    for (const req of ex.design.requirements) {
      expect(ex.design.features.some((f) => f.requirementIds.includes(req.id)), `고립 요구사항 ${req.id}`).toBe(true)
    }
    for (const page of ex.design.pages) {
      const linked =
        ex.design.features.some((f) => f.pageIds.includes(page.id)) ||
        ex.design.flows.some((fl) => fl.edges.some((e) => e.fromPageId === page.id || e.toPageId === page.id))
      expect(linked, `고립 페이지 ${page.id}`).toBe(true)
    }
    for (const api of ex.apis) {
      expect(ex.design.features.some((f) => f.apiIds.includes(api.id)), `미사용 API ${api.id}`).toBe(true)
    }
    for (const table of ex.dbTables) {
      expect(ex.design.features.some((f) => (f.dbTableIds ?? []).includes(table.id)), `미사용 테이블 ${table.id}`).toBe(true)
    }
  })

  it("기능→DB 승격 — 모든 기능이 최소 1개 DB 테이블에 연결된다", () => {
    for (const f of ex.design.features) {
      expect((f.dbTableIds ?? []).length, `DB 연결 없는 기능 ${f.id}`).toBeGreaterThan(0)
    }
  })
})

describe("골든셋 구성", () => {
  it("4개 distinct 도메인", () => {
    expect(new Set(GOLDEN_SET.map((ex) => ex.id)).size).toBe(4)
  })
})
