// ASS-204 스트림 프롬프트 골든셋 게이트 — 스트리밍 경로(ASSEMBLER_STREAM_SYSTEM, NDJSON)로 생성하고
// 서버(route.ts)와 동일하게 레이어를 재조립한 뒤, 단발과 같은 채점기(eval-metrics)로 회귀를 판정한다.
// 목표는 단발 eval(eval-generate.ts)과 동일한 절대 바: mean≥0.92, min≥0.85, hardViolation 0.
//   npx tsx scripts/eval-stream-gate.ts [--k=1] [--ideas=todo,used]
// ⚠️ 실비: Opus 4.8 × 골든 N × K. 기본 4골든×1 = 4회 16k 생성.
import { readFileSync } from "node:fs"

// standalone — Next 자동 .env.local 로드 없음. 키만 수동 주입(미노출).
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^ANTHROPIC_API_KEY=(.*)$/)
  if (m) process.env.ANTHROPIC_API_KEY = m[1].trim()
}

import { streamAnthropic } from "@/lib/anthropic"
import { normalizeGraph } from "@/lib/graph/normalize"
import { ASSEMBLER_STREAM_SYSTEM, buildAssemblerUserMessage } from "@/lib/prompts/assembler"
import { isRawLayer, mergeRawLayer } from "@/lib/graph/stream-protocol"
import { GOLDEN_SET, type GoldenExample } from "@/lib/prompts/golden-set"
import { extractFixSignals, scoreGraph } from "./lib/eval-metrics"
import type { ProjectGraph } from "@/lib/types/assembler"

const TARGET_MEAN = 0.92
const TARGET_MIN = 0.85
const r3 = (x: number): number => Math.round(x * 1000) / 1000

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

// 스트리밍 생성 + route.ts와 동일 재조립(레이어 라인 → mergeRawLayer → 누적). 채점은 호출측.
async function generateStream(
  idea: string,
): Promise<{ graph: ProjectGraph; raw: Record<string, unknown>; layers: number; ms: number }> {
  const t0 = Date.now()
  let buffer = ""
  let cumulative: Record<string, unknown> = {}
  let layers = 0
  const consume = (raw: string) => {
    const line = raw.trim()
    if (!line) return
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      return
    }
    if (!isRawLayer(parsed)) return
    cumulative = mergeRawLayer(cumulative, parsed)
    layers += 1
  }
  await streamAnthropic(
    {
      model: "opus",
      system: ASSEMBLER_STREAM_SYSTEM,
      cacheSystem: true,
      thinking: "adaptive",
      maxTokens: 16000,
      timeoutMs: 240000,
      messages: [{ role: "user", content: buildAssemblerUserMessage(idea, { streaming: true }) }],
    },
    (delta) => {
      buffer += delta
      let nl: number
      while ((nl = buffer.indexOf("\n")) !== -1) {
        consume(buffer.slice(0, nl))
        buffer = buffer.slice(nl + 1)
      }
    },
  )
  consume(buffer)
  return { graph: normalizeGraph(cumulative), raw: cumulative, layers, ms: Date.now() - t0 }
}

async function main(): Promise<void> {
  const k = Number(arg("k") ?? 1)
  const filter = arg("ideas")?.split(",").map((s) => s.trim().toLowerCase())
  const set: GoldenExample[] = filter
    ? GOLDEN_SET.filter((ex) => filter.some((f) => ex.graph.id.toLowerCase().includes(f)))
    : GOLDEN_SET

  console.log(`스트림 골든셋 게이트 — ${set.length} golden × k=${k} (Opus NDJSON)\n`)
  const quals: number[] = []
  let anyHard = false
  let badLayers = 0

  for (const ex of set) {
    for (let i = 0; i < k; i++) {
      process.stdout.write(`  ${ex.graph.id} [${i + 1}/${k}] 생성 중…`)
      const { graph, raw, layers, ms } = await generateStream(ex.idea)
      const signals = extractFixSignals(raw, graph)
      const score = scoreGraph(graph, ex.graph, signals)
      quals.push(score.qualityScore)
      if (score.hardViolations.length) anyHard = true
      if (layers !== 5) badLayers += 1
      console.log(
        ` q=${r3(score.qualityScore)} (cov ${r3(score.coverage)}·health ${r3(score.normalizeHealth)}) layers=${layers} ${ms}ms${score.hardViolations.length ? ` ⚠ ${score.hardViolations.join(",")}` : ""}`,
      )
    }
  }

  const mean = quals.reduce((a, b) => a + b, 0) / quals.length
  const min = Math.min(...quals)
  const pass = mean >= TARGET_MEAN && min >= TARGET_MIN && !anyHard && badLayers === 0
  console.log(
    `\n결과: mean=${r3(mean)} (목표 ≥${TARGET_MEAN}) · min=${r3(min)} (목표 ≥${TARGET_MIN}) · hardViolation=${anyHard} · NDJSON 비정상레이어=${badLayers}`,
  )
  console.log(pass ? "✅ GATE PASS — 회귀 0, NDJSON 정상" : "❌ GATE FAIL — 검토 필요")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
