import type { WorkspaceDesign } from "@/lib/types/assembler"

// 경계 검증 — 신뢰할 수 없는 요청 body를 도메인 입력으로 좁힌다(any 금지, 런타임 가드).

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

export function parseCreateProduct(body: unknown): Parsed<{ name: string; description: string }> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  if (!isNonEmptyString(body.name)) return { ok: false, error: "invalid_name" }
  if (body.description !== undefined && typeof body.description !== "string") return { ok: false, error: "invalid_description" }
  return { ok: true, value: { name: body.name.trim(), description: typeof body.description === "string" ? body.description : "" } }
}

export function parseUpdateProduct(body: unknown): Parsed<{ name?: string; description?: string }> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  const patch: { name?: string; description?: string } = {}
  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name)) return { ok: false, error: "invalid_name" }
    patch.name = body.name.trim()
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string") return { ok: false, error: "invalid_description" }
    patch.description = body.description
  }
  if (patch.name === undefined && patch.description === undefined) return { ok: false, error: "empty_patch" }
  return { ok: true, value: patch }
}

export function parseCreateWorkspace(body: unknown): Parsed<{ productId: string; name: string }> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  if (!isNonEmptyString(body.productId)) return { ok: false, error: "invalid_product_id" }
  if (body.name !== undefined && typeof body.name !== "string") return { ok: false, error: "invalid_name" }
  const name = isNonEmptyString(body.name) ? body.name.trim() : "Main"
  return { ok: true, value: { productId: body.productId, name } }
}

const DESIGN_COLLECTIONS = ["requirements", "features", "pages", "flows", "wireframes", "elements"] as const

export function parseDesign(body: unknown): Parsed<WorkspaceDesign> {
  if (!isRecord(body)) return { ok: false, error: "invalid_body" }
  for (const key of DESIGN_COLLECTIONS) {
    if (!Array.isArray(body[key])) return { ok: false, error: "invalid_design_shape" }
  }
  for (const key of DESIGN_COLLECTIONS) {
    for (const item of body[key] as unknown[]) {
      if (!isRecord(item) || typeof item.id !== "string") return { ok: false, error: "invalid_design_item" }
    }
  }
  return { ok: true, value: body as unknown as WorkspaceDesign }
}
