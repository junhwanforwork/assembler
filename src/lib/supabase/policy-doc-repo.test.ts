import { describe, it, expect, vi } from "vitest"
import { createPolicyDoc, deletePolicyDoc, getPolicyDoc, listPolicyDocs, updatePolicyDoc } from "./policy-doc-repo"
import type { AssemblerClient } from "./assembler"
import type { AsmPolicyDocRow } from "./assembler-rows"

// ASM-068 — 정책 문서 repo. Row→도메인 매핑(snake→camel, api_ids→apiIds)과 not-found(null)·삭제 boolean 계약 고정.

const ROW: AsmPolicyDocRow = {
  id: "doc-1",
  product_id: "prod-1",
  title: "요금 정책",
  body: "# 요금\n무료 + 프로",
  api_ids: ["a1", "a2"],
  db_table_ids: ["t1"],
  created_at: "2026-07-09T00:00:00Z",
  updated_at: "2026-07-09T00:00:00Z",
}

const DOMAIN = {
  id: "doc-1",
  productId: "prod-1",
  title: "요금 정책",
  body: "# 요금\n무료 + 프로",
  apiIds: ["a1", "a2"],
  dbTableIds: ["t1"],
  createdAt: "2026-07-09T00:00:00Z",
  updatedAt: "2026-07-09T00:00:00Z",
}

describe("listPolicyDocs", () => {
  it("행들을 도메인으로 매핑해 돌려준다", async () => {
    const order = vi.fn(() => Promise.resolve({ data: [ROW], error: null }))
    const c = { from: () => ({ select: () => ({ eq: () => ({ order }) }) }) } as unknown as AssemblerClient
    expect(await listPolicyDocs(c, "prod-1")).toEqual([DOMAIN])
  })

  it("에러는 던진다", async () => {
    const c = {
      from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: { message: "boom" } }) }) }) }),
    } as unknown as AssemblerClient
    await expect(listPolicyDocs(c, "prod-1")).rejects.toMatchObject({ message: "boom" })
  })
})

describe("getPolicyDoc", () => {
  it("PGRST116(행 없음)은 null", async () => {
    const c = {
      from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: "PGRST116" } }) }) }) }),
    } as unknown as AssemblerClient
    expect(await getPolicyDoc(c, "doc-x")).toBeNull()
  })

  it("행이 있으면 도메인으로 매핑", async () => {
    const c = {
      from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: ROW, error: null }) }) }) }),
    } as unknown as AssemblerClient
    expect(await getPolicyDoc(c, "doc-1")).toEqual(DOMAIN)
  })
})

describe("createPolicyDoc", () => {
  it("insert 페이로드를 snake_case로 만들고 반환 행을 매핑한다", async () => {
    let payload: unknown
    const c = {
      from: () => ({
        insert: (p: unknown) => {
          payload = p
          return { select: () => ({ single: () => Promise.resolve({ data: ROW, error: null }) }) }
        },
      }),
    } as unknown as AssemblerClient
    const doc = await createPolicyDoc(c, { productId: "prod-1", title: "요금 정책", body: "b", apiIds: ["a1"], dbTableIds: [] })
    expect(payload).toEqual({ product_id: "prod-1", title: "요금 정책", body: "b", api_ids: ["a1"], db_table_ids: [] })
    expect(doc).toEqual(DOMAIN)
  })
})

describe("updatePolicyDoc", () => {
  it("patch를 snake_case로 바꾸고, 없는 필드는 안 보낸다", async () => {
    let payload: unknown
    const c = {
      from: () => ({
        update: (p: unknown) => {
          payload = p
          return { eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: ROW, error: null }) }) }) }
        },
      }),
    } as unknown as AssemblerClient
    await updatePolicyDoc(c, "doc-1", { title: "새 제목", apiIds: ["a9"] })
    expect(payload).toEqual({ title: "새 제목", api_ids: ["a9"] })
  })

  it("PGRST116은 null", async () => {
    const c = {
      from: () => ({
        update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { code: "PGRST116" } }) }) }) }),
      }),
    } as unknown as AssemblerClient
    expect(await updatePolicyDoc(c, "doc-x", { title: "x" })).toBeNull()
  })
})

describe("deletePolicyDoc", () => {
  it("삭제된 행이 있으면 true", async () => {
    const c = {
      from: () => ({ delete: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [{ id: "doc-1" }], error: null }) }) }) }),
    } as unknown as AssemblerClient
    expect(await deletePolicyDoc(c, "doc-1")).toBe(true)
  })

  it("삭제된 행이 없으면 false", async () => {
    const c = {
      from: () => ({ delete: () => ({ eq: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) }) }),
    } as unknown as AssemblerClient
    expect(await deletePolicyDoc(c, "doc-x")).toBe(false)
  })
})
