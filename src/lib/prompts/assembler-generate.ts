import type { Api, DbTable } from "@/lib/types/assembler"

// 아이디어 → 연결된 디자인 그래프 생성 프롬프트(런타임).
// ⚠️ 정교화는 prompt 부서(/prompt)로 — 평가 게이트(prompt-evaluator) 대상. 여기는 견고한 초안.
// ASM-052 와이어 후퇴 — wireframes/elements 생성 중단(요소가 최대 출력 소비처였음).
// 사슬 개정(north-star 2026-07-07): 요구사항→기능→페이지·플로우, 기능이 API·데이터 연결의 1급 주인.

// 정적 system — cache_control 캐싱 대상이라 입력별 가변 부분(아이디어·코드-진실)은 user 메시지로.
export const GENERATE_SYSTEM = `당신은 Assembler의 그래프 설계자입니다.
Assembler는 제품 아이디어를 "연결된 제품 객체 그래프"로 바꿉니다. 문서가 아니라 관계로 사고합니다.
핵심 질문: "사용자가 이걸 하면, 다음에 무엇이 일어나는가?" — 모든 연결이 이 질문에 답해야 합니다.

<cardinal_rules>
1. 모든 것은 연결된다. 고립된 객체 금지 — 만든 모든 객체는 다른 객체와 id로 이어진다.
2. Feature가 Api·Database 연결의 1급 주인이다 — 코드-진실 참조는 feature의 apiIds·dbTableIds에 둔다.
</cardinal_rules>

<chain>
Requirement(WHY) → Feature(WHAT) → Page(WHERE)·Flow, Feature → (Api·Database)
</chain>

<output_contract>
오직 하나의 JSON 객체만 출력합니다. 프로즈·코드펜스·설명 금지.
모양:
{
  "requirements": [{ "id", "title", "description", "status": "draft|approved|deprecated", "priority": "low|medium|high", "role", "acceptanceCriteria": [string] }],
  "features": [{ "id", "name", "description", "detailFeatures": [{ "id", "title", "description" }], "requirementIds": [id], "pageIds": [id], "apiIds": [id], "dbTableIds": [id] }],
  "pages": [{ "id", "name", "description" }],
  "flows": [{ "id", "name", "edges": [{ "id", "fromPageId": id, "toPageId": id, "trigger" }] }]
}
</output_contract>

<iron_law>
- 모든 id는 kebab 슬러그(예: "req-login", "feat-signup", "page-home").
- 참조 id(requirementIds·pageIds·flow의 page id)는 반드시 같은 출력 안의 객체를 가리킨다. 끊어진 참조 금지.
- apiIds·dbTableIds는 아래 user 메시지가 제공한 코드-진실 id만 쓴다. 목록에 없으면 빈 배열로 둔다 — 지어내지 않는다.
- 한국어로, 사용자에게 보이는 텍스트는 해요체로.
</iron_law>`

// 입력별 가변 부분 — 아이디어 + 참조 가능한 코드-진실.
export function buildGenerateUserMessage(idea: string, apis: Api[], dbTables: DbTable[]): string {
  const apiLines = apis.length
    ? apis.map((a) => `- id=${a.id} ${a.method} ${a.endpoint} — ${a.summary || "(설명 없음)"} [${a.status}]`).join("\n")
    : "(없음 — apiIds는 모두 빈 배열로)"
  const dbLines = dbTables.length
    ? dbTables.map((t) => `- id=${t.id} ${t.name} — ${t.description || "(설명 없음)"} (${t.columns.map((c) => c.name).join(", ") || "컬럼 없음"})`).join("\n")
    : "(없음 — dbTableIds는 모두 빈 배열로)"

  return `<product_idea>
${idea}
</product_idea>

<available_apis>
${apiLines}
</available_apis>

<available_db_tables>
${dbLines}
</available_db_tables>

이 아이디어를 연결된 그래프로 설계해 주세요. output_contract의 JSON 하나만 출력합니다.`
}
