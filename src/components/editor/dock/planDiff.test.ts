import { describe, expect, it } from "vitest"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangeOp } from "@/lib/types/chat"
import { createEmptyDesign } from "@/lib/types/design"
import { diffOpPayload } from "./planDiff"

function designWithReq(): WorkspaceDesign {
  return {
    ...createEmptyDesign(),
    requirements: [
      {
        id: "req-1",
        title: "로그인",
        description: "사용자는 로그인할 수 있다",
        status: "draft",
        priority: "high",
        role: "회원",
        acceptanceCriteria: ["이메일 로그인"],
      },
    ],
  }
}

const baseOp = { id: "op-0", collection: "requirements" as const, summary: "s" }

describe("diffOpPayload — 도크 payload diff 표시", () => {
  it("add: payload 필드 전부 added로(id 제외)", () => {
    const op: ChangeOp = {
      ...baseOp,
      action: "add",
      targetId: "req-2",
      payload: { id: "req-2", title: "결제", priority: "medium" },
    }
    const rows = diffOpPayload(op, designWithReq())
    expect(rows).toEqual([
      { kind: "added", field: "title", after: "결제" },
      { kind: "added", field: "priority", after: "medium" },
    ])
  })

  it("update: 실제로 바뀐 필드만 before→after", () => {
    const op: ChangeOp = {
      ...baseOp,
      action: "update",
      targetId: "req-1",
      payload: {
        id: "req-1",
        title: "로그인",
        description: "사용자는 소셜 로그인할 수 있다",
        status: "approved",
        priority: "high",
        role: "회원",
        acceptanceCriteria: ["이메일 로그인"],
      },
    }
    const rows = diffOpPayload(op, designWithReq())
    expect(rows).toEqual([
      { kind: "changed", field: "description", before: "사용자는 로그인할 수 있다", after: "사용자는 소셜 로그인할 수 있다" },
      { kind: "changed", field: "status", before: "draft", after: "approved" },
    ])
  })

  it("update: 배열·객체 값도 비교한다(JSON 직렬화 기준)", () => {
    const op: ChangeOp = {
      ...baseOp,
      action: "update",
      targetId: "req-1",
      payload: {
        id: "req-1",
        title: "로그인",
        description: "사용자는 로그인할 수 있다",
        status: "draft",
        priority: "high",
        role: "회원",
        acceptanceCriteria: ["이메일 로그인", "소셜 로그인"],
      },
    }
    const rows = diffOpPayload(op, designWithReq())
    expect(rows).toHaveLength(1)
    expect(rows[0].field).toBe("acceptanceCriteria")
    expect(rows[0].after).toContain("소셜 로그인")
  })

  it("remove: 지워질 항목의 대표 필드(제목류)를 removed로", () => {
    const op: ChangeOp = { ...baseOp, action: "remove", targetId: "req-1", payload: null }
    const rows = diffOpPayload(op, designWithReq())
    expect(rows).toEqual([{ kind: "removed", field: "title", before: "로그인" }])
  })

  it("긴 값은 표시용으로 자른다", () => {
    const op: ChangeOp = {
      ...baseOp,
      action: "add",
      targetId: "req-9",
      payload: { id: "req-9", description: "가".repeat(300) },
    }
    const [row] = diffOpPayload(op, designWithReq())
    expect(row.after!.length).toBeLessThanOrEqual(121)
  })

  it("대상이 없는 update/remove는 빈 diff(도크가 summary만 보여준다)", () => {
    const op: ChangeOp = { ...baseOp, action: "remove", targetId: "ghost", payload: null }
    expect(diffOpPayload(op, designWithReq())).toEqual([])
  })
})
