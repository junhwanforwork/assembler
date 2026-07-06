import { describe, expect, it } from "vitest"
import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { ChangeOp } from "@/lib/types/chat"
import { createEmptyDesign } from "@/lib/types/design"
import { diffOpPayload } from "./planDiff"

// ASM-047: 기존 테스트를 새 계약으로 갱신(삭제 아님) — 행에 한글 label이 붙고,
// 값도 사람이 읽는 형태(enum 한글·배열 이름 해석·목록 join)로 바뀐다. raw 필드명·id·JSON 노출 해소.

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

function designWithFeature(): WorkspaceDesign {
  return {
    ...designWithReq(),
    features: [
      {
        id: "feat-1",
        name: "결제",
        description: "카드로 결제한다",
        detailFeatures: [{ id: "df-1", title: "카드 등록", description: "" }],
        requirementIds: ["req-1"],
        pageIds: [],
        apiIds: [],
      },
    ],
    pages: [{ id: "page-1", name: "홈", description: "", wireframeId: null }],
  }
}

const baseOp = { id: "op-0", collection: "requirements" as const, summary: "s" }

describe("diffOpPayload — 도크 payload diff 표시", () => {
  it("add: payload 필드 전부 added로(id 제외), 한글 라벨·값", () => {
    const op: ChangeOp = {
      ...baseOp,
      action: "add",
      targetId: "req-2",
      payload: { id: "req-2", title: "결제", priority: "medium" },
    }
    const rows = diffOpPayload(op, designWithReq())
    expect(rows).toEqual([
      { kind: "added", field: "title", label: "제목", after: "결제" },
      // 어휘 정본 = 기존 UI(SpecView·Badges): 중요도 높음/중간/낮음 (크로스체크 MED 정정).
      { kind: "added", field: "priority", label: "중요도", after: "중간" },
    ])
  })

  it("update: 실제로 바뀐 필드만 before→after, enum 값은 한글로", () => {
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
      {
        kind: "changed",
        field: "description",
        label: "설명",
        before: "사용자는 로그인할 수 있다",
        after: "사용자는 소셜 로그인할 수 있다",
      },
      // 어휘 정본 = 기존 UI(Badges): 작성중/승인됨/중단됨 (크로스체크 MED 정정).
      { kind: "changed", field: "status", label: "상태", before: "작성중", after: "승인됨" },
    ])
  })

  it("update: 문자열 배열은 JSON 아닌 목록으로 보여준다", () => {
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
    expect(rows).toEqual([
      {
        kind: "changed",
        field: "acceptanceCriteria",
        label: "완료 조건",
        before: "이메일 로그인",
        after: "이메일 로그인, 소셜 로그인",
      },
    ])
  })

  it("update: payload가 항목 전체 교체라 payload에 없는 필드는 removed로 드러낸다", () => {
    const op: ChangeOp = {
      ...baseOp,
      action: "update",
      targetId: "req-1",
      // role·acceptanceCriteria가 payload에 없음 — 적용되면 사라진다.
      payload: {
        id: "req-1",
        title: "로그인",
        description: "사용자는 로그인할 수 있다",
        status: "draft",
        priority: "high",
      },
    }
    const rows = diffOpPayload(op, designWithReq())
    expect(rows).toEqual([
      { kind: "removed", field: "role", label: "역할", before: "회원" },
      { kind: "removed", field: "acceptanceCriteria", label: "완료 조건", before: "이메일 로그인" },
    ])
  })

  it("id 배열 값은 이름으로 해석하고, dangling id는 raw 노출 대신 정직 폴백(개수 보존)", () => {
    const op: ChangeOp = {
      id: "op-1",
      collection: "features",
      action: "update",
      targetId: "feat-1",
      summary: "s",
      payload: {
        id: "feat-1",
        name: "결제",
        description: "카드로 결제한다",
        detailFeatures: [{ id: "df-1", title: "카드 등록", description: "" }],
        requirementIds: ["req-1", "ghost"],
        pageIds: ["page-1"],
        apiIds: [],
      },
    }
    const rows = diffOpPayload(op, designWithFeature())
    expect(rows).toEqual([
      {
        kind: "changed",
        field: "requirementIds",
        label: "연결된 요구사항",
        before: "로그인",
        after: "로그인, 이름 없는 요구사항",
      },
      { kind: "changed", field: "pageIds", label: "연결된 페이지", before: "없음", after: "홈" },
    ])
  })

  it("같은 계획의 add op가 만드는 항목은 payload에서 이름을 빌린다(전방 참조)", () => {
    const addOp: ChangeOp = {
      id: "op-add",
      collection: "requirements",
      action: "add",
      targetId: "req-2",
      summary: "s",
      payload: {
        id: "req-2",
        title: "결제 승인",
        description: "",
        status: "draft",
        priority: "medium",
        role: "회원",
        acceptanceCriteria: [],
      },
    }
    const updateOp: ChangeOp = {
      id: "op-upd",
      collection: "features",
      action: "update",
      targetId: "feat-1",
      summary: "s",
      payload: {
        id: "feat-1",
        name: "결제",
        description: "카드로 결제한다",
        detailFeatures: [{ id: "df-1", title: "카드 등록", description: "" }],
        requirementIds: ["req-1", "req-2"],
        pageIds: [],
        apiIds: [],
      },
    }
    const rows = diffOpPayload(updateOp, designWithFeature(), [addOp, updateOp])
    expect(rows).toEqual([
      {
        kind: "changed",
        field: "requirementIds",
        label: "연결된 요구사항",
        before: "로그인",
        after: "로그인, 결제 승인",
      },
    ])
  })

  it("API id 배열은 design에서 이름 해석이 불가능하므로 개수로 보여준다", () => {
    const op: ChangeOp = {
      id: "op-2",
      collection: "features",
      action: "update",
      targetId: "feat-1",
      summary: "s",
      payload: {
        id: "feat-1",
        name: "결제",
        description: "카드로 결제한다",
        detailFeatures: [{ id: "df-1", title: "카드 등록", description: "" }],
        requirementIds: ["req-1"],
        pageIds: [],
        apiIds: ["api-1", "api-2"],
      },
    }
    const rows = diffOpPayload(op, designWithFeature())
    expect(rows).toEqual([
      { kind: "changed", field: "apiIds", label: "연결된 API", before: "없음", after: "API 2개" },
    ])
  })

  it("기능의 DB 테이블 id 배열도 개수 라벨로 보여준다 (ASM-052 승격)", () => {
    const op: ChangeOp = {
      id: "op-3",
      collection: "features",
      action: "update",
      targetId: "feat-1",
      summary: "s",
      payload: {
        id: "feat-1",
        name: "결제",
        description: "카드로 결제한다",
        detailFeatures: [{ id: "df-1", title: "카드 등록", description: "" }],
        requirementIds: ["req-1"],
        pageIds: [],
        apiIds: [],
        dbTableIds: ["db-1", "db-2"],
      },
    }
    const rows = diffOpPayload(op, designWithFeature())
    expect(rows).toEqual([
      { kind: "changed", field: "dbTableIds", label: "연결된 DB 테이블", before: "없음", after: "DB 테이블 2개" },
    ])
  })

  it("맵에 없는 미지 필드는 raw 폴백으로 살린다(침묵 실종 금지)", () => {
    const op: ChangeOp = {
      ...baseOp,
      action: "add",
      targetId: "req-9",
      payload: { id: "req-9", unknownField: "값" },
    }
    const rows = diffOpPayload(op, designWithReq())
    expect(rows).toEqual([{ kind: "added", field: "unknownField", label: "unknownField", after: "값" }])
  })

  it("remove: 지워질 항목의 대표 필드(제목류)를 removed로", () => {
    const op: ChangeOp = { ...baseOp, action: "remove", targetId: "req-1", payload: null }
    const rows = diffOpPayload(op, designWithReq())
    expect(rows).toEqual([{ kind: "removed", field: "title", label: "제목", before: "로그인" }])
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
