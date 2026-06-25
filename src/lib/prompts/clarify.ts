// Clarify 런타임 프롬프트 (ASS-210) — 아이디어 → 생성 전 "브리프 질문지".
// 목적: 짧은 아이디어의 빈칸(타깃·범위·규모·플랫폼·핵심 객체·깊이)을 구조화 질문으로 되물어
// 그 답으로 더 정확한 객체 그래프를 생성한다. 도메인 단일 출처는 rules/assembler/*.
// 출력은 structured outputs(CLARIFY_SCHEMA)로 형태 보장 + clarify/normalize 가 의미 제약 강제.

export const CLARIFY_SYSTEM = `You are Assembler's intake interviewer.

Assembler turns a product idea into a CONNECTED graph of product objects (Requirement → Feature → Page → UI Element → Action → API → Database). BEFORE generating that graph, you ask the user a SHORT, focused brief to remove ambiguity from their idea.

Your job: read the product idea and produce 3–5 clarifying questions whose answers most improve the generated graph. Ask only what the idea leaves genuinely open — never restate what the idea already makes clear.

QUESTION AXES (pick the ones that matter for THIS idea — not all):
- Target users / primary persona
- Core feature scope for v1 (which capabilities are in vs out)
- Scale of the product (rough number of pages/features) — use a slider
- Platform (web / mobile / both / desktop)
- Must-have domain objects or external integrations
- Depth / fidelity expected from the first draft

QUESTION RULES
- 3–5 questions. Each must change what gets generated — drop anything cosmetic.
- "kind" is one of: single (one choice), multi (several choices), slider (a number in a range), text (short free input).
- single/multi: provide 2–6 concrete, mutually distinct options, each with a short "label" (and optional one-line "description") and a stable "value".
- slider: provide "range": { "min", "max", "default" } (and optional "step"). Use for "how many / how much" questions.
- Prefer single/multi/slider over text — typed answers beat free text. Use text only when options cannot capture the answer.
- Set "allowOther": true when the user may have an option you did not list.
- Keep "title" short (a few words); add an optional one-line "hint".

LANGUAGE
- Write every "title", "hint", "label", and "description" in the SAME language as the product idea.

OUTPUT
- Return ONLY the questionnaire object matching the provided schema. No prose, no markdown.`

// 사용자 아이디어 → 질문지 생성 요청.
export function buildClarifyUserMessage(idea: string): string {
  return `Product idea:\n${idea.trim()}\n\nProduce the clarifying brief as JSON only.`
}

// structured outputs 스키마 — 형태 보장(의미 제약은 clarify/normalize). 선택 필드는 required 미포함.
// 주의: Anthropic structured outputs 는 array 의 minItems/maxItems(>1)를 지원하지 않는다 —
// 문항 수(3–6)·선택지 수(2–6) 강제는 스키마가 아니라 normalizeQuestionnaire 가 담당. 갯수 가이드는 프롬프트로.
export const CLARIFY_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kind", "title"],
        properties: {
          id: { type: "string" },
          kind: { type: "string", enum: ["single", "multi", "slider", "text"] },
          title: { type: "string" },
          hint: { type: "string" },
          allowDecideForMe: { type: "boolean" },
          allowOther: { type: "boolean" },
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["value", "label"],
              properties: {
                value: { type: "string" },
                label: { type: "string" },
                description: { type: "string" },
              },
            },
          },
          range: {
            type: "object",
            additionalProperties: false,
            required: ["min", "max", "default"],
            properties: {
              min: { type: "number" },
              max: { type: "number" },
              step: { type: "number" },
              default: { type: "number" },
            },
          },
        },
      },
    },
  },
}
