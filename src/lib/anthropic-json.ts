// LLM 응답 텍스트에서 JSON 객체 본문 추출.
// ProjectGraph 스키마는 structured outputs 문법 한도를 초과 → 프롬프트 유도 JSON 사용.
// 모델이 드물게 ```json 펜스나 프로즈를 덧붙일 수 있어 방어적으로 첫 { ~ 마지막 } 를 발라낸다.
export function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf("{")
  const end = body.lastIndexOf("}")
  return start >= 0 && end > start ? body.slice(start, end + 1) : body.trim()
}
