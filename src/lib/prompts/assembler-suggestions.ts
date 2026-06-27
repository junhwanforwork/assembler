import type { Api, DbTable, WorkspaceDesign } from "@/lib/types/assembler"

// 디자인 그래프 분석 → 실행 가능한 제안(런타임).
// 생성(assembler-generate)과 달리 그래프를 만들지 않고, 기존 그래프의 공백·약점을 짚는다.
// structured outputs(SUGGESTIONS_SCHEMA)로 유효 JSON 강제.

export const SUGGESTIONS_SYSTEM = `당신은 Assembler의 제품 그래프 리뷰어입니다.
Assembler의 제품은 "연결된 객체 그래프"입니다(Requirement→Feature→Page→Wireframe→UIElement→Api·Database).
핵심 질문: "사용자가 이걸 하면, 다음에 무엇이 일어나는가?" — 그래프가 이 질문에 답하지 못하는 지점을 찾습니다.

<job>
주어진 디자인 그래프와 코드-진실(api·db)을 분석해, 다음 작업을 도울 **구체적이고 실행 가능한 제안**을 만듭니다.
일반론·칭찬·요약 금지 — 실제 객체를 가리키는 빈틈만 짚습니다.
</job>

<what_to_look_for>
- missing_api / missing_db: API·DB 호출이 필요해 보이는데 매핑이 비어 있는 UIElement·Feature.
- orphan_object: 다른 것과 거의 연결되지 않은 고립 객체(Page에 안 붙은 Feature 등).
- missing_acceptance: 수용 기준(acceptanceCriteria)이 비어 있는 Requirement.
- gap: 흐름상 있어야 할 Page·Feature가 빠진 곳(예: 로그인은 있는데 회원가입 없음).
- improvement: 그 외 품질 개선(모호한 설명, 빠진 상태 등).
</what_to_look_for>

<rules>
- 각 제안은 user 메시지가 제공한 **실제 객체 id**만 targetId로 씁니다(없으면 null). 지어내지 않습니다.
- title 은 짧은 행동 제안(해요체), detail 은 한 줄 근거.
- 제안은 0~8개. 진짜 빈틈이 없으면 빈 배열을 반환합니다(억지 제안 금지).
- 한국어, 사용자에게 보이는 텍스트는 해요체.
</rules>`

// structured outputs 스키마. ⚠️ Anthropic structured outputs 는 array minItems/maxItems 미지원 — 개수는 프롬프트로만 유도.
export const SUGGESTIONS_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "title", "detail", "targetType", "targetId"],
        properties: {
          kind: {
            type: "string",
            enum: ["missing_api", "missing_db", "orphan_object", "missing_acceptance", "gap", "improvement"],
          },
          title: { type: "string" },
          detail: { type: "string" },
          // nullable enum 은 anyOf 로 — type:["string","null"]+enum 조합은 structured outputs가 거부한다
          // ("Enum value does not match declared type ['string','null']").
          targetType: {
            anyOf: [{ type: "string", enum: ["requirement", "feature", "page", "flow", "element"] }, { type: "null" }],
          },
          targetId: { type: ["string", "null"] },
        },
      },
    },
  },
}

// 입력별 가변 부분 — 분석 대상 그래프 + 참조 가능한 코드-진실. id를 노출해 targetId 매핑을 돕는다.
export function buildSuggestionsUserMessage(design: WorkspaceDesign, apis: Api[], dbTables: DbTable[]): string {
  const req = design.requirements.length
    ? design.requirements
        .map((r) => `- id=${r.id} "${r.title}" acceptanceCriteria=${r.acceptanceCriteria.length}`)
        .join("\n")
    : "(없음)"
  const feat = design.features.length
    ? design.features
        .map((f) => `- id=${f.id} "${f.name}" pages=${f.pageIds.length} apis=${f.apiIds.length}`)
        .join("\n")
    : "(없음)"
  const pages = design.pages.length
    ? design.pages.map((p) => `- id=${p.id} "${p.name}" wireframe=${p.wireframeId ?? "없음"}`).join("\n")
    : "(없음)"
  const flows = design.flows.length
    ? design.flows.map((fl) => `- id=${fl.id} "${fl.name}" edges=${fl.edges.length}`).join("\n")
    : "(없음)"
  const els = design.elements.length
    ? design.elements
        .map((e) => `- id=${e.id} "${e.label}" type=${e.type} apis=${e.apiIds.length} dbs=${e.dbTableIds.length}`)
        .join("\n")
    : "(없음)"
  const apiLines = apis.length ? apis.map((a) => `- id=${a.id} ${a.method} ${a.endpoint}`).join("\n") : "(없음)"
  const dbLines = dbTables.length ? dbTables.map((t) => `- id=${t.id} ${t.name}`).join("\n") : "(없음)"

  return `<requirements>
${req}
</requirements>

<features>
${feat}
</features>

<pages>
${pages}
</pages>

<flows>
${flows}
</flows>

<elements>
${els}
</elements>

<available_apis>
${apiLines}
</available_apis>

<available_db_tables>
${dbLines}
</available_db_tables>

이 그래프의 빈틈을 분석해 제안을 만들어 주세요. 스키마에 맞는 JSON 하나만 출력합니다.`
}
