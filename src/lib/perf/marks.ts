// dev/flag 전용 perf 계측 래퍼. 플래그 off면 전부 no-op → 프로덕션 오버헤드 0.
// 활성 조건: URL `?perf=1` 또는 localStorage `assembler_perf=1`. Playwright perf 스펙이 `?perf=1`로 구동한다.
// 측정값은 Performance API(measure) + frame-monitor의 window.__perfResults__ 두 채널로 노출되고,
// perf 스펙이 page.evaluate로 읽어 트랜스크립트에 표로 찍는다(= /goal 평가 증거).

let cachedEnabled: boolean | null = null

function isEnabled(): boolean {
  if (cachedEnabled !== null) return cachedEnabled
  if (typeof window === "undefined") return false // SSR에선 캐시하지 않는다 — 클라 첫 호출에서 확정
  try {
    const q = new URLSearchParams(window.location.search)
    cachedEnabled = q.get("perf") === "1" || window.localStorage.getItem("assembler_perf") === "1"
  } catch {
    cachedEnabled = false
  }
  return cachedEnabled
}

export function perfEnabled(): boolean {
  return isEnabled()
}

export function perfMark(name: string): void {
  if (!isEnabled()) return
  try {
    performance.mark(name)
  } catch {}
}

// startMark→endMark(없으면 now) 구간 측정. 점 측정(Inspector 커밋·와이어프레임 mount)에 사용.
export function perfMeasure(name: string, startMark: string, endMark?: string): void {
  if (!isEnabled()) return
  try {
    performance.measure(name, startMark, endMark)
  } catch {}
}
