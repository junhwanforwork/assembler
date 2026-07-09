import { describe, expect, it } from "vitest"
import type { Api, DbTable } from "@/lib/types/assembler"
import { policyDocFilename, resolveApiRefs, resolveDbRefs } from "./policyDoc"

const APIS = [
  { id: "api-1", productId: "p1", method: "POST", endpoint: "/api/walks", summary: "산책 저장", status: "active", source: "code" },
  { id: "api-2", productId: "p1", method: "GET", endpoint: "/api/walks", summary: "산책 조회", status: "active", source: "code" },
] as unknown as Api[]

const DB_TABLES = [
  { id: "t1", productId: "p1", name: "walks", description: "산책", columns: [], source: "code" },
  { id: "t2", productId: "p1", name: "users", description: "사용자", columns: [], source: "code" },
] as unknown as DbTable[]

describe("policyDocFilename", () => {
  it("제목에 .md를 붙인다", () => {
    expect(policyDocFilename("개인정보 처리방침")).toBe("개인정보 처리방침.md")
  })

  it("파일시스템 금지 문자를 하이픈으로 정제한다", () => {
    expect(policyDocFilename('약관/v2:최종?')).toBe("약관-v2-최종-.md")
  })

  it("빈 제목·공백만이면 고정 대체어를 쓴다", () => {
    expect(policyDocFilename("")).toBe("정책-문서.md")
    expect(policyDocFilename("   ")).toBe("정책-문서.md")
  })
})

describe("resolveApiRefs — 코드-진실만(잔재 id는 걸러냄)", () => {
  it("저장된 id 중 실재하는 API만 원본 순서로 돌려준다", () => {
    const refs = resolveApiRefs(["api-2", "api-1"], APIS)
    expect(refs.map((a) => a.id)).toEqual(["api-1", "api-2"])
  })

  it("삭제된(존재하지 않는) id는 유령 참조로 남기지 않는다", () => {
    expect(resolveApiRefs(["api-1", "api-ghost"], APIS).map((a) => a.id)).toEqual(["api-1"])
  })

  it("빈 참조 목록은 빈 배열", () => {
    expect(resolveApiRefs([], APIS)).toEqual([])
  })
})

describe("resolveDbRefs — 코드-진실만", () => {
  it("저장된 id 중 실재하는 테이블만 원본 순서로 돌려준다", () => {
    expect(resolveDbRefs(["t2"], DB_TABLES).map((t) => t.id)).toEqual(["t2"])
  })

  it("존재하지 않는 테이블 id는 걸러낸다", () => {
    expect(resolveDbRefs(["t-ghost", "t1"], DB_TABLES).map((t) => t.id)).toEqual(["t1"])
  })
})
