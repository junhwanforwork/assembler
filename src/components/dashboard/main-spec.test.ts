import { describe, it, expect } from "vitest"
import { createdMainSpecId } from "./main-spec"

// 연결 후 에디터 직행(ASM-066) — POST /api/workspaces {ifNone} 응답 판별.
// 픽스처는 생산자 실물에서 역추적: 생성이면 Workspace 객체 그대로
// (src/app/api/workspaces/route.ts:52 → toWorkspace, assembler-rows.ts:54-56),
// 기존 스펙이 있으면 { skipped: true }(route.ts:43).

describe("createdMainSpecId", () => {
  it("생성 응답(Workspace)이면 새 스펙 id를 돌려준다", () => {
    expect(createdMainSpecId({ id: "w-main", productId: "p1", name: "메인", isMain: false })).toBe("w-main")
  })

  it("skipped 응답이면 null — 대시보드 잔류(현행 유지)", () => {
    expect(createdMainSpecId({ skipped: true })).toBe(null)
  })

  it("id가 없는 비정상 응답은 null — 직행 대신 안전한 잔류", () => {
    expect(createdMainSpecId({})).toBe(null)
  })
})
