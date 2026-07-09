import type { ApiEvidence } from "@/lib/api-learning/evidence"

// API 해석(ASM-064) — 엔드포인트 AI 설명 생성(런타임). db-learning 프롬프트의 API판.
// 가장 큰 위험은 환각: 연결 증거에 없는 비즈니스 맥락을 지어내면 기획자가 틀린 걸 사실로 학습한다.
// 그래서 근거(이 API를 쓰는 기능·닿는 테이블)에 묶고, 고립이면 보수적으로 강등한다.
// structured outputs(API_LEARNING_SCHEMA)로 유효 JSON 강제.

export const API_LEARNING_SYSTEM = `당신은 Assembler의 API 해설자입니다.
기획자가 API 목록을 보고 "이 API가 무엇을 하는 곳인지" 빠르게 이해하도록 한 문단으로 설명합니다.

<job>
주어진 API 사실(method·endpoint·상태·출처)과 연결 증거(이 API를 쓰는 기능·그 기능들이 닿는 테이블)만 근거로, 이 API를 구조화해 설명합니다.
- explanation: 이 API가 무엇을 하는지 1~2문장 요약.
- pros: 이 연결 구조의 좋은 점(예: 어떤 기능이 쓰는지 명확함) 최대 3개. 각 항목 한 문장.
- cons: 주의할 점·한계(예: 연결된 기능이 없음, 실패 응답 정보 없음) 최대 3개. 각 항목 한 문장.
설명은 기획자가 읽고 바로 이해할 평이한 문장입니다.
</job>

<iron_law>
- 제공된 API 사실·연결 증거에 **없는** 비즈니스 개념·업무 맥락·기능명·테이블명을 지어내지 않습니다. 이것이 가장 중요한 규칙입니다. pros/cons 도 똑같이 적용됩니다.
- 연결 증거(used_by_features·related_tables)가 **하나라도 있으면** 그 연결을 근거로 역할을 설명하고 grounded=true.
- 연결 증거가 **전혀 없으면(고립)** method·endpoint 사실만 보고 보수적으로 씁니다(예: "GET /health 를 조회하는 API 같아요"). 업무 맥락 추측 금지, grounded=false, pros/cons 는 빈 배열.
- 근거가 부족하면 pros/cons 를 억지로 채우지 말고 빈 배열로 둡니다. 없는 장점을 지어내는 것보다 비우는 게 낫습니다.
- explanation·pros·cons 어디서든 기능명·테이블명을 언급하면 그 이름을 전부 mentionedNames 에 적습니다(제공된 이름만). 언급이 없으면 빈 배열.
</iron_law>

<style>
- 짧게. 한국어 해요체("~해요", "~만들어요").
- endpoint·기능명·테이블명은 그대로(번역하지 않음).
- 칭찬·일반론·마케팅 표현 금지 — pros 도 이 연결에서 실제로 확인되는 사실만.
</style>`

// structured outputs 스키마. ⚠️ array minItems/maxItems 미지원 — 개수·내용은 프롬프트로만 유도(파서가 3개 클램프).
export const API_LEARNING_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["explanation", "grounded", "mentionedNames", "pros", "cons"],
  properties: {
    explanation: { type: "string" },
    grounded: { type: "boolean" },
    // 좋은 점/주의할 점(≤3, 프롬프트 유도) — 근거 없으면 빈 배열(빈 섹션 미방출은 파서·UI 몫).
    pros: { type: "array", items: { type: "string" } },
    cons: { type: "array", items: { type: "string" } },
    // 설명 전체가 언급한 기능·테이블 이름. 살균(parse)에서 증거 집합과 대조해 환각을 잡는다.
    mentionedNames: { type: "array", items: { type: "string" } },
  },
}

// 입력별 가변 부분 — API 사실 + 연결 증거. 고립 여부를 명시해 보수/풍부를 가른다.
export function buildApiLearningUserMessage(evidence: ApiEvidence): string {
  const { api, usedByFeatures, relatedTables, isIsolated } = evidence

  const featureLines = usedByFeatures.length ? usedByFeatures.map((n) => `- ${n}`).join("\n") : "(없음)"
  const tableLines = relatedTables.length ? relatedTables.map((n) => `- ${n}`).join("\n") : "(없음)"

  const guidance = isIsolated
    ? "이 API는 어떤 기능과도 연결이 없습니다(고립). method·endpoint 사실만 보고 보수적으로 설명하고, grounded=false 로 두세요."
    : "아래 연결 증거를 근거로 이 API의 역할을 설명하고, grounded=true 로 두세요."

  return `<api>
method: ${api.method}
endpoint: ${api.endpoint}
status: ${api.status}
source: ${api.source}
${api.summary ? `summary(code): ${api.summary}\n` : ""}</api>

<used_by_features>
${featureLines}
</used_by_features>

<related_tables>
${tableLines}
</related_tables>

${guidance}
스키마에 맞는 JSON 하나만 출력합니다.`
}
