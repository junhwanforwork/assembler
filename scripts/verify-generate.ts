// 일회성 라이브 검증 (ASS-021) — npx tsx scripts/verify-generate.ts
// 실제 ANTHROPIC_API_KEY 로 opus 4-8 structured outputs 호출 → 정규화까지 end-to-end. 키 값은 출력 안 함.
import { readFileSync } from "node:fs"

// standalone 실행이라 Next 처럼 .env.local 자동 로드가 안 됨 — 키만 수동 주입(미노출).
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^ANTHROPIC_API_KEY=(.*)$/)
  if (m) process.env.ANTHROPIC_API_KEY = m[1].trim()
}

import { callAnthropicWithRetry } from "@/lib/anthropic-retry"
import { extractJsonObject } from "@/lib/anthropic-json"
import { normalizeGraph } from "@/lib/graph/normalize"
import { ASSEMBLER_SYSTEM, buildAssemblerUserMessage } from "@/lib/prompts/assembler"

async function main(): Promise<void> {
  const idea = "간단한 할 일 목록 앱"
  console.log(`아이디어: "${idea}"\n호출 중… (opus 4-8 structured outputs)\n`)

  const t0 = Date.now()
  const { text, usage } = await callAnthropicWithRetry({
    model: "opus",
    system: ASSEMBLER_SYSTEM,
    cacheSystem: true,
    thinking: "adaptive",
    maxTokens: 16000,
    messages: [{ role: "user", content: buildAssemblerUserMessage(idea) }],
  })
  const ms = Date.now() - t0

  const graph = normalizeGraph(JSON.parse(extractJsonObject(text)))

  console.log(`✅ 응답 ${ms}ms`)
  console.log("usage:", JSON.stringify(usage))
  console.log("\n그래프 요약:")
  console.log(`  name: ${graph.name}`)
  console.log(`  requirements: ${graph.requirements.length}`)
  console.log(`  features:     ${graph.features.length}`)
  console.log(`  pages:        ${graph.pages.length} — ${graph.pages.map((p) => p.name).join(", ")}`)
  console.log(`  uiElements:   ${graph.uiElements.length}`)
  console.log(`  apis:         ${graph.apis.length} — ${graph.apis.map((a) => `${a.method} ${a.path}`).join(", ")}`)
  console.log(`  databases:    ${graph.databases.length} — ${graph.databases.map((d) => d.name).join(", ")}`)
  console.log(`  userFlow edges: ${graph.userFlow.edges.length}`)

  // dangling 0 확인 (정규화 후) — 모든 페이지 wireframeId 존재 + 모든 edge 양끝 존재.
  const pageIds = new Set(graph.pages.map((p) => p.id))
  const wfIds = new Set(graph.wireframes.map((w) => w.id))
  const danglingWf = graph.pages.filter((p) => !wfIds.has(p.wireframeId)).length
  const danglingEdge = graph.userFlow.edges.filter((e) => !pageIds.has(e.fromPageId) || !pageIds.has(e.toPageId)).length
  const reviewMarks = JSON.stringify(graph).split("확인 필요").length - 1
  console.log(`\n무결성: dangling wireframe ${danglingWf} · dangling edge ${danglingEdge} · "확인 필요" 마커 ${reviewMarks}개`)

  const ok = graph.pages.length >= 1 && graph.uiElements.length >= 1 && danglingWf === 0 && danglingEdge === 0
  console.log(ok ? "\nPASS — 키 동작 + 그래프 생성 + 무결성 OK" : "\nFAIL — 위 항목 확인")
  process.exit(ok ? 0 : 1)
}

main().catch((err: unknown) => {
  const name = err instanceof Error ? err.name : "Unknown"
  const msg = err instanceof Error ? err.message : String(err)
  console.log(`\n❌ 호출 실패 [${name}]: ${msg.slice(0, 200)}`)
  process.exit(1)
})
