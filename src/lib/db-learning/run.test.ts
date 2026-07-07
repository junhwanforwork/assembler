import { describe, it, expect, vi, beforeEach } from "vitest"
import { AnthropicApiError, AnthropicKeyMissingError, AnthropicRefusalError } from "@/lib/anthropic"
import type { DbTable } from "@/lib/types/assembler"
import type { TableEvidence } from "./evidence"
import { runDbLearning } from "./run"

// run 의 검증·클램프·폴백 경로를 고정. AI 호출은 모킹(네트워크 차단).
const callMock = vi.fn()
vi.mock("@/lib/anthropic-retry", () => ({
  callAnthropicWithRetry: (...args: unknown[]) => callMock(...args),
}))

function table(name: string, cols: string[]): DbTable {
  return {
    id: `t-${name}`,
    productId: "p1",
    name,
    description: "",
    columns: cols.map((c) => ({ name: c, type: "text", nullable: true, isPrimaryKey: c === "id" })),
    source: "code",
  }
}

function isolatedEvidence(): TableEvidence {
  return { table: table("audit_log", ["id", "action"]), fkOut: [], fkIn: [], usedBy: [], isIsolated: true }
}

function connectedEvidence(): TableEvidence {
  return {
    table: table("repairs", ["id", "customer_id", "cost"]),
    fkOut: [{ column: "customer_id", refTable: "customers" }],
    fkIn: [],
    usedBy: [{ elementLabel: "수리 접수", action: "Click" }],
    isIsolated: false,
  }
}

function aiReturns(obj: unknown) {
  return { text: JSON.stringify(obj), usage: undefined }
}

beforeEach(() => callMock.mockReset())

describe("runDbLearning", () => {
  it("고립 테이블은 AI가 grounded=true를 줘도 false로 클램프한다", async () => {
    callMock.mockResolvedValue(aiReturns({ explanation: "id·action을 담는 것 같아요.", grounded: true, mentionedTables: [] }))
    const r = await runDbLearning(isolatedEvidence())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.note.grounded).toBe(false)
  })

  it("연결된 테이블은 grounded=true를 통과시킨다", async () => {
    callMock.mockResolvedValue(aiReturns({ explanation: "고객이 맡긴 수리 건을 보관해요.", grounded: true, mentionedTables: ["customers"] }))
    const r = await runDbLearning(connectedEvidence())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.note).toEqual({ explanation: "고객이 맡긴 수리 건을 보관해요.", grounded: true })
  })

  it("연결 안 된 테이블을 언급하면(관계 환각) 거부 → 재시도 후 정상이면 그 결과를 쓴다", async () => {
    callMock
      .mockResolvedValueOnce(aiReturns({ explanation: "parts와 연결돼 부품을 관리해요.", grounded: true, mentionedTables: ["parts"] }))
      .mockResolvedValueOnce(aiReturns({ explanation: "고객 수리 건을 보관해요.", grounded: true, mentionedTables: ["customers"] }))
    const r = await runDbLearning(connectedEvidence())
    expect(callMock).toHaveBeenCalledTimes(2)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.note.explanation).toBe("고객 수리 건을 보관해요.")
  })

  it("두 번 다 환각이면 컬럼 사실만 담은 보수 폴백으로 강등한다", async () => {
    callMock.mockResolvedValue(aiReturns({ explanation: "parts와 연결돼요.", grounded: true, mentionedTables: ["parts"] }))
    const r = await runDbLearning(connectedEvidence())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.note.grounded).toBe(false)
      expect(r.note.explanation).toContain("repairs")
      expect(r.note.explanation).toContain("customer_id")
    }
  })

  it("성공 경로에서 pros/cons가 그대로 통과한다 (ASM-057)", async () => {
    callMock.mockResolvedValue(
      aiReturns({
        explanation: "고객이 맡긴 수리 건을 보관해요.",
        grounded: true,
        mentionedTables: ["customers"],
        pros: ["수리 이력이 한 곳에 모여요."],
        cons: ["담당자 정보는 따로 없어요."],
      })
    )
    const r = await runDbLearning(connectedEvidence())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.note.pros).toEqual(["수리 이력이 한 곳에 모여요."])
      expect(r.note.cons).toEqual(["담당자 정보는 따로 없어요."])
    }
  })

  it("고립 테이블은 AI가 pros/cons를 줘도 드롭한다 — 보수 안내와 '좋은 점'이 공존하지 않게", async () => {
    callMock.mockResolvedValue(
      aiReturns({
        explanation: "id·action을 담는 것 같아요.",
        grounded: false,
        mentionedTables: [],
        pros: ["기록이 한 곳에 모여요."],
        cons: ["연결이 없어요."],
      })
    )
    const r = await runDbLearning(isolatedEvidence())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.note.grounded).toBe(false)
      expect(r.note.pros).toBeUndefined()
      expect(r.note.cons).toBeUndefined()
    }
  })

  it("보수 폴백에는 pros/cons가 없다 — 요약만(정직 원칙)", async () => {
    // 무효 출력(JSON 아님) 2회 → 진짜 conservativeFallback 경로를 태운다(성공 경로 오탐 방지).
    callMock.mockResolvedValue({ text: "이건 JSON이 아니에요", usage: undefined })
    const r = await runDbLearning(connectedEvidence())
    expect(callMock).toHaveBeenCalledTimes(2)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.note.grounded).toBe(false)
      expect(r.note.explanation).toContain("repairs")
      expect(r.note.pros).toBeUndefined()
      expect(r.note.cons).toBeUndefined()
    }
  })

  it("키 없음은 폴백하지 않고 503 ai_unavailable로 surface한다", async () => {
    callMock.mockRejectedValueOnce(new AnthropicKeyMissingError())
    const r = await runDbLearning(connectedEvidence())
    expect(r).toEqual({ ok: false, error: "ai_unavailable", status: 503 })
  })

  it("refusal은 422, 그 외 API 오류는 502로 매핑한다", async () => {
    callMock.mockRejectedValueOnce(new AnthropicRefusalError())
    expect(await runDbLearning(connectedEvidence())).toEqual({ ok: false, error: "ai_refused", status: 422 })
    callMock.mockRejectedValueOnce(new AnthropicApiError(500, "boom"))
    expect(await runDbLearning(connectedEvidence())).toEqual({ ok: false, error: "ai_error", status: 502 })
  })
})
