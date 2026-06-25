import { perfEnabled } from "./marks"

// RAF 기반 프레임 프로브 — 드래그·pan/zoom 같은 연속 인터랙션의 프레임 지연을 측정한다.
// startProbe~endProbe 구간의 프레임 델타를 모아 p95/longFrames(>16.7ms=60fps 미달)/worst로 요약,
// window.__perfResults__에 publish → Playwright perf 스펙이 읽는다. 플래그 off면 완전 no-op.

const FRAME_BUDGET_MS = 16.7 // 60fps 한 프레임 예산

export interface ProbeResult {
  label: string
  frames: number
  p95FrameMs: number
  longFrames: number
  worstMs: number
}

// 프로브 결과를 읽을 단일 출처 — Playwright perf 스펙이 page.evaluate로 window.__perfResults__를 읽는다.
declare global {
  interface Window {
    __perfResults__?: ProbeResult[]
  }
}

interface ProbeState {
  raf: number
  last: number
  deltas: number[]
}

const probes = new Map<string, ProbeState>()

export function startProbe(label: string): void {
  if (!perfEnabled() || typeof window === "undefined") return
  if (probes.has(label)) return // 중복 시작 무시(드래그 재진입 방어)
  const state: ProbeState = { raf: 0, last: performance.now(), deltas: [] }
  const tick = (t: number) => {
    state.deltas.push(t - state.last)
    state.last = t
    state.raf = requestAnimationFrame(tick)
  }
  state.raf = requestAnimationFrame(tick)
  probes.set(label, state)
}

export function endProbe(label: string): ProbeResult | null {
  const state = probes.get(label)
  if (!state) return null
  cancelAnimationFrame(state.raf)
  probes.delete(label)
  // 첫 델타(프로브 시작~첫 raf)는 인터랙션과 무관한 노이즈 → 제외.
  const result = summarize(label, state.deltas.slice(1))
  publish(result)
  return result
}

function summarize(label: string, deltas: number[]): ProbeResult {
  if (deltas.length === 0) return { label, frames: 0, p95FrameMs: 0, longFrames: 0, worstMs: 0 }
  const sorted = [...deltas].sort((a, b) => a - b)
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
  return {
    label,
    frames: deltas.length,
    p95FrameMs: round(p95),
    longFrames: deltas.filter((d) => d > FRAME_BUDGET_MS).length,
    worstMs: round(sorted[sorted.length - 1]),
  }
}

function publish(result: ProbeResult): void {
  ;(window.__perfResults__ ??= []).push(result)
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
