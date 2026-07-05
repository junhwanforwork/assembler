// 실 DB e2e 시드 (ASM-037) — 가상 제품 1개에 assembler 자기 스펙을 심는다.
// 경로는 API 라우트 경유(anon + x-session-id) — RLS·검증 경계를 그대로 관통한다. service_role 금지.
//
// 정본: docs/specs/diagnosis/m1-seed-design.json (그래프) + scripts/fixtures/seed-code-truth.json
// (싱크-인 API 25·DB 7 — ASM-032 시드 실측). design의 apiIds/dbTableIds는 원 시드 DB의 행 UUID라
// 새로 싱크하면 id가 달라진다 → (method, endpoint)/(name) 정체성으로 구→신 id 리매핑 후 PUT.
//
// 멱등성: 같은 이름의 시드 제품을 먼저 지우고 다시 심는다(중복 누적 0). 삭제는 제품 카스케이드.
// 사용: npm run seed:e2e [-- --cleanup]  (dev 서버 필요, SEED_BASE_URL·E2E_PORT·E2E_SEED_SESSION_ID로 조정)

import { readFileSync } from "node:fs"
import { join } from "node:path"

export const SEED_PRODUCT_NAME = "Assembler 여정 (e2e)"

// 세션 id는 env 주입이 원칙. 기본값은 e2e/helpers.ts seedSession과 동일한 합성 픽스처 UUID —
// 브라우저 localStorage와 DB 소유가 일치해야 여정 스펙이 자기 시드를 본다. (실사용 세션 id 커밋 금지.)
export function resolveSeedSessionId(): string {
  return process.env.E2E_SEED_SESSION_ID ?? "e2e00000-0000-4000-8000-000000000000"
}

export type SeedOptions = {
  baseUrl?: string
  sessionId?: string
}

export type SeedResult = {
  productId: string
  workspaceId: string
  apiCount: number
  dbTableCount: number
}

type FixtureApi = { id: string; method: string; endpoint: string; summary: string; status: string; source: string }
type FixtureTable = { id: string; name: string; description: string; columns: unknown[]; source: string }
type CodeTruthFixture = { apis: FixtureApi[]; dbTables: FixtureTable[] }

type SeedGraphObject = { apiIds?: string[]; dbTableIds?: string[] } & Record<string, unknown>
type SeedDesign = Record<string, SeedGraphObject[]>

// playwright(트랜스파일이 import.meta 미지원)와 npm script 둘 다 레포 루트에서 실행된다 — cwd 기준.
const ROOT = process.cwd()

function resolveBaseUrl(opts: SeedOptions): string {
  return opts.baseUrl ?? process.env.SEED_BASE_URL ?? `http://localhost:${process.env.E2E_PORT ?? 3000}`
}

function loadFixtures(): { design: SeedDesign; codeTruth: CodeTruthFixture } {
  const design = JSON.parse(readFileSync(join(ROOT, "docs/specs/diagnosis/m1-seed-design.json"), "utf8")) as SeedDesign
  const codeTruth = JSON.parse(
    readFileSync(join(ROOT, "scripts/fixtures/seed-code-truth.json"), "utf8")
  ) as CodeTruthFixture
  return { design, codeTruth }
}

async function request<T>(
  baseUrl: string,
  sessionId: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-session-id": sessionId },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  return (await res.json()) as T
}

// 구(픽스처) id → 신(방금 싱크된 행) id. 정체성 키 = API (method endpoint) / 테이블 name.
function buildIdRemap(
  fixture: CodeTruthFixture,
  synced: { apis: { id: string; method: string; endpoint: string }[]; dbTables: { id: string; name: string }[] }
): Map<string, string> {
  const remap = new Map<string, string>()
  const apiByKey = new Map(synced.apis.map((a) => [`${a.method} ${a.endpoint}`, a.id]))
  for (const a of fixture.apis) {
    const next = apiByKey.get(`${a.method} ${a.endpoint}`)
    if (!next) throw new Error(`리매핑 실패 — 싱크 응답에 없는 API: ${a.method} ${a.endpoint}`)
    remap.set(a.id, next)
  }
  const tableByName = new Map(synced.dbTables.map((t) => [t.name, t.id]))
  for (const t of fixture.dbTables) {
    const next = tableByName.get(t.name)
    if (!next) throw new Error(`리매핑 실패 — 싱크 응답에 없는 테이블: ${t.name}`)
    remap.set(t.id, next)
  }
  return remap
}

function remapDesignRefs(design: SeedDesign, remap: Map<string, string>): SeedDesign {
  const out = structuredClone(design)
  for (const collection of Object.values(out)) {
    if (!Array.isArray(collection)) continue
    for (const obj of collection) {
      if (Array.isArray(obj.apiIds)) obj.apiIds = obj.apiIds.map((id) => remap.get(id) ?? id)
      if (Array.isArray(obj.dbTableIds)) obj.dbTableIds = obj.dbTableIds.map((id) => remap.get(id) ?? id)
    }
  }
  return out
}

// 같은 이름의 시드 제품 전부 삭제(멱등 재시드·뒷정리 공용). 지운 개수를 돌려준다.
export async function cleanupSeed(opts: SeedOptions = {}): Promise<number> {
  const baseUrl = resolveBaseUrl(opts)
  const sessionId = opts.sessionId ?? resolveSeedSessionId()
  const { products } = await request<{ products: { id: string; name: string }[] }>(
    baseUrl,
    sessionId,
    "GET",
    "/api/products"
  )
  const targets = products.filter((p) => p.name === SEED_PRODUCT_NAME)
  for (const p of targets) {
    await request(baseUrl, sessionId, "DELETE", `/api/products/${p.id}`)
  }
  return targets.length
}

export async function seedE2E(opts: SeedOptions = {}): Promise<SeedResult> {
  const baseUrl = resolveBaseUrl(opts)
  const sessionId = opts.sessionId ?? resolveSeedSessionId()
  const { design, codeTruth } = loadFixtures()

  await cleanupSeed({ baseUrl, sessionId })

  const product = await request<{ id: string }>(baseUrl, sessionId, "POST", "/api/products", {
    name: SEED_PRODUCT_NAME,
    description: "실 DB 여정 e2e 시드 — assembler 자기 스펙 (ASM-037)",
  })

  const workspace = await request<{ id: string }>(baseUrl, sessionId, "POST", "/api/workspaces", {
    productId: product.id,
    name: "메인",
  })

  // 싱크-인이 design PUT보다 먼저 — dangling 가드(codeTruth 대조)가 실 id를 요구한다.
  const { apis } = await request<{ apis: { id: string; method: string; endpoint: string }[] }>(
    baseUrl,
    sessionId,
    "POST",
    `/api/products/${product.id}/apis`,
    // 픽스처의 id(원 시드 행)는 보내지 않는다 — 서버가 새 행 id를 채번하고, 매핑은 정체성 키로 잇는다.
    { apis: codeTruth.apis.map((a) => ({ method: a.method, endpoint: a.endpoint, summary: a.summary, status: a.status, source: a.source })) }
  )
  const { dbTables } = await request<{ dbTables: { id: string; name: string }[] }>(
    baseUrl,
    sessionId,
    "POST",
    `/api/products/${product.id}/db-tables`,
    { tables: codeTruth.dbTables.map((t) => ({ name: t.name, description: t.description, columns: t.columns, source: t.source })) }
  )

  const remapped = remapDesignRefs(design, buildIdRemap(codeTruth, { apis, dbTables }))
  await request(baseUrl, sessionId, "PUT", `/api/workspaces/${workspace.id}/design`, remapped)

  return { productId: product.id, workspaceId: workspace.id, apiCount: apis.length, dbTableCount: dbTables.length }
}

// CLI: node scripts/seed-e2e.ts [--cleanup]
const isCli = process.argv[1] !== undefined && process.argv[1].endsWith("seed-e2e.ts")
if (isCli) {
  const cleanupOnly = process.argv.includes("--cleanup")
  const run = cleanupOnly
    ? cleanupSeed().then((n) => console.log(`cleanup — 시드 제품 ${n}개 삭제`))
    : seedE2E().then((r) =>
        console.log(
          `seeded — product ${r.productId} / workspace ${r.workspaceId} (API ${r.apiCount} · DB ${r.dbTableCount})`
        )
      )
  run.catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
