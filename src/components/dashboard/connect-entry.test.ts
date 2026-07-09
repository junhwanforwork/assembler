import { describe, it, expect } from "vitest"
import { connectEntryMode } from "./connect-entry"
import type { Product } from "@/lib/api/client"

// 코드 연결 진입 분기(ASM-066 추가지시) — "선택 여부"만 보던 이전 분기가
// 프로젝트 2개+ '전체' 탭(미선택)에서 기존 프로젝트를 고를 기회 없이 새 프로젝트
// 생성으로 직행하던 문제를 막는다. 분기는 선택/존재/없음 3갈래여야 한다.

const P = (id: string): Product => ({ id, name: id, description: "" })

describe("connectEntryMode", () => {
  it("선택된 프로젝트가 있으면 target — 바로 연결", () => {
    expect(connectEntryMode(P("p1"), [P("p1"), P("p2")])).toBe("target")
  })

  it("프로젝트가 있는데 미선택이면 pick — 기존 프로젝트 선택 기회", () => {
    expect(connectEntryMode(null, [P("p1"), P("p2")])).toBe("pick")
  })

  it("프로젝트가 하나도 없으면 create — 새로 만든다", () => {
    expect(connectEntryMode(null, [])).toBe("create")
  })

  it("프로젝트 1개인데 미선택(자동선택 전 찰나)이어도 pick — 임의 생성 금지", () => {
    expect(connectEntryMode(null, [P("p1")])).toBe("pick")
  })
})
