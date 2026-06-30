import type { TableEvidence } from "@/lib/db-learning/evidence"

// DB Learning — 테이블 호버 AI 설명 생성(런타임).
// 기획자가 DB 스키마를 보고 배우는 기능. 가장 큰 위험은 "환각": 컬럼·연결에 없는 비즈니스 맥락을 지어내면
// 기획자가 틀린 걸 사실로 학습한다(설명 없느니만 못함). 그래서 근거(증거)에 묶고, 고립이면 보수적으로 강등한다.
// structured outputs(DB_LEARNING_SCHEMA)로 유효 JSON 강제.

export const DB_LEARNING_SYSTEM = `당신은 Assembler의 DB 테이블 해설자입니다.
기획자가 데이터베이스 테이블 구조를 보고 "이 테이블이 무엇을 담는 곳인지" 빠르게 이해하도록 한 문단으로 설명합니다.

<job>
주어진 테이블의 컬럼(사실)과 연결 증거(FK·이 테이블을 쓰는 화면 요소)만 근거로, 이 테이블의 역할을 설명합니다.
설명은 기획자가 읽고 바로 이해할 평이한 문장입니다.
</job>

<iron_law>
- 제공된 컬럼·연결 증거에 **없는** 비즈니스 개념·업무 맥락·테이블명을 지어내지 않습니다. 이것이 가장 중요한 규칙입니다.
- 연결 증거(fkOut·fkIn·usedBy)가 **하나라도 있으면** 그 연결을 근거로 역할을 설명하고 grounded=true.
- 연결 증거가 **전혀 없으면(고립)** 컬럼 사실만 보고 보수적으로 씁니다(예: "id·status·cost 같은 컬럼을 담는 것 같아요"). 업무 맥락 추측 금지, grounded=false.
- 설명에서 다른 테이블명을 언급하면 그 이름을 전부 mentionedTables 에 적습니다(제공된 테이블만). 언급이 없으면 빈 배열.
</iron_law>

<style>
- 2~3문장, 짧게. 한국어 해요체("~해요", "~담아요").
- 컬럼명·테이블명은 그대로(번역하지 않음).
- 칭찬·일반론·마케팅 표현 금지.
</style>`

// structured outputs 스키마. ⚠️ array minItems/maxItems 미지원 — 개수·내용은 프롬프트로만 유도.
export const DB_LEARNING_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["explanation", "grounded", "mentionedTables"],
  properties: {
    explanation: { type: "string" },
    grounded: { type: "boolean" },
    // 설명이 언급한 다른 테이블명. 살균(parse)에서 실재 테이블 집합과 대조해 환각을 잡는다.
    mentionedTables: { type: "array", items: { type: "string" } },
  },
}

// 입력별 가변 부분 — 대상 테이블 구조 + 연결 증거. 고립 여부를 명시해 보수/풍부를 가른다.
export function buildDbLearningUserMessage(evidence: TableEvidence): string {
  const { table, fkOut, fkIn, usedBy, isIsolated } = evidence

  const cols = table.columns.length
    ? table.columns
        .map((c) => `- ${c.name} (${c.type}${c.isPrimaryKey ? ", PK" : ""}${c.references ? `, FK→${c.references}` : ""})`)
        .join("\n")
    : "(컬럼 정보 없음)"

  const fkOutLines = fkOut.length ? fkOut.map((f) => `- ${f.column} → ${f.refTable}`).join("\n") : "(없음)"
  const fkInLines = fkIn.length ? fkIn.map((f) => `- ${f.fromTable}.${f.column} 이(가) 이 테이블을 참조`).join("\n") : "(없음)"
  const usedByLines = usedBy.length ? usedBy.map((u) => `- "${u.elementLabel}" (${u.action})`).join("\n") : "(없음)"

  const guidance = isIsolated
    ? "이 테이블은 다른 테이블·화면과 연결이 없습니다(고립). 컬럼 사실만 보고 보수적으로 설명하고, grounded=false 로 두세요."
    : "아래 연결 증거를 근거로 이 테이블의 역할을 설명하고, grounded=true 로 두세요."

  return `<table>
name: ${table.name}
${table.description ? `description(code): ${table.description}\n` : ""}columns:
${cols}
</table>

<fk_out>
${fkOutLines}
</fk_out>

<fk_in>
${fkInLines}
</fk_in>

<used_by>
${usedByLines}
</used_by>

${guidance}
스키마에 맞는 JSON 하나만 출력합니다.`
}
