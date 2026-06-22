// 생성 품질 eval 하네스 (ASS-062) — npx tsx scripts/eval-generate.ts [--k=3] [--ideas=todo,gym] [--label=baseline]
// 북극성: 골든셋 대비 생성 품질 점수(scripts/lib/eval-metrics.ts). 프로덕션과 동일한 파이프라인으로 호출한다.
//
// ⚠️ 실비 경고: Opus 4.8 × 골든 N개 × K회 = 풀런 시 4×3=12회의 16k 토큰 생성. 루프(Plan #2)에서 반복 시 최대 ~72회.
//    저비용 반복은 `--k=1 --ideas=todo`(단건 스모크). 캐시 ON이나 Opus 4.8 최소 prefix 4096 토큰 — 현 system이 짧으면
//    cache_creation_input_tokens:0 (few-shot 주입 근거). 점수는 docs/specs/diagnosis/eval-generate/<ISO>.json 에 저장.
import { execSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"

// standalone 실행 — Next처럼 .env.local 자동 로드가 안 됨. 키만 수동 주입(미노출).
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^ANTHROPIC_API_KEY=(.*)$/)
  if (m) process.env.ANTHROPIC_API_KEY = m[1].trim()
}

import { callAnthropicWithRetry } from "@/lib/anthropic-retry"
import { extractJsonObject } from "@/lib/anthropic-json"
import { normalizeGraph } from "@/lib/graph/normalize"
import { ASSEMBLER_SYSTEM, buildAssemblerUserMessage } from "@/lib/prompts/assembler"
import { GOLDEN_SET } from "@/lib/prompts/golden-set"
import type { GoldenExample } from "@/lib/prompts/golden-set"
import { extractFixSignals, scoreGraph } from "./lib/eval-metrics"
import type { ScoreResult } from "./lib/eval-metrics"

const TARGET_MEAN = 0.92
const TARGET_MIN = 0.85

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit?.slice(name.length + 3)
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
}

const r3 = (x: number): number => Math.round(x * 1000) / 1000

type RunResult = { score: ScoreResult; usage: unknown; ms: number }
type IdeaReport = { idea: string; goldenId: string; medianQuality: number; anyHardViolation: boolean; runs: RunResult[] }

async function generate(idea: string): Promise<{ graph: ReturnType<typeof normalizeGraph>; raw: unknown; usage: unknown; ms: number }> {
  const t0 = Date.now()
  const { text, usage } = await callAnthropicWithRetry({
    model: "opus",
    system: ASSEMBLER_SYSTEM,
    cacheSystem: true,
    thinking: "adaptive",
    maxTokens: 16000,
    timeoutMs: 240000,
    messages: [{ role: "user", content: buildAssemblerUserMessage(idea) }],
  })
  const raw = JSON.parse(extractJsonObject(text))
  const graph = normalizeGraph(JSON.parse(JSON.stringify(raw)))
  return { graph, raw, usage, ms: Date.now() - t0 }
}

async function evalIdea(ex: GoldenExample, k: number): Promise<IdeaReport> {
  const runs: RunResult[] = []
  for (let i = 0; i < k; i++) {
    process.stdout.write(`  ${ex.graph.id} [${i + 1}/${k}] 생성 중…`)
    const { graph, raw, usage, ms } = await generate(ex.idea)
    const signals = extractFixSignals(raw, graph)
    const score = scoreGraph(graph, ex.graph, signals)
    runs.push({ score, usage, ms })
    console.log(` q=${r3(score.qualityScore)} (cov ${r3(score.coverage)} · health ${r3(score.normalizeHealth)})${score.hardViolations.length ? ` ⚠ ${score.hardViolations.join(", ")}` : ""}`)
  }
  return {
    idea: ex.idea,
    goldenId: ex.graph.id,
    medianQuality: median(runs.map((r) => r.score.qualityScore)),
    anyHardViolation: runs.some((r) => r.score.hardViolations.length > 0),
    runs,
  }
}

function gitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim()
  } catch {
    return "unknown"
  }
}

async function main(): Promise<void> {
  const k = Math.max(1, Number(arg("k") ?? "3"))
  const label = arg("label") ?? "baseline"
  const filter = arg("ideas")?.split(",").map((s) => s.trim()).filter(Boolean)
  const set = filter ? GOLDEN_SET.filter((ex) => filter.some((f) => ex.graph.id.includes(f))) : GOLDEN_SET

  if (set.length === 0) {
    console.log(`매칭되는 골든이 없어요. 사용 가능: ${GOLDEN_SET.map((ex) => ex.graph.id).join(", ")}`)
    process.exit(1)
  }

  console.log(`eval-generate — label="${label}" k=${k} ideas=${set.map((ex) => ex.graph.id).join(", ")}\n`)
  const perIdea: IdeaReport[] = []
  for (const ex of set) perIdea.push(await evalIdea(ex, k))

  const medians = perIdea.map((p) => p.medianQuality)
  const meanQuality = medians.reduce((s, x) => s + x, 0) / medians.length
  const minQuality = Math.min(...medians)
  const anyHardViolation = perIdea.some((p) => p.anyHardViolation)
  const targetMet = meanQuality >= TARGET_MEAN && minQuality >= TARGET_MIN && !anyHardViolation

  console.log("\n— 요약 —")
  for (const p of perIdea) console.log(`  ${p.goldenId.padEnd(16)} median q=${r3(p.medianQuality)}${p.anyHardViolation ? " ⚠ hard violation" : ""}`)
  console.log(`  mean=${r3(meanQuality)} (목표 ≥${TARGET_MEAN}) · min=${r3(minQuality)} (목표 ≥${TARGET_MIN}) · hardViolation=${anyHardViolation}`)
  console.log(`  targetMet=${targetMet}`)

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const dir = "docs/specs/diagnosis/eval-generate"
  mkdirSync(dir, { recursive: true })
  const path = `${dir}/${stamp}.json`
  const report = {
    label,
    gitSha: gitSha(),
    model: "opus",
    k,
    perIdea,
    aggregate: { meanQuality, minQuality, anyHardViolation },
    targetMet,
  }
  writeFileSync(path, JSON.stringify(report, null, 2))
  console.log(`\n리포트: ${path}`)
  process.exit(0)
}

main().catch((err: unknown) => {
  const name = err instanceof Error ? err.name : "Unknown"
  const msg = err instanceof Error ? err.message : String(err)
  console.log(`\n❌ eval 실패 [${name}]: ${msg.slice(0, 200)}`)
  process.exit(1)
})
