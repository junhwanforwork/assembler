import type { WorkspaceDesign } from "@/lib/types/assembler"
import type { AssistantBlock, ChangeOp, ChangeOpAction, ClarifyOption, DesignCollectionKey } from "@/lib/types/chat"
import { extractJsonObject } from "@/lib/anthropic-json"
import type { Parsed } from "@/lib/api/validate"

// AI 챗 출력 → 검증·살균된 AssistantBlock[] (suggestions/parse와 같은 규율).
// 계획 op는 현존 그래프와 대조해 무효한 것만 버리고, 유효 op가 하나도 안 남으면
// invalid_plan — 빈 계획을 도크에 띄우지 않는다.

const COLLECTIONS: ReadonlySet<string> = new Set(["requirements", "features", "pages", "flows", "wireframes", "elements"])
const ACTIONS: ReadonlySet<string> = new Set(["add", "update", "remove"])

// clarify 옵션 수 — ai-prompt-conversation.md §C: 2~4개.
const MIN_CLARIFY_OPTIONS = 2
const MAX_CLARIFY_OPTIONS = 4

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : ""
}

// 컬렉션별 현존 id 집합 — add(중복 금지)/update·remove(현존 필수) 정합 검사용.
function collectionIds(design: WorkspaceDesign): Record<DesignCollectionKey, Set<string>> {
  return {
    requirements: new Set(design.requirements.map((r) => r.id)),
    features: new Set(design.features.map((f) => f.id)),
    pages: new Set(design.pages.map((p) => p.id)),
    flows: new Set(design.flows.map((fl) => fl.id)),
    wireframes: new Set(design.wireframes.map((w) => w.id)),
    elements: new Set(design.elements.map((e) => e.id)),
  }
}

// payload 는 스키마 제약(이종 객체) 때문에 JSON 문자열로 온다 — 여기서 파싱·정합화.
function parsePayload(raw: unknown, targetId: string): Record<string, unknown> | null {
  if (typeof raw !== "string") return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  // 항목 id의 단일 출처는 targetId — 모델이 payload.id를 어긋나게 써도 여기서 맞춘다.
  return { ...parsed, id: targetId }
}

function sanitizeOps(rawOps: unknown[], design: WorkspaceDesign): ChangeOp[] {
  const ids = collectionIds(design)
  const out: ChangeOp[] = []

  rawOps.forEach((item) => {
    if (!isRecord(item)) return
    const collection = asString(item.collection)
    const action = asString(item.action)
    const targetId = asString(item.targetId).trim()
    const summary = asString(item.summary).trim()
    if (!COLLECTIONS.has(collection) || !ACTIONS.has(action) || targetId.length === 0 || summary.length === 0) return

    const key = collection as DesignCollectionKey
    const exists = ids[key].has(targetId)
    // add=새 id만, update/remove=현존 id만 — 어긋나면 그 op는 버린다.
    if (action === "add" ? exists : !exists) return

    let payload: Record<string, unknown> | null = null
    if (action !== "remove") {
      payload = parsePayload(item.payload, targetId)
      if (payload === null) return // add/update인데 payload가 없거나 깨짐 = 적용 불가.
    }

    out.push({ id: `op-${out.length}`, collection: key, action: action as ChangeOpAction, targetId, summary, payload })
  })

  return out
}

function sanitizeClarifyOptions(raw: unknown): ClarifyOption[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isRecord)
    .map((o) => asString(o.label).trim())
    .filter((label) => label.length > 0)
    .slice(0, MAX_CLARIFY_OPTIONS)
    .map((label, i) => ({ id: `opt-${i}`, label }))
}

export function parseChatOutput(text: string, design: WorkspaceDesign): Parsed<AssistantBlock[]> {
  let raw: unknown
  try {
    raw = JSON.parse(extractJsonObject(text))
  } catch {
    return { ok: false, error: "invalid_json" }
  }
  if (!isRecord(raw)) return { ok: false, error: "invalid_chat_output" }

  const mode = asString(raw.mode)
  const bodyText = asString(raw.text).trim()
  const textBlocks: AssistantBlock[] = bodyText.length > 0 ? [{ kind: "text", text: bodyText }] : []

  if (mode === "clarify" && isRecord(raw.clarify)) {
    const question = asString(raw.clarify.question).trim()
    const options = sanitizeClarifyOptions(raw.clarify.options)
    // 질문·옵션이 부실하면 텍스트로 폴백 — 둘 다 없으면 보여줄 게 없다.
    if (question.length > 0 && options.length >= MIN_CLARIFY_OPTIONS) {
      return { ok: true, value: [...textBlocks, { kind: "clarify", question, options }] }
    }
    return textBlocks.length > 0 ? { ok: true, value: textBlocks } : { ok: false, error: "invalid_chat_output" }
  }

  if (mode === "plan" && isRecord(raw.plan)) {
    const title = asString(raw.plan.title).trim()
    const summary = asString(raw.plan.summary).trim()
    const rawOps = Array.isArray(raw.plan.ops) ? raw.plan.ops : []
    const ops = sanitizeOps(rawOps, design)
    if (title.length === 0 || ops.length === 0) return { ok: false, error: "invalid_plan" }
    return { ok: true, value: [...textBlocks, { kind: "plan", plan: { title, summary, ops } }] }
  }

  // answer(기본) — 본문 없는 답변은 실패로 처리해 재시도를 유도한다.
  return textBlocks.length > 0 ? { ok: true, value: textBlocks } : { ok: false, error: "invalid_chat_output" }
}
